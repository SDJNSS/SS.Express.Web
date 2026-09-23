export type PasswordRecoveryPageState = 'ready' | 'submitting' | 'submitted' | 'retryable-error'

export interface PasswordRecoveryFormModel {
  account: string
}

export interface PasswordRecoveryPageFixture {
  productName: string
  title: string
  description: string
  copyright: string
  initialModel: PasswordRecoveryFormModel
}
