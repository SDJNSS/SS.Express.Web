import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '订单管理系统', appCode: 'OMS' }
  }
]

const router = createRouter({
  history: createWebHistory('/oms'),
  routes
})

setupPermissionGuard(router)

export default router
