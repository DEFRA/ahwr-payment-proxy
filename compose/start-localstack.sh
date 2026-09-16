#!/bin/bash
export AWS_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

function create_topic() {
  local topic_name=$1
  local topic_arn=$(awslocal sns create-topic --name $topic_name --query "TopicArn" --output text)
  echo $topic_arn
}

function create_queue() {
  local queue_name=$1

  # Create the DLQ
  local dlq_url=$(
    awslocal sqs create-queue \
    --queue-name "$queue_name-deadletter" \
    --query "QueueUrl" --output text
  )

  local dlq_arn=$(
    awslocal sqs get-queue-attributes \
      --queue-url $dlq_url \
      --attribute-name "QueueArn" \
      --query "Attributes.QueueArn" \
      --output text
  )

  # Create the queue with DLQ attached
  local queue_url=$(
    awslocal sqs create-queue \
      --queue-name $queue_name \
      --attributes '{ "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$dlq_arn'\",\"maxReceiveCount\":\"1\"}" }' \
      --query "QueueUrl" \
      --output text
  )

  local queue_arn=$(
    awslocal sqs get-queue-attributes \
      --queue-url $queue_url \
      --attribute-name "QueueArn" \
      --query "Attributes.QueueArn" \
      --output text
  )

  echo $queue_arn
}

function subscribe_queue_to_topic() {
  local topic_arn=$1
  local queue_arn=$2

  awslocal sns subscribe --topic-arn $topic_arn --protocol sqs --notification-endpoint $queue_arn --attributes '{ "RawMessageDelivery": "true" }'
}

function create_topic_and_queue() {
  local topic_name=$1
  local queue_name=$2

  local topic_arn=$(create_topic $topic_name)
  local queue_arn=$(create_queue $queue_name)

  subscribe_queue_to_topic $topic_arn $queue_arn
}

# Puts each message body directly onto a queue (by name), tagged with an eventType
# attribute so it looks like a real message. Used to seed test data.
function seed_messages() {
  local queue_name=$1
  local event_type=$2
  shift 2

  local queue_url=$(
    awslocal sqs get-queue-url --queue-name "$queue_name" --query "QueueUrl" --output text
  )

  for body in "$@"; do
    awslocal sqs send-message \
      --queue-url "$queue_url" \
      --message-body "$body" \
      --message-attributes '{"eventType":{"DataType":"String","StringValue":"'"$event_type"'"}}'
  done
}

create_topic_and_queue "ahwr_payment_request" "ahwr_payment_request_queue" &
create_topic_and_queue "ahwr_payment_update" "ahwr_application_backend_queue" &

wait

echo "SNS/SQS/S3 ready"

# Send payment request
awslocal sns publish --topic-arn arn:aws:sns:eu-west-2:000000000000:ahwr_payment_request --message '{ "reference": "IAHW-G3CL-V59P", "sbi": "123456789", "isEndemics": false, "reviewTestResults": "positive", "whichReview": "beef", "frn": "987654321", "claimType": "REVIEW", "dateOfVisit": "2025-04-24T00:00:00.000Z" }' --message-attributes '{"eventType":{"DataType":"String","StringValue":"uk.gov.ffc.ahwr.submit.payment.request"}}'

# Seed messages for testing (like the backoffice support page):
#  - a couple on a normal queue (shows the plain "queue messages" view)
#  - a couple on its dead-letter queue (shows the per-message delete / reapply actions)
# payment proxy doesn't run locally so the messages on the normal queue stay there.
seed_messages "ahwr_payment_request_queue" "uk.gov.ffc.ahwr.submit.payment.request" \
  '{ "reference": "IAHW-Q001-0001", "sbi": "123456789", "frn": "987654321", "claimType": "REVIEW", "whichReview": "beef", "dateOfVisit": "2025-04-24T00:00:00.000Z" }' \
  '{ "reference": "IAHW-Q001-0002", "sbi": "223456789", "frn": "887654321", "claimType": "ENDEMICS", "whichReview": "sheep", "dateOfVisit": "2025-05-01T00:00:00.000Z" }'

seed_messages "ahwr_payment_request_queue-deadletter" "uk.gov.ffc.ahwr.submit.payment.request" \
  '{ "reference": "IAHW-DLQ1-0001", "sbi": "123456789", "frn": "987654321", "claimType": "REVIEW", "whichReview": "beef", "dateOfVisit": "2025-04-24T00:00:00.000Z" }' \
  '{ "reference": "IAHW-DLQ1-0002", "sbi": "223456789", "frn": "887654321", "claimType": "ENDEMICS", "whichReview": "sheep", "dateOfVisit": "2025-05-01T00:00:00.000Z" }'
