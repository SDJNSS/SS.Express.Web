<template>
  <main class="framework-preview">
    <section class="platform-frame" aria-label="神树综合物流平台框架">
      <PlatformSidebar
        v-model:search-keyword="sidebarSearchKeyword"
        :tenant="tenantInfo"
        :user="userProfile"
        :menu-items="platformMenus"
        :search-placeholder="sidebarSearchPlaceholder"
        :search-results="sidebarSearchResults"
        :search-threshold="searchTriggerThreshold"
        :is-active="isActive"
        :is-expanded="isExpanded"
        @menu-click="handleMenuClick"
        @search-result-select="handleSearchResultSelect"
      />

      <section class="main-area">
        <header class="topbar">
          <div class="brand-lockup">
            <div class="platform-logo">平台</div>
            <div>
              <strong>神树综合物流平台</strong>
              <span>Unified Logistics Operations Hub</span>
            </div>
          </div>

          <PlatformSearchInput
            v-model="globalSearchKeyword"
            class="global-search"
            placeholder="全局搜索"
            :results="globalSearchResults"
            :search-threshold="searchTriggerThreshold"
            aria-label="全局搜索"
            shortcut="K"
            variant="toolbar"
            @result-select="handleSearchResultSelect"
          />

          <div class="top-actions" aria-label="平台工具">
            <button class="tool-button ai" type="button" title="AI 助手">
              <span class="face-icon" aria-hidden="true"></span>
              <span>AI助手</span>
            </button>
            <button class="tool-button" type="button" title="选择日期">
              <span class="calendar-icon" aria-hidden="true"></span>
              <span>日期</span>
            </button>
            <button class="tool-button weather-location" type="button" title="位置与天气信息">
              <img class="tool-image weather-image" :src="weatherIconUrl" alt="" />
              <span class="weather-place">上海</span>
              <span class="weather-summary">多云 26℃</span>
            </button>
            <button class="icon-button bell" type="button" title="通知" aria-label="通知">
              <img :src="notificationBellIconUrl" alt="" />
            </button>
          </div>
        </header>

        <div class="content-shell">
          <section class="content-head">
            <div>
              <p class="eyebrow">{{ activeBreadcrumb }}</p>
              <h2>{{ currentPageTitle }}</h2>
            </div>
          </section>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import notificationBellIconUrl from '@/assets/platform/notification-bell.png'
import userAvatarIconUrl from '@/assets/platform/user-avatar.png'
import weatherIconUrl from '@/assets/platform/weather-cloud-sun.png'
import PlatformSearchInput from '@/components/platform/PlatformSearchInput.vue'
import PlatformSidebar from '@/components/platform/PlatformSidebar.vue'
import { usePlatformMenu } from '@/composables/usePlatformMenu'
import type {
  PlatformMenuClickPayload,
  PlatformMenuItem,
  PlatformSearchResult,
  PlatformTenantInfo,
  PlatformUserProfile
} from '@/types/platform'

const tenantInfo: PlatformTenantInfo = {
  logoText: 'SS',
  tenantLabel: '',
  tenantName: '神树物流'
}

const userProfile: PlatformUserProfile = {
  avatarText: '陈',
  avatarUrl: userAvatarIconUrl,
  displayName: '陈运营',
  roleName: '平台管理员'
}

const sidebarSearchPlaceholder = '运单 / 客户 / 车辆'
const searchTriggerThreshold = 1
const globalSearchKeyword = ref('')
const sidebarSearchKeyword = ref('')

const platformMenus: PlatformMenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'D' },
  { key: 'tenant', label: '租户管理', icon: 'T' },
  {
    key: 'tms',
    label: 'TMS',
    icon: 'R',
    children: [
      { key: 'tms-request', label: '运输请求', path: '/tms/requests' },
      { key: 'tms-geofence', label: '电子围栏', path: '/tms/geofence' },
      {
        key: 'tms-waybill',
        label: '运单管理',
        children: [
          { key: 'tms-waybill-list', label: '运单列表', path: '/tms/waybills' },
          { key: 'tms-waybill-exception', label: '异常列表', path: '/tms/waybills/exceptions' },
          { key: 'tms-waybill-other', label: '其他管理', path: '/tms/waybills/other' }
        ]
      }
    ]
  },
  { key: 'fms', label: 'FMS', icon: 'F' },
  { key: 'wms', label: 'WMS', icon: 'W' },
  { key: 'oms', label: 'OMS', icon: 'O' },
  { key: 'crm', label: 'CRM', icon: 'C' }
]

const {
  activeMenuPath,
  focusMenuByKey,
  handleMenuClick: handleSidebarMenuClick,
  isActive,
  isExpanded
} = usePlatformMenu(platformMenus, 'tms-waybill-list')

const menuSearchItems = computed(() => {
  const flatten = (
    items: PlatformMenuItem[],
    ancestors: PlatformMenuItem[] = []
  ): PlatformSearchResult[] => {
    return items.flatMap(item => {
      const path = [...ancestors, item]
      const canOpenOrLocate = !!item.path || !!item.children?.length
      const result: PlatformSearchResult | undefined = canOpenOrLocate ? {
        key: item.key,
        title: item.label,
        description: path.map(node => node.label).join(' / '),
        groupLabel: path[0]?.label,
        actionLabel: item.children?.length ? '定位' : '打开',
        path: item.path,
        payload: { menuKey: item.key }
      } : undefined

      const children = item.children?.length ? flatten(item.children, path) : []
      return result ? [result, ...children] : children
    })
  }

  return flatten(platformMenus)
})

