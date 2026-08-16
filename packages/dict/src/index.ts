import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DictItem } from '@logistics/types'

export const useDictStore = defineStore('dict', () => {
  const dictMap = ref<Record<string, DictItem[]>>({})

  function setDict(type: string, items: DictItem[]) {
    dictMap.value[type] = items
  }

  function getDict(type: string): DictItem[] {
    return dictMap.value[type] || []
  }

  function getDictLabel(type: string, value: string | number): string {
    const items = getDict(type)
    const item = items.find(i => i.value === value)
    return item?.label || String(value)
  }

  function clearDict() {
    dictMap.value = {}
  }

  return {
    dictMap,
    setDict,
    getDict,
    getDictLabel,
    clearDict
  }
})

export function useDict(type: string) {
  const dictStore = useDictStore()
  return dictStore.getDict(type)
}
