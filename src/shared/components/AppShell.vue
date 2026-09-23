<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { DropdownInstance } from 'element-plus'

import type {
  AppShellBreadcrumb,
  AppShellNavigationItem,
  AppShellNavigationState,
  AppShellSystem,
} from './appShell.types'
import {
  APP_SHELL_PAGE_ACTIONS_ID,
  APP_SHELL_PAGE_ACTIONS_TARGET,
  appShellContentContextKey,
} from './appShellContentContext'

const props = withDefaults(
  defineProps<{
    productName: string
    brandHref?: string
    currentSystemId: string
    currentSystemLabel: string
    systems: AppShellSystem[]
    navigation: AppShellNavigationItem[]
    breadcrumbs: AppShellBreadcrumb[]
    searchValue?: string
    searchPlaceholder?: string
    notificationCount?: number
    displayName?: string
    tenantName?: string
    userInitial?: string
    userAvatarUrl?: string
    navigationState?: AppShellNavigationState
    navigationMessage?: string
    collapsed?: boolean
  }>(),
  {
    brandHref: '/platform/dashboard',
    searchValue: '',
    searchPlaceholder: '搜索运输单、车辆、客户等',
    notificationCount: 0,
    displayName: '当前用户',
    tenantName: '未选择 Tenant',
    userInitial: '用',
    userAvatarUrl: '',
    navigationState: 'ready',
    navigationMessage: '',
    collapsed: false,
  },
)

provide(appShellContentContextKey, {
  pageActionsTarget: APP_SHELL_PAGE_ACTIONS_TARGET,
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'update:searchValue': [value: string]
  navigate: [href: string, systemId?: string]
  search: [keyword: string]
  notification: []
  retryNavigation: []
  userCommand: [command: string]
}>()

const expandedGroups = ref(new Set<string>())
const userMenuDropdown = ref<DropdownInstance>()
const isUserMenuOpen = ref(false)
const avatarLoadFailed = ref(false)

watch(
  () => props.userAvatarUrl,
  () => {
    avatarLoadFailed.value = false
  },
)

watch(
  () => props.navigation,
  (items) => {
    expandedGroups.value = new Set(
      items.filter((item) => item.expanded || item.active).map((item) => item.id),
    )
  },
  { immediate: true },
)

function navigate(event: MouseEvent, href: string, systemId?: string) {
  event.preventDefault()
  emit('navigate', href, systemId)
}

function toggleGroup(item: AppShellNavigationItem) {
  const next = new Set(expandedGroups.value)
  if (next.has(item.id)) next.delete(item.id)
  else next.add(item.id)
  expandedGroups.value = next

  if (props.collapsed) emit('update:collapsed', false)
}

function isGroupExpanded(id: string) {
  return expandedGroups.value.has(id)
}

function handleSearchKeyup(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing) return
  emit('search', props.searchValue.trim())
}

function toggleUserMenu() {
  if (isUserMenuOpen.value) {
    userMenuDropdown.value?.handleClose()
    return
  }
  userMenuDropdown.value?.handleOpen()
}

