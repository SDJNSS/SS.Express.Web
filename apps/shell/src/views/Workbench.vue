<template>
  <div class="workbench-container">
    <div class="header">
      <h1>Logistics Platform</h1>
      <div class="user-info">
        <span>欢迎, {{ currentUser }}</span>
        <button @click="handleLogout">退出</button>
      </div>
    </div>
    <div class="content">
      <h2>工作台</h2>
      <div class="app-grid">
        <div v-for="app in apps" :key="app.code" class="app-card" @click="openApp(app)">
          <h3>{{ app.name }}</h3>
          <p>{{ app.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@logistics/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentUser = ref('Admin')

const apps = ref([
  { code: 'SAAS', name: 'SaaS 管理', description: 'SaaS 管理后台' },
  { code: 'WMS', name: 'WMS', description: '仓储管理系统' },
  { code: 'YMS', name: 'YMS', description: '园区管理系统' },
  { code: 'TMS', name: 'TMS', description: '运输管理系统' },
  { code: 'OMS', name: 'OMS', description: '订单管理系统' },
  { code: 'CRM', name: 'CRM', description: '客户管理系统' }
])

function openApp(app: any) {
  console.log('Open app:', app)
  window.open(`/${app.code.toLowerCase()}`, '_blank')
}

function handleLogout() {
  authStore.clearAuth()
  router.push('/login')
}
</script>

<style scoped>
.workbench-container {
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 64px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info button {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  padding: 40px;
}

.content h2 {
  margin-bottom: 30px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.app-card {
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.app-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.app-card h3 {
  margin-bottom: 10px;
  font-size: 18px;
}

.app-card p {
  font-size: 14px;
  color: #666;
}
</style>
