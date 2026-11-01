import { notification } from '@shared/services/notification'

import { ApiError } from '../api/permissionGovernanceApi'

export function permissionGovernanceErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.category === 'authentication') return '登录状态已失效，请重新登录'
  if (error.category === 'permission') return '当前账号无权执行此操作'
  if (error.category === 'network') return '无法连接权限服务，请检查网络后重试'
  if (error.status === 409) return '数据已被其他用户修改，请刷新后重试'
  return error.message || fallback
}

export function reportPermissionGovernanceQueryError(error: unknown, fallback: string): void {
  notification.error(permissionGovernanceErrorMessage(error, fallback))
}

export function isUnknownPermissionGovernanceMutation(error: unknown): boolean {
  return !(error instanceof ApiError) || error.category === 'network' || error.category === 'system'
}

export function reportPermissionGovernanceMutationError(
  error: unknown,
  action: string,
  options: { canRetryWithSameRequestId?: boolean } = {},
): void {
  if (isUnknownPermissionGovernanceMutation(error)) {
    notification.error(
      options.canRetryWithSameRequestId
        ? `${action}结果未知，请刷新确认，或使用原请求标识显式重试`
        : `${action}结果未知，请刷新确认服务端状态，暂勿重复提交`,
    )
    return
  }
  notification.error(permissionGovernanceErrorMessage(error, `${action}失败`))
}
