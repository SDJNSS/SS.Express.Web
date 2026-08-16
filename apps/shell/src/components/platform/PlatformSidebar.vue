<template>
  <aside class="sidebar platform-sidebar" aria-label="系统导航">
    <div class="tenant-panel">
      <div class="tenant-logo">
        <span>{{ tenant.logoText }}</span>
      </div>
      <div>
        <p class="sidebar-eyebrow">{{ tenant.tenantLabel }}</p>
        <h1>{{ tenant.tenantName }}</h1>
      </div>
    </div>

    <PlatformSearchInput
      v-model="searchKeyword"
      :placeholder="searchPlaceholder"
      :results="searchResults"
      :search-threshold="searchThreshold"
      aria-label="侧边搜索"
      variant="sidebar"
      @result-select="emit('search-result-select', $event)"
      @search="emit('search', $event)"
    />

    <nav class="sidebar-menu">
      <PlatformMenuNode
        v-for="item in menuItems"
        :key="item.key"
        :item="item"
        :is-active="isActive"
        :is-expanded="isExpanded"
        @item-click="emit('menu-click', $event)"
      />
    </nav>

    <div class="profile-card">
      <div class="avatar" aria-hidden="true">
        <img :src="avatarSource" alt="" />
      </div>
      <div>
        <strong>{{ user.displayName }}</strong>
        <span>{{ user.roleName }}</span>
      </div>
    </div>

    <div class="profile-actions" aria-label="用户操作">
      <button class="profile-action" type="button" @click="emit('settings-click')">
        <span class="action-icon settings" aria-hidden="true"></span>
        <span>设置</span>
      </button>
      <button class="profile-action logout" type="button" @click="emit('logout-click')">
        <span class="action-icon logout" aria-hidden="true"></span>
        <span>退出登录</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlatformMenuNode from './PlatformMenuNode.vue'
import PlatformSearchInput from './PlatformSearchInput.vue'
import defaultAvatarIconUrl from '@/assets/platform/user-avatar.png'
import type {
  PlatformMenuClickPayload,
  PlatformMenuItem,
  PlatformSearchResult,
  PlatformTenantInfo,
  PlatformUserProfile
} from '@/types/platform'

const props = defineProps<{
  tenant: PlatformTenantInfo
  user: PlatformUserProfile
  menuItems: PlatformMenuItem[]
  searchKeyword?: string
  searchPlaceholder: string
  searchThreshold?: number
  searchResults?: PlatformSearchResult[]
  isActive: (key: string) => boolean
  isExpanded: (key: string) => boolean
}>()

const emit = defineEmits<{
  'update:searchKeyword': [value: string]
  'menu-click': [payload: PlatformMenuClickPayload]
  search: [keyword: string]
  'search-result-select': [result: PlatformSearchResult]
  'settings-click': []
  'logout-click': []
}>()

const avatarSource = computed(() => props.user.avatarUrl ?? defaultAvatarIconUrl)
const searchKeyword = computed({
  get: () => props.searchKeyword ?? '',
  set: value => emit('update:searchKeyword', value)
})
</script>

<style scoped>
.platform-sidebar {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 48px);
  border: 1px solid rgba(18, 25, 38, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  padding: 18px;
}

.tenant-panel {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.tenant-logo {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 1px solid #d9dce4;
  border-radius: 14px;
  background: #fbfbfd;
  color: #1f2430;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.tenant-logo span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: #7d55ee;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0;
}

.sidebar-eyebrow {
  margin: 0 0 3px;
  color: #7a7f89;
  font-size: 12px;
}

.tenant-panel h1 {
  margin: 0;
  color: #20232a;
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: 0;
}

.sidebar-menu {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.profile-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 14px;
  border-radius: 14px;
  background: #fff8f1;
}

.avatar {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  overflow: hidden;
  border: 2px solid #f2b56b;
  border-radius: 50%;
  background: #fff0df;
}

.avatar img {
  width: 76%;
  height: 76%;
  object-fit: contain;
}

.profile-card strong,
.profile-card span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card strong {
  color: #2a2118;
  font-size: 15px;
}

.profile-card span {
  color: #8a6b4d;
  font-size: 12px;
}

.profile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.profile-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  min-width: 0;
  border: 1px solid #efe0d1;
  border-radius: 10px;
  background: #fff;
  color: #5f5245;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  letter-spacing: 0;
}

.profile-action:hover {
  border-color: #e1c1a2;
  background: #fffaf5;
}

.profile-action.logout {
  color: #b65032;
}

.action-icon {
  position: relative;
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
}

.action-icon.settings {
  border: 2px solid currentColor;
  border-radius: 50%;
}

.action-icon.settings::before {
  position: absolute;
  inset: 4px;
  border: 2px solid currentColor;
  border-radius: 50%;
  content: '';
}

.action-icon.logout::before {
  position: absolute;
  left: 1px;
  top: 3px;
  width: 8px;
  height: 10px;
  border: 2px solid currentColor;
  border-right: 0;
  border-radius: 3px 0 0 3px;
  content: '';
}

.action-icon.logout::after {
  position: absolute;
  right: 1px;
  top: 7px;
  width: 9px;
  height: 2px;
  background: currentColor;
  box-shadow: 4px -3px 0 -1px currentColor, 4px 3px 0 -1px currentColor;
  content: '';
}

@media (max-width: 760px) {
  .platform-sidebar {
    min-height: auto;
    padding: 14px;
  }

  .sidebar-menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .profile-card {
    margin-top: 12px;
  }

  .profile-actions {
    grid-template-columns: 1fr;
  }
}
</style>
