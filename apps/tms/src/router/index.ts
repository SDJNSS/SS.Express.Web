import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '运输管理系统', appCode: 'TMS' }
  }
]

const router = createRouter({
  history: createWebHistory('/tms'),
  routes
})

setupPermissionGuard(router)

export default router
