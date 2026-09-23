import type { InjectionKey } from 'vue'

export interface AppShellContentContext {
  pageActionsTarget: string
}

export const APP_SHELL_PAGE_ACTIONS_ID = 'app-shell-page-actions'
export const APP_SHELL_PAGE_ACTIONS_TARGET = `#${APP_SHELL_PAGE_ACTIONS_ID}`

export const appShellContentContextKey: InjectionKey<AppShellContentContext> = Symbol(
  'app-shell-content-context',
)
