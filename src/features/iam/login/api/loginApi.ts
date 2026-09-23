import { defineApiPath } from '@shared/api/apiPath'
import { setStoredAuthSession } from '@shared/api/authSession'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { createRequestId, getOrCreateDeviceId } from '@shared/api/requestIdentity'

import type { LoginFormModel } from '../types/login'
import type { IamLoginRequest, IamLoginResponse } from '../types/loginApi'

const loginEndpoint = serviceApiPath('iam', defineApiPath('/Auth/Login'))

export async function login(form: LoginFormModel): Promise<IamLoginResponse> {
  const requestId = createRequestId()
  const request: IamLoginRequest = {
    user_name: form.account.trim(),
    password: form.password,
    device_id: getOrCreateDeviceId(),
    device_type: 'web',
    request_id: requestId,
  }

  const response = await requestApi<IamLoginResponse, IamLoginRequest>({
    method: 'POST',
    url: loginEndpoint,
    data: request,
    authMode: 'none',
    retryAuth: false,
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json-patch+json',
      'X-Request-ID': requestId,
    },
  })

  if (!response.token?.trim() || !response.login_state?.trim()) {
    throw new ApiError('登录响应缺少会话信息', 'system')
  }
  return response
}

export function persistLoginSession(
  response: IamLoginResponse,
  account: string,
  remember: boolean,
): void {
  setStoredAuthSession(
    {
      accessToken: response.token,
      loginState: response.login_state,
      account: account.trim(),
      ...(response.current_tenant?.tenant_name
        ? { currentTenantName: response.current_tenant.tenant_name }
        : {}),
      ...(response.current_tenant?.tenant_code
        ? { currentTenantCode: response.current_tenant.tenant_code }
        : {}),
      ...(response.current_tenant?.tenant_id
        ? { currentTenantId: response.current_tenant.tenant_id }
        : {}),
      sessionId: response.session_id,
      sessionVersion: response.session_version,
      availableTenants: response.available_tenants.map((tenant) => ({
        tenantId: tenant.tenant_id,
        tenantUserId: tenant.tenant_user_id,
        tenantCode: tenant.tenant_code,
        tenantName: tenant.tenant_name,
        tenantType: tenant.tenant_type,
        logoUrl: tenant.logo_url,
        timezone: tenant.timezone,
        isDefault: tenant.is_default,
      })),
    },
    remember ? 'persistent' : 'session',
  )
}

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.category === 'network') {
    return '无法连接认证服务，请检查网络后重试'
  }
  if (error instanceof ApiError && error.category === 'system') {
    return '认证服务暂时不可用，请稍后重试'
  }
  return '账号或密码不正确，请检查后重试'
}
