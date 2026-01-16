module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.*'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/display-name': 'off',

    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for now
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'warn',
  },
  overrides: [
    {
      // Test files can use any
      files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // Server files - allow console.log for now
      files: ['server/**/*'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
