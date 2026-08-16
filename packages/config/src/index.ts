export const APP_CODES = {
  SHELL: 'SHELL',
  SAAS: 'SAAS',
  WMS: 'WMS',
  YMS: 'YMS',
  TMS: 'TMS',
  OMS: 'OMS',
  CRM: 'CRM'
} as const

export type AppCode = (typeof APP_CODES)[keyof typeof APP_CODES]

export const getEnvConfig = () => ({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  appTitle: import.meta.env.VITE_APP_TITLE || 'Logistics Platform',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'zh-CN',
  defaultTimezone: import.meta.env.VITE_DEFAULT_TIMEZONE || 'Asia/Shanghai'
})
