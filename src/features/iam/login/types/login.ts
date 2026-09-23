export type LoginPageState = 'ready' | 'submitting' | 'auth-error'

export interface LoginFormModel {
  account: string
  password: string
  remember: boolean
}

export interface LoginPageFixture {
  productName: string
  title: string
  description: string
  copyright: string
  initialModel: LoginFormModel
}
