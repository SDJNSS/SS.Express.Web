import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-ui/**',
      'node_modules/**',
      'docs/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/attributes-order': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,vue}', 'UIDesign/src/**/*.{ts,vue}'],
    ignores: ['src/shared/services/notification.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'element-plus',
              importNames: ['ElMessage'],
              message:
                '仅 src/shared/services/notification.ts 可直接使用 ElMessage；请改用 @shared/services/notification',
            },
          ],
          patterns: [
            {
              group: [
                'element-plus/es/components/message',
                'element-plus/es/components/message/**',
                'element-plus/lib/components/message',
                'element-plus/lib/components/message/**',
              ],
              message: '禁止绕过共享 Notification Owner 深层导入 Element Plus Message',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  eslintConfigPrettier,
)
