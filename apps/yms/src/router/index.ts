import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupPermissionGuard } from '@logistics/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '园区管理系统', appCode: 'YMS' }
  }
]

const router = createRouter({
  history: createWebHistory('/yms'),
  routes
})

setupPermissionGuard(router)

export default router
