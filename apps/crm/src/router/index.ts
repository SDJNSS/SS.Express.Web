import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '客户管理系统', appCode: 'CRM' }
  }
]

const router = createRouter({
  history: createWebHistory('/crm'),
  routes
})

setupPermissionGuard(router)

export default router
