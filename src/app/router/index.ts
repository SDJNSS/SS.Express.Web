import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import AppLayout from '@app/layouts/AppLayout.vue'
import { useSessionStore } from '@app/store/session'
import { iamPublicRoutes, iamRoutes } from '@features/iam/routes'
import { getCurrentPageResourcesCached } from '@features/iam/shell-context/public'
import { platformRoutes } from '@features/platform/routes'
import { referenceRoutes } from '@features/reference/routes'
import { tmsRoutes } from '@features/tms/routes'
import { trainingRoutes } from '@features/training/routes'
import { vmsRoutes } from '@features/vms/routes'
import { ApiError } from '@shared/api/httpClient'
import { getStoredAuthSession } from '@shared/api/authSession'
import { DEFAULT_SHELL_BRANDING } from '@shared/components/appShellBranding'
import { hasUnsavedForms } from '@shared/services/unsavedNavigation'
import { ElMessageBox } from 'element-plus'

import { resolvePermissionFallback } from './permissionFallback'

const developmentReferenceRoutes = import.meta.env.DEV ? referenceRoutes : []

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    children: iamPublicRoutes,
  },
  {
    path: '/',
    name: 'app-shell',
    component: AppLayout,
    redirect: '/platform/dashboard',
    children: [
      ...platformRoutes,
      ...iamRoutes,
      ...trainingRoutes,
      ...tmsRoutes,
      ...vmsRoutes,
      ...developmentReferenceRoutes,
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@features/forbidden/pages/ForbiddenPage.vue'),
        meta: { title: '无权访问此页面', hidden: true, breadcrumb: ['无权访问此页面'] },
      },
      {
        path: 'authorization-service-error',
        name: 'authorization-service-error',
        component: () => import('@features/forbidden/pages/AuthorizationServiceErrorPage.vue'),
        meta: {
          title: '权限校验暂不可用',
          hidden: true,
          breadcrumb: ['权限校验暂不可用'],
        },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@features/not-found/pages/NotFoundPage.vue'),
        meta: { title: '页面未找到', breadcrumb: ['页面未找到'] },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

let permissionRequestSequence = 0
router.beforeEach(async (to) => {
  const requestSequence = ++permissionRequestSequence
  const session = useSessionStore()
  session.restoreSession()
  if (to.fullPath !== router.currentRoute.value.fullPath && hasUnsavedForms()) {
    try {
      await ElMessageBox.confirm('离开后，未保存的填写内容将丢失。', '放弃未保存的修改？', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
        type: 'warning',
        distinguishCancelAndClose: true,
      })
    } catch {
      return false
    }
  }
  if (to.meta.standaloneAuth && !session.canSelectTenant && !session.canEnterAppShell) {
    return { name: 'iam-login' }
  }
  if (!to.meta.public && !to.meta.standaloneAuth && !session.canEnterAppShell) {
    return { name: 'iam-login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'iam-login' && session.canEnterAppShell) {
    if (session.isWelcomeOnlySession) return '/platform/welcome'
    const redirect = to.query.redirect
    return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/platform/dashboard'
  }
  if (
    !to.meta.public &&
    !to.meta.standaloneAuth &&
    session.isWelcomeOnlySession &&
    to.path !== '/platform/welcome'
  ) {
    return '/platform/welcome'
  }
  const requiresTenantContext =
    !to.meta.public && !to.meta.standaloneAuth && !session.isWelcomeOnlySession
  if (requiresTenantContext && !getStoredAuthSession()?.currentTenantId) {
    return { name: 'iam-select-tenant' }
  }
  if (requiresTenantContext && to.query.tenantId !== undefined) {
    const requestedTenantId = Number(to.query.tenantId)
    if (
      !Number.isSafeInteger(requestedTenantId) ||
      requestedTenantId !== getStoredAuthSession()?.currentTenantId
    ) {
      return { name: 'forbidden', query: { from: to.fullPath, reason: 'tenant-mismatch' } }
    }
  }
  const resourceCode =
    to.path !== '/platform/welcome' && typeof to.meta.resourceCode === 'string'
      ? to.meta.resourceCode.trim()
      : ''
  if (resourceCode) {
    const stored = getStoredAuthSession()
    const isCurrentRequest = () =>
      requestSequence === permissionRequestSequence &&
      stored?.accessToken === getStoredAuthSession()?.accessToken &&
      stored?.currentTenantId === getStoredAuthSession()?.currentTenantId
    session.beginPageResourcePermissionLoad(resourceCode, 'navigation')
    try {
      const response = await getCurrentPageResourcesCached(resourceCode)
      if (!isCurrentRequest()) return false
      const returnedCode = response.page_resource_code.trim()
      if (!response.can_access) {
        session.setPageResourcePermissions(resourceCode, [])
        if (to.path === '/platform/dashboard') return '/platform/welcome'
        if (to.name === 'forbidden') return true
        return { name: 'forbidden', query: { from: to.fullPath } }
      }
      if (returnedCode !== resourceCode) {
        session.setPageResourcePermissions(resourceCode, [])
        return { name: 'authorization-service-error', query: { from: to.fullPath } }
      }
      session.setPageResourcePermissions(resourceCode, [
        resourceCode,
        ...(response.button_resource_codes ?? []),
        ...(response.button_page_resource_codes ?? []),
      ])
    } catch (error) {
      if (!isCurrentRequest()) return false
      session.setPageResourcePermissions(resourceCode, [])
      if (error instanceof ApiError && error.category === 'authentication') {
        return { name: 'iam-login', query: { redirect: to.fullPath } }
      }
      if (error instanceof ApiError && error.category === 'permission') {
        if (to.name === 'forbidden') return true
        return { name: 'forbidden', query: { from: to.fullPath } }
      }
      return { name: 'authorization-service-error', query: { from: to.fullPath } }
    }
  } else {
    session.clearPageResourcePermissions()
  }
  const subsystem = typeof to.meta.subsystem === 'string' ? to.meta.subsystem : undefined
  if (
    !resourceCode &&
    to.path !== '/platform/welcome' &&
    to.meta.permission &&
    session.canEvaluatePermission(subsystem) &&
    !session.hasPermission(to.meta.permission)
  ) {
    if (to.name === 'forbidden') return true
    const fallback = resolvePermissionFallback(router, to, session.hasPermission)
    if (fallback) return fallback
    return { name: 'forbidden', query: { from: to.fullPath } }
  }
  const pageTitle = session.isWelcomeOnlySession ? '欢迎' : to.meta.title
  document.title = pageTitle
    ? `${pageTitle} · ${DEFAULT_SHELL_BRANDING.platformName}`
    : DEFAULT_SHELL_BRANDING.platformName
  return true
})

export default router