function updateUserMenuVisibility(visible: boolean) {
  isUserMenuOpen.value = visible
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--collapsed': collapsed }" :data-collapsed="collapsed">
    <aside class="app-shell__sidebar">
      <a
        class="app-shell__brand"
        :href="brandHref"
        aria-label="返回平台总览"
        @click="navigate($event, brandHref)"
      >
        <span class="app-shell__brand-mark" aria-hidden="true">
          <Icon icon="mdi:cube-outline" width="26" />
        </span>
        <span v-if="!collapsed" class="app-shell__brand-name">{{ productName }}</span>
      </a>

      <div v-if="!collapsed" class="app-shell__system-label">{{ currentSystemLabel }}</div>
      <nav
        class="app-shell__nav"
        :aria-label="`${currentSystemLabel}导航`"
        :aria-busy="navigationState === 'loading'"
      >
        <div
          v-if="navigationState !== 'ready'"
          class="app-shell__nav-feedback"
          :role="navigationState === 'error' ? 'alert' : 'status'"
        >
          <Icon
            :icon="
              navigationState === 'error'
                ? 'mdi:alert-circle-outline'
                : navigationState === 'empty'
                  ? 'mdi:inbox-outline'
                  : 'mdi:refresh'
            "
            width="20"
            aria-hidden="true"
          />
          <span v-if="!collapsed">{{ navigationMessage }}</span>
          <button
            v-if="navigationState === 'error' && !collapsed"
            class="app-shell__nav-retry"
            type="button"
            @click="emit('retryNavigation')"
          >
            重新加载
          </button>
        </div>

        <template v-for="item in navigation" v-else :key="item.id">
          <div v-if="item.children?.length" class="app-shell__nav-group">
            <button
              class="app-shell__nav-link"
              :class="{ 'app-shell__nav-link--active': item.active }"
              type="button"
              :title="collapsed ? item.label : undefined"
              :aria-expanded="isGroupExpanded(item.id)"
              @click="toggleGroup(item)"
            >
              <Icon :icon="item.icon" width="20" aria-hidden="true" />
              <span v-if="!collapsed">{{ item.label }}</span>
              <Icon
                v-if="!collapsed"
                class="app-shell__nav-chevron"
                :icon="isGroupExpanded(item.id) ? 'mdi:chevron-up' : 'mdi:chevron-down'"
                width="18"
                aria-hidden="true"
              />
            </button>

            <div v-if="!collapsed && isGroupExpanded(item.id)" class="app-shell__nav-children">
              <a
                v-for="child in item.children"
                :key="child.id"
                class="app-shell__nav-child"
                :class="{ 'app-shell__nav-child--active': child.active }"
                :href="child.href"
                :aria-current="child.active ? 'page' : undefined"
                @click="navigate($event, child.href)"
              >
                {{ child.label }}
              </a>
            </div>
          </div>

          <a
            v-else-if="item.href"
            class="app-shell__nav-link"
            :class="{ 'app-shell__nav-link--active': item.active }"
            :href="item.href"
            :title="collapsed ? item.label : undefined"
            :aria-current="item.active ? 'page' : undefined"
            @click="navigate($event, item.href)"
          >
            <Icon :icon="item.icon" width="20" aria-hidden="true" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </a>
        </template>
      </nav>

      <div class="app-shell__account">
        <el-dropdown
          ref="userMenuDropdown"
          class="app-shell__account-dropdown"
          placement="right-end"
          trigger="hover"
          @visible-change="updateUserMenuVisibility"
          @command="emit('userCommand', String($event))"
        >
          <button
            class="app-shell__user-menu"
            type="button"
            aria-label="打开用户菜单"
            @click="toggleUserMenu"
          >
            <span class="app-shell__avatar">
              <img
                v-if="userAvatarUrl && !avatarLoadFailed"
                class="app-shell__avatar-image"
                :src="userAvatarUrl"
                alt=""
                @error="avatarLoadFailed = true"
              />
              <template v-else>{{ userInitial }}</template>
            </span>
            <span v-if="!collapsed" class="app-shell__user-copy">
              <strong class="app-shell__user-name">{{ displayName }}</strong>
              <small class="app-shell__tenant-name">{{ tenantName || '未选择 Tenant' }}</small>
            </span>
            <Icon
              v-if="!collapsed"
              class="app-shell__user-chevron"
              icon="mdi:chevron-right"
              width="17"
              aria-hidden="true"
            />
          </button>
          <template #dropdown>
            <slot name="user-menu">
              <el-dropdown-menu>
                <el-dropdown-item command="settings">个人设置</el-dropdown-item>
                <el-dropdown-item command="organization">切换组织</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </slot>
          </template>
        </el-dropdown>
      </div>

      <button
        class="app-shell__collapse"
        type="button"
        :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
        :data-direction="collapsed ? 'right' : 'left'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <Icon
          :icon="collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'"
          width="21"
          aria-hidden="true"
        />
      </button>
    </aside>

    <header class="app-shell__header">
      <nav class="app-shell__system-tabs" aria-label="子系统切换">
        <a
          v-for="system in systems"
          :key="system.id"
          class="app-shell__system-tab"
          :class="{ 'app-shell__system-tab--active': currentSystemId === system.id }"
          :href="system.href"
          :aria-current="currentSystemId === system.id ? 'page' : undefined"
          @click="navigate($event, system.href, system.id)"
        >
          <Icon :icon="system.icon" width="18" aria-hidden="true" />
          <span>{{ system.label }}</span>
        </a>
      </nav>

      <div v-if="$slots.context" class="app-shell__context">
        <slot name="context" />
      </div>

      <div class="app-shell__tools">
        <el-input
          class="app-shell__search"
          :model-value="searchValue"
          :placeholder="searchPlaceholder"
          clearable
          aria-label="全局搜索"
          @update:model-value="emit('update:searchValue', $event)"
          @keyup="handleSearchKeyup"
        >
          <template #prefix>
            <Icon icon="mdi:magnify" width="18" aria-hidden="true" />
          </template>
        </el-input>

        <el-badge
          class="app-shell__notification-badge"
          :value="notificationCount"
          :hidden="notificationCount < 1"
        >
          <el-button text circle aria-label="查看通知" @click="emit('notification')">
            <Icon icon="mdi:bell-outline" width="21" aria-hidden="true" />
          </el-button>
        </el-badge>
      </div>
    </header>

    <div class="app-shell__breadcrumb">
      <nav class="app-shell__breadcrumb-trail" aria-label="面包屑">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.id">
            <h1 v-if="index === breadcrumbs.length - 1" class="app-shell__breadcrumb-title">
              {{ item.label }}
            </h1>
            <template v-else>{{ item.label }}</template>
          </el-breadcrumb-item>
        </el-breadcrumb>
      </nav>
      <div
        :id="APP_SHELL_PAGE_ACTIONS_ID"
        class="app-shell__breadcrumb-actions"
        aria-label="页面操作"
      ></div>
    </div>

    <section class="app-shell__content" data-app-shell-content>
      <slot />
    </section>

    <footer v-if="$slots.footer" class="app-shell__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: grid;
  grid-template-areas:
    'sidebar header'
    'sidebar breadcrumb'
    'sidebar content'
    'sidebar footer';
  grid-template-rows:
    var(--size-header) calc(var(--size-control) + var(--spacing-2)) minmax(0, 1fr)
    auto;
  grid-template-columns: var(--size-sidebar) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  transition: grid-template-columns 180ms ease;
}

