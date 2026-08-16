<template>
  <div class="main-layout">
    <aside class="sidebar">
      <div class="logo">
        <h1>SaaS Admin</h1>
      </div>
      <nav class="nav-menu">
        <div
          v-for="menu in menuList"
          :key="menu.path"
          class="menu-item"
          :class="{ active: isActive(menu.path) }"
          @click="navigate(menu.path)"
        >
          <span class="menu-icon">{{ menu.icon }}</span>
          <span class="menu-title">{{ menu.title }}</span>
        </div>
      </nav>
    </aside>

    <div class="main-content">
      <header class="header">
        <div class="header-left">
          <span class="tenant-info">租户：{{ tenantName }}</span>
        </div>
        <div class="header-right">
          <span class="user-info">{{ username }}</span>
          <button class="btn-logout" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = computed(() => authStore.userInfo?.realName || authStore.userInfo?.username);
const tenantName = computed(() => authStore.tenantInfo?.tenantName);

const menuList = ref([
  { path: '/tenant', title: '租户管理', icon: '🏢' },
  { path: '/app', title: '应用管理', icon: '📱' },
  { path: '/feature', title: '功能管理', icon: '⚙️' },
  { path: '/plan', title: '套餐管理', icon: '📦' },
  { path: '/subscription', title: '订阅管理', icon: '📝' },
  { path: '/user', title: '用户管理', icon: '👤' },
  { path: '/tenant-user', title: '租户用户', icon: '👥' },
  { path: '/org', title: '组织架构', icon: '🏗️' },
  { path: '/position', title: '岗位管理', icon: '💼' },
  { path: '/role', title: '角色管理', icon: '🔐' },
  { path: '/resource', title: '资源管理', icon: '🔑' },
  { path: '/data-scope', title: '数据权限', icon: '🛡️' },
  { path: '/audit/login', title: '登录审计', icon: '📊' },
  { path: '/audit/operation', title: '操作审计', icon: '📋' },
]);

const isActive = (path: string) => {
  return route.path.startsWith(path);
};

const navigate = (path: string) => {
  router.push(path);
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

.sidebar {
  width: 200px;
  background: #001529;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.3s;
  color: rgba(255, 255, 255, 0.65);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-item.active {
  background: #1890ff;
  color: #fff;
}

.menu-icon {
  margin-right: 8px;
  font-size: 16px;
}

.menu-title {
  font-size: 14px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 64px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 10;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tenant-info,
.user-info {
  font-size: 14px;
  color: #595959;
}

.btn-logout {
  padding: 4px 15px;
  font-size: 14px;
  color: #595959;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-logout:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
