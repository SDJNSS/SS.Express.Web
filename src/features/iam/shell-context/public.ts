export {
  collectCurrentAppPermissionRoutes,
  collectCurrentAppMenuPermissionCodes,
  findCurrentMenuForRoute,
  mapCurrentAppMenusToNavigation,
  resolveFirstCurrentAppMenuRoute,
  mapCurrentProfileToUser,
  normalizeInternalRoute,
} from './adapters/shellContextAdapter'
export {
  getCurrentAppMenus,
  getCurrentApps,
  getCurrentPageResources,
  getCurrentProfile,
} from './api/shellContextApi'
export {
  clearCurrentPageResourceAccessCache,
  getCurrentPageResourcesCached,
} from './services/currentPageResourceAccess'
export type {
  IamApplication,
  IamCurrentAppMenusRequest,
  IamCurrentAppMenusResponse,
  IamCurrentPageResourcesRequest,
  IamCurrentPageResourcesResponse,
  IamCurrentAppModuleMenusResponse,
  IamCurrentMenuResourceResponse,
  IamPermissionResource,
  IamCurrentProfileResponse,
  ShellUserProfile,
} from './types/shellContext'
