// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import {defineConfig} from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import vitest from '@vitest/eslint-plugin';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default defineConfig(
  {
    ignores: ['dist/', 'pkg/'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.[jt]s'],
    languageOptions: {ecmaVersion: 2022},
    rules: {
      'no-undef': 'error',
      'no-var': 'error',
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
  jsdoc.configs['flat/recommended-typescript'],
  {
    files: ['**/*.ts'],
    plugins: {jsdoc},
    settings: {
      jsdoc: {mode: 'typescript'},
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          checkConstructors: false,
          contexts: ['MethodDefinition', 'FunctionDeclaration'],
        },
      ],
      'jsdoc/check-syntax': 'error',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/check-types': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-param-type': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ...noUnsanitized.configs.recommended,
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {chrome: 'readonly'},
    },
  },
  {
    files: ['src/*.ts'],
    ignores: ['src/sw.ts'],
    languageOptions: {
      globals: {...globals.browser},
    },
  },
  {
    files: ['src/sw.ts', 'src/lib/*.ts'],
    languageOptions: {
      globals: {...globals.serviceworker},
    },
  },
  {
    files: ['build/**/*.ts'],
    languageOptions: {
      globals: {...globals.node},
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...vitest.configs.recommended,
    rules: {
      'vitest/no-disabled-tests': 'off',
    },
  },
  prettierConfigRecommended
);
