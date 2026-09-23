import type { LoginPageFixture } from '../types/login'
import { loginPageContent } from '../loginPage.config'

export const loginPageFixture: LoginPageFixture = {
  ...loginPageContent,
  initialModel: {
    account: '',
    password: '',
    remember: false,
  },
}