.app-shell--collapsed {
  grid-template-columns: var(--size-sidebar-collapsed) minmax(0, 1fr);
}

.app-shell__sidebar {
  position: relative;
  z-index: var(--z-sidebar);
  display: flex;
  grid-area: sidebar;
  flex-direction: column;
  min-width: 0;
  color: var(--text-inverse);
  background: var(--background-sidebar);
}

.app-shell__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  height: var(--size-header);
  padding: 0 var(--spacing-3);
  overflow: hidden;
  color: var(--text-inverse);
  white-space: nowrap;
}

.app-shell__brand-mark {
  display: grid;
  flex: none;
  width: var(--size-control);
  height: var(--size-control);
  color: var(--color-sidebar-brand);
  place-items: center;
}

.app-shell__brand-name {
  overflow: hidden;
  font-size: var(--font-size-lg);
  font-weight: 650;
  text-overflow: ellipsis;
}

.app-shell__system-label {
  padding: var(--spacing-2) var(--spacing-3) var(--spacing-1);
  color: var(--color-sidebar-label);
  font-size: var(--font-size-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.app-shell__nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-1);
  min-height: 0;
  padding: 0 var(--spacing-2);
  overflow-y: auto;
}

.app-shell__nav-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  margin: var(--spacing-3) 0;
  padding: var(--spacing-3) var(--spacing-2);
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  text-align: center;
}