const createSearchResults = (keyword: string) => {
  const query = keyword.trim().toLowerCase()
  if (query.length <= searchTriggerThreshold) return []

  return menuSearchItems.value
    .filter(result => {
      const text = `${result.title} ${result.description ?? ''} ${result.path ?? ''}`.toLowerCase()
      return text.includes(query)
    })
    .slice(0, 8)
}

const globalSearchResults = computed(() => createSearchResults(globalSearchKeyword.value))
const sidebarSearchResults = computed(() => createSearchResults(sidebarSearchKeyword.value))

const activeBreadcrumb = computed(() => {
  const labels = activeMenuPath.value.map(item => item.label)
  return labels.length ? labels.join(' / ') : 'Dashboard'
})

const currentPageTitle = computed(() => activeMenuPath.value.at(-1)?.label ?? '运营总览')

const handleMenuClick = (payload: PlatformMenuClickPayload) => {
  handleSidebarMenuClick(payload)
}

const handleSearchResultSelect = (result: PlatformSearchResult) => {
  const menuKey = (result.payload as { menuKey?: string } | undefined)?.menuKey
  if (menuKey) focusMenuByKey(menuKey)
}
</script>

<style scoped>
.framework-preview {
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(rgba(17, 24, 39, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(17, 24, 39, 0.045) 1px, transparent 1px),
    #f1f3f7;
  background-size: 18px 18px;
  color: #0d0d12;
}

.platform-frame {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
  max-width: 1540px;
  min-height: calc(100vh - 48px);
  margin: 0 auto;
}

.main-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid rgba(18, 25, 38, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
}

.topbar {
  display: grid;
  grid-template-columns: minmax(230px, 1fr) minmax(240px, 420px) auto;
  align-items: center;
  gap: 14px;
  min-height: 80px;
  border-bottom: 1px solid #eceef3;
  padding: 12px 18px;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.platform-logo {
  display: grid;
  flex: 0 0 62px;
  height: 52px;
  place-items: center;
  border: 1px solid #d9dce4;
  border-radius: 10px;
  background: #fbfbfd;
  color: #1f2430;
  font-weight: 700;
}

.brand-lockup strong,
.brand-lockup span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-lockup strong {
  font-size: 16px;
}

.brand-lockup span {
  color: #8a909b;
  font-size: 12px;
}

.global-search {
  justify-self: stretch;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.tool-button,
.icon-button {
  border: 1px solid #e4e6ec;
  background: #fff;
  color: #151821;
  cursor: pointer;
  font: inherit;
  letter-spacing: 0;
}

.tool-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  border-radius: 19px;
  padding: 0 11px;
  color: #686e79;
  white-space: nowrap;
}

.tool-button.ai {
  color: #333846;
}

.weather-location {
  gap: 6px;
  padding-left: 8px;
}

.weather-place {
  color: #343943;
  font-weight: 700;
}

.weather-summary {
  color: #747a85;
}

.tool-image {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.icon-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
}

.bell img {
  width: 21px;
  height: 21px;
  object-fit: contain;
}

.face-icon,
.calendar-icon {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
}

.face-icon {
  border: 4px solid #050508;
  border-radius: 5px;
}

.face-icon::before {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #050508;
  box-shadow: 8px 0 0 #050508;
  content: '';
}

.face-icon::after {
  position: absolute;
  left: 5px;
  bottom: 4px;
  width: 10px;
  height: 4px;
  border-bottom: 3px solid #050508;
  border-radius: 0 0 8px 8px;
  content: '';
}

.calendar-icon {
  border: 2px solid currentColor;
  border-radius: 5px;
}

.calendar-icon::before {
  position: absolute;
  left: 3px;
  right: 3px;
  top: 5px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.2);
  content: '';
}

.content-shell {
  flex: 1;
  min-height: 0;
  padding: 22px;
  background: #f4f5f8;
  overflow: auto;
}

.eyebrow {
  margin: 0 0 3px;
  color: #7a7f89;
  font-size: 12px;
}

.content-head h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: 0;
}

@media (max-width: 1380px) and (min-width: 1181px) {
  .topbar {
    grid-template-columns: minmax(220px, 1fr) minmax(260px, 420px);
    min-height: 124px;
  }

  .top-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tool-button {
    min-height: 34px;
    border-radius: 17px;
  }
}

@media (max-width: 1180px) {
  .platform-frame {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .topbar {
    grid-template-columns: 1fr;
  }

  .top-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 760px) {
  .framework-preview {
    padding: 10px;
  }

  .platform-frame {
    grid-template-columns: 1fr;
  }

  .main-area {
    min-height: auto;
  }

  .content-shell {
    padding: 14px;
  }

  .content-head h2 {
    font-size: 26px;
  }
}
</style>
