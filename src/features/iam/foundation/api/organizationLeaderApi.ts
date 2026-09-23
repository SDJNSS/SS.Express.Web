import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { requestApi } from '@shared/api/httpClient'
import type { IamPagedResponse } from './foundationApi'

export interface IamOrganizationLeaderCandidate {
  tenant_user_id: number
  user_id: number
  user_name: string
  real_name: string
  display_name: string
}

export interface IamOrganizationLeaderQuery {
  tenant_id: number
  keyword: string
  page_index: number
  page_size: number
}

export function queryOrganizationLeaderCandidates(
  data: IamOrganizationLeaderQuery,
  signal: AbortSignal,
) {
  return requestApi<IamPagedResponse<IamOrganizationLeaderCandidate>, IamOrganizationLeaderQuery>({
    method: 'POST',
    url: serviceApiPath('iam', defineApiPath('/Organization/QueryLeaderCandidates')),
    data,
    signal,
  })
}