.app-shell__nav-retry {
  min-height: var(--size-control);
  padding: 0 var(--spacing-3);
  color: var(--text-inverse);
  background: var(--background-sidebar-hover);
  border: 1px solid var(--background-sidebar-active);
  border-radius: var(--radius-small);
  cursor: pointer;
}

.app-shell__nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  height: calc(var(--size-control) + var(--spacing-2));
  padding: 0 var(--spacing-2);
  overflow: hidden;
  color: var(--color-sidebar-link);
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: var(--radius-default);
  cursor: pointer;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.app-shell__nav-link:hover {
  color: var(--text-inverse);
  background: var(--background-sidebar-hover);
}

.app-shell__nav-link--active {
  color: var(--text-inverse);
  background: var(--background-sidebar-active);
  box-shadow: inset var(--spacing-1) 0 0 var(--color-sidebar-indicator);
}

.app-shell__nav-chevron {
  margin-left: auto;
}

.app-shell__nav-children {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: var(--spacing-1) 0 var(--spacing-1) var(--spacing-5);
  padding-left: var(--spacing-4);
}

.app-shell__nav-children::before {
  position: absolute;
  top: 0;
  bottom: var(--spacing-4);
  left: var(--spacing-1);
  width: 1px;
  background: var(--color-sidebar-muted);
  content: '';
  opacity: 0.65;
}

.app-shell__nav-child {
  position: relative;
  display: flex;
  align-items: center;
  min-height: calc(var(--size-control) + var(--spacing-1));
  padding: 0 var(--spacing-2);
  color: var(--color-sidebar-link);
  border-radius: var(--radius-small);
}

.app-shell__nav-child::before {
  position: absolute;
  top: 50%;
  left: calc(var(--spacing-4) * -1);
  width: var(--spacing-3);
  height: 1px;
  background: var(--color-sidebar-muted);
  content: '';
  opacity: 0.65;
}

.app-shell__nav-child:hover {
  color: var(--text-inverse);
  background: var(--background-sidebar-hover);
}

.app-shell__nav-child--active {
  color: var(--text-inverse);
  font-weight: 600;
  background: var(--background-sidebar-active);
}

.app-shell__collapse {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 1;
  display: grid;
  width: calc(var(--size-control) + var(--spacing-4));
  height: calc(var(--size-control) + var(--spacing-4));
  color: var(--color-sidebar-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  place-items: center;
  transform: translate(50%, -50%);
}

.app-shell__collapse::before {
  position: absolute;
  inset: var(--spacing-1);
  z-index: -1;
  background: var(--background-sidebar);
  border: 1px solid var(--background-sidebar-active);
  border-radius: var(--radius-default);
  box-shadow: var(--shadow-small);
  content: '';
}

.app-shell__collapse:hover {
  color: var(--text-inverse);
}

.app-shell__collapse:hover::before {
  background: var(--background-sidebar-hover);
}

.app-shell__header {
  z-index: var(--z-header);
  display: flex;
  grid-area: header;
  align-items: center;
  gap: var(--spacing-3);
  min-width: 0;
  padding: 0 var(--spacing-3);
  background: var(--background-card);
  border-bottom: 1px solid var(--border-light);
}

.app-shell__system-tabs {
  display: flex;
  align-self: stretch;
  flex: none;
}

.app-shell__system-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  padding: 0 var(--spacing-3);
  color: var(--text-secondary);
  white-space: nowrap;
}

.app-shell__system-tab + .app-shell__system-tab::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 1px;
  height: var(--spacing-4);
  background: var(--border-default);
  content: '';
  opacity: 0.6;
  transform: translateY(-50%);
}

.app-shell__system-tab::after {
  position: absolute;
  right: var(--spacing-3);
  bottom: 0;
  left: var(--spacing-3);
  height: 2px;
  background: transparent;
  content: '';
}

.app-shell__system-tab:hover,
.app-shell__system-tab--active {
  color: var(--color-primary);
}

