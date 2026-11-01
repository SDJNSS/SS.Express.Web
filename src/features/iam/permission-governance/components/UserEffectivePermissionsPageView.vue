<script setup lang="ts">
import { resourceElementAttributes } from '@shared/services/resourceElement'
import { userEffectiveElements } from '../iam-resource.registry'
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import PermissionAppNavigator from './PermissionAppNavigator.vue'
import PermissionHierarchyInspector from './PermissionHierarchyInspector.vue'
import PermissionTree from './PermissionTree.vue'
import type {
  EffectivePermissionSubject,
  PermissionTreeNode,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRoleRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  apps: PermissionGovernanceApp[]
  permissionTreeByApp: Record<string, PermissionTreeNode[]>
  roles: PermissionRoleRecord[]
  subject: EffectivePermissionSubject
  state: PermissionGovernancePreviewState
  back?: () => void
}>()

const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const effectiveTreeByApp = computed(() => props.permissionTreeByApp)
const availableApps = computed(() =>
  props.apps.filter((app) => Boolean(effectiveTreeByApp.value[app.appCode]?.length)),
)
const activeAppCode = ref(availableApps.value[0]?.appCode ?? '')
const selectedNodeKey = ref('')
const activeNodes = computed(() => effectiveTreeByApp.value[activeAppCode.value] ?? [])
const effectivePermissionKeys = computed(() =>
  (props.subject.effectivePermissionIds ?? []).map((id) => `permission:${id}`),
)
const sourceRoles = computed(() =>
  props.roles.filter(
    (role) => role.tenantId === props.subject.tenantId && props.subject.roleIds.includes(role.id),
  ),
)

function findNode(nodes: PermissionTreeNode[], key: string): PermissionTreeNode | undefined {
  for (const node of nodes) {
    if (node.nodeKey === key) return node
    const child = findNode(node.children, key)
    if (child) return child
  }
  return undefined
}

const selectedNode = computed(() => findNode(activeNodes.value, selectedNodeKey.value))

function switchApp(appCode: string) {
  activeAppCode.value = appCode
  selectedNodeKey.value = ''
}

watch(availableApps, (apps) => {
  if (!apps.some((app) => app.appCode === activeAppCode.value)) {
    activeAppCode.value = apps[0]?.appCode ?? ''
  }
})
</script>

<template>
  <AppPage
    :resource_element="userEffectiveElements.page"
    :scrollable="false"
    class="user-effective-permissions-page"
  >
    <PageHeader title="用户有效权限" description="查看用户通过角色明确获得的 Permission 与资源">
      <template #actions>
        <el-button v-if="back" v-resource-element="userEffectiveElements.local" @click="back">
          <Icon icon="mdi:chevron-left" width="16" aria-hidden="true" />返回用户列表
        </el-button>
        <el-button
          v-resource-element="userEffectiveElements.query"
          :loading="state === 'loading'"
          @click="emit('retry')"
        >
          <Icon icon="mdi:refresh" width="16" aria-hidden="true" />刷新权限结果
        </el-button>
      </template>
    </PageHeader>

    <section class="user-effective-context" aria-label="当前用户有效权限上下文">
      <div class="user-effective-context__identity">
        <span><Icon icon="mdi:shield-account-outline" width="20" aria-hidden="true" /></span>
        <div>
          <strong>{{ subject.userName }}</strong>
          <small>用户 ID {{ subject.userId }} · {{ subject.tenantName }}</small>
        </div>
        <StatusTag label="只读" tone="info" />
      </div>
      <div class="user-effective-context__roles">
        <small>来源角色</small>
        <span v-if="sourceRoles.length">
          <el-tag v-for="role in sourceRoles" :key="role.id" effect="plain" size="small">
            {{ role.roleName }}
          </el-tag>
        </span>
        <strong v-else>当前 Tenant 无有效来源角色</strong>
      </div>
      <div class="user-effective-context__metric">
        <strong>{{ subject.effectivePermissionIds?.length ?? 0 }}</strong>
        <small>有效权限</small>
      </div>
    </section>

    <WorkspacePageTemplate aside-width="224px" scroll-mode="contained">
      <template #aside>
        <PermissionAppNavigator
          v-bind="resourceElementAttributes(userEffectiveElements.local)"
          :apps="availableApps"
          :resource-tree-by-app="effectiveTreeByApp"
          :active-app-code="activeAppCode"
          :included-instance-keys="effectivePermissionKeys"
          count-node-type="PERMISSION"
          title="有效权限所属 App"
          readonly
          @select="switchApp"
        />
      </template>

      <div class="user-effective-workspace">
        <section class="user-effective-workspace__tree" aria-labelledby="effective-package-title">
          <header>
            <div>
              <h2 id="effective-package-title">
                {{ apps.find((app) => app.appCode === activeAppCode)?.appName || '有效权限' }}
              </h2>
              <small>权限和资源均为只读；选择节点可查看来源角色，不推断父子继承</small>
            </div>
            <StatusTag label="聚合只读结果" tone="primary" />
          </header>
          <PermissionTree
            v-bind="resourceElementAttributes(userEffectiveElements.query)"
            :scope-key="`user:${subject.userId}:${subject.tenantId}:${activeAppCode}`"
            :nodes="activeNodes"
            :state="state"
            readonly
            :checked-node-keys="effectivePermissionKeys"
            :selected-node-key="selectedNodeKey"
            empty-description="该用户在当前 Tenant 下没有有效权限"
            search-placeholder="搜索权限、权限名称或 API Path"
            @select="selectedNodeKey = $event.nodeKey"
            @action="emit('action', $event)"
            @retry="emit('retry')"
          />
        </section>

        <PermissionHierarchyInspector :node="selectedNode" />
      </div>
    </WorkspacePageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.user-effective-permissions-page {
  min-height: 0;
}

.user-effective-context {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.65fr) auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.user-effective-context__identity,
.user-effective-context__roles,
.user-effective-context__metric {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.user-effective-context__identity > span:first-child {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.user-effective-context__identity > div,
.user-effective-context__roles,
.user-effective-context__metric {
  display: grid;
  gap: var(--spacing-1);
}

.user-effective-context__identity > div {
  min-width: 0;
  margin-right: auto;
}

.user-effective-context__roles {
  padding-inline: var(--spacing-3);
  border-right: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
}

.user-effective-context__roles > span {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.user-effective-context small,
.user-effective-workspace small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.user-effective-context__metric {
  min-width: var(--spacing-12);
  text-align: center;
}

.user-effective-context__metric strong {
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}

.user-effective-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  height: 100%;
  min-height: 0;
}

.user-effective-workspace__tree {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-3);
}

.user-effective-workspace__tree > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.user-effective-workspace__tree > header > div {
  display: grid;
  gap: var(--spacing-1);
}

.user-effective-workspace h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

@media (max-width: 1450px) {
  .user-effective-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(248px, 0.38fr);
  }
}
</style>
