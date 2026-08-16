import { computed, ref } from 'vue'
import type { PlatformMenuClickPayload, PlatformMenuItem } from '@/types/platform'

const findFirstLeaf = (items: PlatformMenuItem[]): PlatformMenuItem | undefined => {
  for (const item of items) {
    if (item.children?.length) {
      const child = findFirstLeaf(item.children)
      if (child) return child
      continue
    }

    return item
  }

  return undefined
}

const getAncestorKeys = (
  items: PlatformMenuItem[],
  activeKey: string,
  ancestors: string[] = []
): string[] => {
  for (const item of items) {
    if (item.key === activeKey) return ancestors

    if (item.children?.length) {
      const found = getAncestorKeys(item.children, activeKey, [...ancestors, item.key])
      if (found.length > 0) return found
    }
  }

  return []
}

const findMenuPath = (
  items: PlatformMenuItem[],
  key: string,
  path: PlatformMenuItem[] = []
): PlatformMenuItem[] => {
  for (const item of items) {
    const nextPath = [...path, item]
    if (item.key === key) return nextPath

    if (item.children?.length) {
      const found = findMenuPath(item.children, key, nextPath)
      if (found.length) return found
    }
  }

  return []
}

export function usePlatformMenu(items: PlatformMenuItem[], initialActiveKey?: string) {
  const initialActiveItem = findFirstLeaf(items) ?? items[0]
  const activeMenuKey = ref(initialActiveKey ?? initialActiveItem?.key ?? '')
  const expandedMenuKeys = ref(new Set(getAncestorKeys(items, activeMenuKey.value)))

  const activeMenuPath = computed(() => {
    const findPath = (
      nodes: PlatformMenuItem[],
      key: string,
      path: PlatformMenuItem[] = []
    ): PlatformMenuItem[] => {
      for (const node of nodes) {
        const nextPath = [...path, node]
        if (node.key === key) return nextPath
        if (node.children?.length) {
          const matched = findPath(node.children, key, nextPath)
          if (matched.length) return matched
        }
      }

      return []
    }

    return findPath(items, activeMenuKey.value)
  })

  const isExpanded = (key: string) => expandedMenuKeys.value.has(key)
  const isActive = (key: string) => activeMenuKey.value === key

  const toggleMenu = (key: string) => {
    const nextKeys = new Set(expandedMenuKeys.value)

    if (nextKeys.has(key)) {
      nextKeys.delete(key)
    } else {
      nextKeys.add(key)
    }

    expandedMenuKeys.value = nextKeys
  }

  const focusMenu = (item: PlatformMenuItem) => {
    const nextKeys = new Set([...expandedMenuKeys.value, ...getAncestorKeys(items, item.key)])

    if (item.children?.length) {
      nextKeys.add(item.key)
    } else if (item.path) {
      activeMenuKey.value = item.key
    }

    expandedMenuKeys.value = nextKeys
  }

  const handleMenuClick = ({ item, level }: PlatformMenuClickPayload) => {
    if (level === 0) {
      if (item.children?.length) toggleMenu(item.key)
      return
    }

    if (item.children?.length) {
      toggleMenu(item.key)
      return
    }

    focusMenu(item)
  }

  const focusMenuByKey = (key: string) => {
    const path = findMenuPath(items, key)
    const item = path.at(-1)
    if (!item) return

    focusMenu(item)
  }

  return {
    activeMenuKey,
    activeMenuPath,
    expandedMenuKeys,
    focusMenu,
    focusMenuByKey,
    handleMenuClick,
    isActive,
    isExpanded,
    toggleMenu
  }
}
