import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/framework-preview'
  },
  {
    path: '/framework-preview',
    name: 'framework-preview',
    component: () => import('../views/FrameworkPreview.vue'),
    meta: { title: '前端框架预览' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/tenant-select',
    name: 'tenant-select',
    component: () => import('../views/TenantSelect.vue'),
    meta: { title: '选择租户' }
  },
  {
    path: '/workbench',
    name: 'workbench',
    component: () => import('../views/Workbench.vue'),
    meta: { title: '工作台' }
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('../views/Forbidden.vue'),
    meta: { title: '无权访问' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

setupPermissionGuard(router)

export default router
