import { onMounted, ref } from 'vue'

import { listLookupOptions } from '@shared/api/lookupApi'
import type { LookupKind, LookupOption } from '@shared/types/lookup'

export function useLookupOptions(kind: LookupKind) {
  const loading = ref(false)
  const options = ref<LookupOption[]>([])

  async function search(keyword = '') {
    loading.value = true
    try {
      options.value = await listLookupOptions(kind, keyword)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => search())

  return { loading, options, search }
}
