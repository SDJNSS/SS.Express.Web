<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@shared/components/AppPage.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import {
  getPageResourcePermissionSnapshot,
  subscribePageResourcePermissionSnapshot,
} from '@shared/services/pageResourcePermissionState'
import { dictionaryApi, getDictionarySession } from '../api/dictionaryApi'
import { dictionaryRouteQuery } from '../adapters/dictionaryRoute'
import { el, resourceRegistry } from '../iam-resource.registry'
import DictionaryManagementPageView from '../components/DictionaryManagementPageView.vue'
import { DictionaryError } from '../types/dictionary'
import type { DictionaryAction, DictionaryPort, DictionaryQuery } from '../types/dictionary'

const route = useRoute(),
  router = useRouter()
const owner = resourceRegistry.dictionaries
const snapshot = shallowRef(getPageResourcePermissionSnapshot())
const unsubscribe = subscribePageResourcePermissionSnapshot((value) => {
  snapshot.value = value
})
const bootstrapped = ref(false)
const original = getDictionarySession()
function currentContext() {
  const current = getDictionarySession()
  return Boolean(
    original &&
    current?.accessToken === original.accessToken &&
    current.currentTenantId === original.currentTenantId &&
    current.sessionVersion === original.sessionVersion,
  )
}
const ready = computed(
  () =>
    currentContext() &&
    snapshot.value.ready &&
    snapshot.value.pageResourceCode === owner.resource_code &&
    snapshot.value.permissions.has(owner.resource_code),
)
watch(
  ready,
  (value) => {
    if (value) bootstrapped.value = true
  },
  { immediate: true },
)
function can(action: DictionaryAction) {
  return (
    ready.value &&
    snapshot.value.permissions.has(
      action === 'read' ? owner.resource_code : owner.buttons[action].resource_code,
    )
  )
}
function assert(action: DictionaryAction) {
  if (!can(action))
    throw new DictionaryError('AUTH_PERMISSION_DENIED', '当前会话无此字典操作权限，或权限仍在加载')
}
async function query(body: DictionaryQuery) {
  assert('read')
  const current = dictionaryRouteQuery(route.query)
  if (JSON.stringify(current) !== JSON.stringify(body))
    await router.replace({
      query: {
        ...route.query,
        dictTypeCode: body.dict_type_code || undefined,
        keyword: body.keyword || undefined,
        status: body.status || undefined,
        pageIndex: body.page_index === 1 ? undefined : String(body.page_index),
        pageSize: body.page_size === 20 ? undefined : String(body.page_size),
      },
    })
  assert('read')
  return dictionaryApi.query(body)
}
const port = reactive<DictionaryPort>({
  get authorizationPending() {
    return !snapshot.value.ready
  },
  can,
  get initialQuery() {
    return dictionaryRouteQuery(route.query)
  },
  query,
  queryItems: (body) => {
    assert('read')
    return dictionaryApi.queryItems(body)
  },
  create: (body) => {
    assert('create')
    return dictionaryApi.create(body)
  },
  update: (body) => {
    assert('update')
    return dictionaryApi.update(body)
  },
  enable: (body) => {
    assert('enable')
    return dictionaryApi.enable(body)
  },
  disable: (body) => {
    assert('disable')
    return dictionaryApi.disable(body)
  },
  createItem: (body) => {
    assert('createItem')
    return dictionaryApi.createItem(body)
  },
  updateItem: (body) => {
    assert('updateItem')
    return dictionaryApi.updateItem(body)
  },
  enableItem: (body) => {
    assert('enableItem')
    return dictionaryApi.enableItem(body)
  },
  disableItem: (body) => {
    assert('disableItem')
    return dictionaryApi.disableItem(body)
  },
})
onBeforeUnmount(() => {
  unsubscribe()
})
</script>

<template>
  <DictionaryManagementPageView v-if="bootstrapped" :port="port" />
  <AppPage v-else :resource_element="el.page"
    ><ListPageTemplate>
      <el-skeleton :rows="4" animated /> </ListPageTemplate
  ></AppPage>
</template>
