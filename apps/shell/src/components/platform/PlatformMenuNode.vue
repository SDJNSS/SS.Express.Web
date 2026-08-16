<template>
  <div class="platform-menu-node" :class="`level-${level}`">
    <button
      class="menu-trigger"
      :class="{
        active: isActive(item.key),
        expanded: isExpanded(item.key),
        leaf: !hasChildren
      }"
      :aria-expanded="hasChildren ? isExpanded(item.key) : undefined"
      type="button"
      @click="emit('item-click', { item, level })"
    >
      <span v-if="level === 0" class="menu-icon" aria-hidden="true">{{ item.icon }}</span>
      <span class="menu-label">{{ item.label }}</span>
      <span v-if="item.badge" class="menu-badge">{{ item.badge }}</span>
      <span v-if="hasChildren" class="menu-chevron" aria-hidden="true"></span>
    </button>

    <div v-if="hasChildren && isExpanded(item.key)" class="menu-children">
      <PlatformMenuNode
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :level="level + 1"
        :is-active="isActive"
        :is-expanded="isExpanded"
        @item-click="emit('item-click', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlatformMenuClickPayload, PlatformMenuItem } from '@/types/platform'

defineOptions({
  name: 'PlatformMenuNode'
})

const props = defineProps<{
  item: PlatformMenuItem
  level?: number
  isActive: (key: string) => boolean
  isExpanded: (key: string) => boolean
}>()

const emit = defineEmits<{
  'item-click': [payload: PlatformMenuClickPayload]
}>()

const level = props.level ?? 0
const hasChildren = !!props.item.children?.length
</script>

<style scoped>
.platform-menu-node {
  display: grid;
  gap: 6px;
}

.menu-trigger {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #242832;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0;
  padding: 0 14px;
  text-align: left;
}

.menu-trigger:hover {
  background: #f4f5f8;
}

.menu-trigger.active {
  background: #050508;
  color: #fff;
  box-shadow: 0 10px 24px rgba(5, 5, 8, 0.18);
}

.menu-trigger.leaf {
  grid-template-columns: 24px minmax(0, 1fr) auto;
}

.menu-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-badge {
  display: inline-grid;
  min-width: 24px;
  height: 20px;
  place-items: center;
  border-radius: 10px;
  background: #7d55ee;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 0 7px;
}

.menu-chevron {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid currentColor;
  transition: transform 0.18s ease;
}

.menu-trigger.expanded .menu-chevron {
  transform: rotate(90deg);
}

.menu-children {
  display: grid;
  gap: 4px;
}

.level-1 > .menu-trigger {
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 34px;
  padding-left: 56px;
  color: #383d48;
  font-weight: 500;
}

.level-1 > .menu-trigger.leaf {
  grid-template-columns: minmax(0, 1fr) auto;
}

.level-1 > .menu-trigger.active {
  background: #f1edff;
  color: #6b45dc;
  box-shadow: none;
  font-weight: 700;
}

.level-2 > .menu-trigger {
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 30px;
  padding-left: 82px;
  color: #616773;
  font-size: 13px;
  font-weight: 500;
}

.level-2 > .menu-trigger.leaf {
  grid-template-columns: minmax(0, 1fr) auto;
}

.level-2 > .menu-trigger.active {
  background: transparent;
  color: #111318;
  box-shadow: none;
  font-weight: 800;
}
</style>
