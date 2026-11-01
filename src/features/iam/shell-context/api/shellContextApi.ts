import { defineApiPath } from '@shared/api/apiPath'
import { getStoredAuthSession } from '@shared/api/authSession'
import { serviceApiPath } from '@shared/api/backendServices'
import { requestApi } from '@shared/api/httpClient'

import type {
  IamCurrentAppMenusRequest,
  IamCurrentAppMenusResponse,
  IamCurrentAppsResponse,
  IamCurrentPageResourcesRequest,
  IamCurrentPageResourcesResponse,
  IamCurrentProfileResponse,
} from '../types/shellContext'

export { getStoredAuthSession }

const endpoints = Object.freeze({
  currentApps: serviceApiPath('iam', defineApiPath('/CurrentPermissionResource/CurrentApps')),
  currentAppMenus: serviceApiPath(
    'iam',
    defineApiPath('/CurrentPermissionResource/CurrentAppMenus'),
  ),
  currentPageResources: serviceApiPath(
    'iam',
    defineApiPath('/CurrentPermissionResource/CurrentPageResources'),
  ),
  currentProfile: serviceApiPath('iam', defineApiPath('/Auth/CurrentProfile')),
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
    tenantScoped: true,
    method: 'POST',
    url: endpoints.currentApps,
    data: {},
    headers: iamPostHeaders,
  })
}

export function getCurrentAppMenus(appId: number): Promise<IamCurrentAppMenusResponse> {
  const request: IamCurrentAppMenusRequest = { app_id: appId }
  return requestApi<IamCurrentAppMenusResponse, IamCurrentAppMenusRequest>({
    tenantScoped: true,
    method: 'POST',
    url: endpoints.currentAppMenus,
    data: request,
    headers: iamJsonHeaders,
  })
}

export function getCurrentPageResources(
  pageResourceCode: string,
): Promise<IamCurrentPageResourcesResponse> {
  const request: IamCurrentPageResourcesRequest = { page_resource_code: pageResourceCode }
  return requestApi<IamCurrentPageResourcesResponse, IamCurrentPageResourcesRequest>({
    tenantScoped: true,
    method: 'POST',
    url: endpoints.currentPageResources,
    data: request,
    headers: iamPostHeaders,
  })
}

export function getCurrentProfile(): Promise<IamCurrentProfileResponse> {
  return requestApi<IamCurrentProfileResponse>({
    method: 'POST',
    url: endpoints.currentProfile,
    headers: iamJsonHeaders,
  })
}