.app-shell__system-tab--active::after {
  background: var(--color-primary);
}

.app-shell__context {
  min-width: 0;
}

.app-shell__tools,
.app-shell__user-menu {
  display: flex;
  align-items: center;
}

.app-shell__tools {
  flex: none;
  gap: var(--spacing-2);
  margin-left: auto;
}

.app-shell__search {
  width: 272px;
}

.app-shell__notification-badge {
  margin-right: var(--spacing-1);
}

.app-shell__account {
  flex: none;
  padding: var(--spacing-1) var(--spacing-2);
  border-top: 1px solid var(--background-sidebar-active);
}

.app-shell__account-dropdown {
  width: 100%;
}

.app-shell__user-menu {
  gap: var(--spacing-2);
  width: 100%;
  height: calc(var(--size-control) + var(--spacing-2));
  min-width: 0;
  padding: 0 var(--spacing-2);
  overflow: hidden;
  color: var(--color-sidebar-link);
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: var(--radius-default);
  cursor: pointer;
}

.app-shell__user-menu:hover {
  color: var(--text-inverse);
  background: var(--background-sidebar-hover);
}

.app-shell__user-menu:focus-visible,
.app-shell__collapse:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.app-shell__avatar {
  display: grid;
  flex: none;
  width: calc(var(--size-control) - var(--spacing-1));
  height: calc(var(--size-control) - var(--spacing-1));
  color: var(--text-inverse);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--color-primary);
  border-radius: 50%;
  place-items: center;
  overflow: hidden;
}

.app-shell__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-shell__user-name {
  display: block;
  overflow: hidden;
  color: var(--text-inverse);
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.app-shell__user-copy {
  display: grid;
  min-width: 0;
  gap: var(--spacing-1);
  text-align: left;
}

.app-shell__tenant-name {
  overflow: hidden;
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
  font-weight: 400;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.app-shell__user-chevron {
  flex: none;
  margin-left: auto;
}

.app-shell--collapsed .app-shell__account {
  padding: var(--spacing-2);
}

.app-shell--collapsed .app-shell__user-menu {
  justify-content: center;
  padding: 0;
}

.app-shell__breadcrumb {
  display: flex;
  grid-area: breadcrumb;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  padding: 0 var(--spacing-3);
  background: var(--background-card);
  border-bottom: 1px solid var(--border-light);
}

.app-shell__breadcrumb-trail {
  display: flex;
  align-self: stretch;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.app-shell__breadcrumb-trail :deep(.el-breadcrumb),
.app-shell__breadcrumb-trail :deep(.el-breadcrumb__item),
.app-shell__breadcrumb-trail :deep(.el-breadcrumb__inner),
.app-shell__breadcrumb-trail :deep(.el-breadcrumb__separator) {
  display: flex;
  align-items: center;
}

.app-shell__breadcrumb-trail :deep(.el-breadcrumb),
.app-shell__breadcrumb-trail :deep(.el-breadcrumb__item) {
  height: 100%;
}

.app-shell__breadcrumb-trail :deep(.el-breadcrumb__inner),
.app-shell__breadcrumb-trail :deep(.el-breadcrumb__separator) {
  line-height: 1.25;
}

.app-shell__breadcrumb-title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.app-shell__breadcrumb-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--spacing-2);
  margin-left: auto;
}

.app-shell__breadcrumb-actions:empty {
  display: none;
}

.app-shell__content {
  display: flex;
  grid-area: content;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-shell__footer {
  display: flex;
  grid-area: footer;
  align-items: center;
  min-height: var(--size-control);
  padding: 0 var(--spacing-3);
  color: var(--text-secondary);
  background: var(--background-card);
  border-top: 1px solid var(--border-light);
  font-size: var(--font-size-xs);
}

@media (max-width: 1500px) {
  .app-shell__system-tab {
    padding: 0 var(--spacing-2);
  }

  .app-shell__system-tab svg {
    display: none;
  }

  .app-shell__search {
    width: 220px;
  }
}
</style>
