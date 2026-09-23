import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { requestApi } from '@shared/api/httpClient'

import type {
  IamCurrentAppMenusRequest,
  IamCurrentAppMenusResponse,
  IamCurrentAppsResponse,
  IamCurrentFunctionsRequest,
  IamCurrentFunctionsResponse,
  IamQueryUsersRequest,
  IamQueryUsersResponse,
} from '../types/shellContext'

const endpoints = Object.freeze({
  currentApps: serviceApiPath('iam', defineApiPath('/Permission/CurrentApps')),
  currentAppMenus: serviceApiPath('iam', defineApiPath('/Permission/CurrentAppMenus')),
  currentFunctions: serviceApiPath('iam', defineApiPath('/Permission/CurrentFunctions')),
  queryUsers: serviceApiPath('iam', defineApiPath('/Membership/QueryUsers')),
})

const iamPostHeaders = Object.freeze({
  Accept: 'text/plain',
  'Content-Type': 'application/json-patch+json',
})

const iamJsonHeaders = Object.freeze({
  'Content-Type': 'application/json',
})

export function getCurrentApps(): Promise<IamCurrentAppsResponse> {
  return requestApi<IamCurrentAppsResponse, Record<string, never>>({
    method: 'POST',
    url: endpoints.currentApps,
    data: {},
    headers: iamPostHeaders,
  })
}

export function getCurrentAppMenus(appId: number): Promise<IamCurrentAppMenusResponse> {
  const request: IamCurrentAppMenusRequest = { app_id: appId }
  return requestApi<IamCurrentAppMenusResponse, IamCurrentAppMenusRequest>({
    method: 'POST',
    url: endpoints.currentAppMenus,
    data: request,
    headers: iamJsonHeaders,
  })
}

export function getCurrentFunctions(menuId: number): Promise<IamCurrentFunctionsResponse> {
  const request: IamCurrentFunctionsRequest = { menu_id: menuId }
  return requestApi<IamCurrentFunctionsResponse, IamCurrentFunctionsRequest>({
    method: 'POST',
    url: endpoints.currentFunctions,
    data: request,
    headers: iamPostHeaders,
  })
}

export function queryUsers(request: IamQueryUsersRequest): Promise<IamQueryUsersResponse> {
  return requestApi<IamQueryUsersResponse, IamQueryUsersRequest>({
    method: 'POST',
    url: endpoints.queryUsers,
    data: request,
    headers: iamPostHeaders,
  })
}
