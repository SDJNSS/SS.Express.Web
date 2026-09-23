import { defineApiPath, joinApiPath, type ApiPath } from './apiPath'

export const backendServiceBasePaths = Object.freeze({
  iam: defineApiPath('/iam-admin'),
  dmsFile: defineApiPath('/dms'),
})

export type BackendService = keyof typeof backendServiceBasePaths

export function serviceApiPath(service: BackendService, endpointPath: ApiPath): ApiPath {
  return joinApiPath(backendServiceBasePaths[service], endpointPath)
}
