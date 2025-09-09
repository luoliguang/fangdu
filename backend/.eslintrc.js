module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    commonjs: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 基础规则
    'no-console': 'off', // 后端允许使用console
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    
    // 代码风格
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    
    // 最佳实践
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-void': 'error',
    'radix': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',
    
    // Node.js特定规则
    'no-process-exit': 'error',
    'no-path-concat': 'error',
    'handle-callback-err': 'error',
    'no-new-require': 'error',
    'no-sync': 'warn',
    
    // 变量声明
    'no-delete-var': 'error',
    'no-label-var': 'error',
    'no-shadow': 'error',
    'no-shadow-restricted-names': 'error',
    'no-undef': 'error',
    'no-undef-init': 'error',
    'no-use-before-define': ['error', { 'functions': false }],
    
    // 安全相关
    'no-buffer-constructor': 'error',
    'no-mixed-requires': 'error',
    
    // 异步处理
    'require-await': 'error',
    'no-return-await': 'error',
    'prefer-promise-reject-errors': 'error'
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.{test,spec}.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off',
        'no-sync': 'off'
      }
    },
    {
      files: ['scripts/**/*', 'config/**/*'],
      rules: {
        'no-process-exit': 'off',
        'no-sync': 'off'
      }
    }
  ]
}