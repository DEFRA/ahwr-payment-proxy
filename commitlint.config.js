export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'ticket-ref-required': [1, 'always']
  },
  plugins: [
    {
      rules: {
        'ticket-ref-required': ({ scope, subject }) => {
          const ticketPattern = /[A-Z]-\d+/
          const valid = ticketPattern.test(scope) || ticketPattern.test(subject)
          return [valid, 'Commit should include a ticket ref eg AHWR-123']
        }
      }
    }
  ]
}
