import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '仓储管理系统', appCode: 'WMS' }
  }
]

const router = createRouter({
  history: createWebHistory('/wms'),
  routes
})

setupPermissionGuard(router)

export default router
