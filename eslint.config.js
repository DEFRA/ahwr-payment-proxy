import neostandard from 'neostandard'
import noCommentedCode from 'eslint-plugin-no-commented-code'

export default [
  ...neostandard({
    env: ['node', 'jest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true,
    noStyle: true
  }),
  {
    plugins: {
      'no-commented-code': noCommentedCode
    },
    rules: {
      'no-commented-code/no-commented-code': 'error'
    }
  }
]
