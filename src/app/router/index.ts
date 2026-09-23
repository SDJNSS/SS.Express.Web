import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import AppLayout from '@app/layouts/AppLayout.vue'
import { useSessionStore } from '@app/store/session'
import { iamPublicRoutes, iamRoutes } from '@features/iam/routes'
import { platformRoutes } from '@features/platform/routes'
import { referenceRoutes } from '@features/reference/routes'
import { tmsRoutes } from '@features/tms/routes'
import { trainingRoutes } from '@features/training/routes'
import { vmsRoutes } from '@features/vms/routes'

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

router.beforeEach((to) => {
  const session = useSessionStore()
  session.restoreSession()
  if (to.meta.standaloneAuth && !session.canSelectTenant) {
    return session.canEnterAppShell ? '/platform/welcome' : { name: 'iam-login' }
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
  const subsystem = typeof to.meta.subsystem === 'string' ? to.meta.subsystem : undefined
  if (
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
  document.title = pageTitle ? `${pageTitle} · 陆链控制台` : '陆链控制台'
  return true
})

export default router
