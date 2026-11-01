<script setup lang="ts">
import { computed } from 'vue'
import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import DataTable from '@shared/components/DataTable.vue'
import type { DataTableColumn } from '@shared/components/DataTable.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import { el } from '../iam-resource.registry'
import { useDictionaryManagement } from '../composables/useDictionaryManagement'
import type { Dictionary, DictionaryItem, DictionaryPort } from '../types/dictionary'
import DictionaryItemFields from './DictionaryItemFields.vue'

const props = defineProps<{ port: DictionaryPort }>()
const vm = useDictionaryManagement(props.port)
const {
  allowed,
  load,
  search,
  reset,
  openValues,
  closeValues,
  loadItems,
  searchItems,
  resetItems,
  openForm,
  saveDictionary,
  verifyCreate,
  openItem,
  saveItem,
  askStatus,
  confirmStatus,
} = vm
const {
  filters,
  page,
  pageSize,
  rows,
  total,
  loading,
  error,
  notice,
  selected,
  valuesVisible,
  valuesLoading,
  valuesError,
  itemFilters,
  itemPage,
  itemPageSize,
  itemTotal,
  items,
  formVisible,
  editing,
  formBusy,
  formError,
  form,
  formDirty,
  unknownCreate,
  itemVisible,
  itemEditing,
  itemForm,
  itemSnapshot,
  itemBusy,
  itemError,
  itemUnknown,
  initialMode,
  statusTarget,
  statusKind,
  statusAction,
  statusBusy,
  statusError,
  statusUnknown,
} = vm
const columns: DataTableColumn[] = [
  { label: '字典编码', slot: 'code', minWidth: 180 },
  { label: '字典名称', slot: 'name', minWidth: 180 },
  { label: '状态', slot: 'status', width: 88 },
  { label: '描述', prop: 'description', minWidth: 220 },
  { label: '更新时间', slot: 'updated', minWidth: 180 },
  { label: '操作', slot: 'actions', fixed: 'right' },
]
const itemColumns: DataTableColumn[] = [
  { label: '编码', prop: 'item_code', minWidth: 140, maxCharacters: false },
  { label: '名称', prop: 'item_name', minWidth: 140 },
  { label: '状态', slot: 'status', width: 88 },
  { label: '业务可用性', slot: 'available', minWidth: 112 },
  { label: '排序', prop: 'sort_no', width: 76 },
  { label: '颜色 / 标签', prop: 'item_color', minWidth: 100 },
  { label: '描述', prop: 'description', minWidth: 160 },
  { label: '扩展数据', slot: 'json', minWidth: 160 },
  { label: '操作', slot: 'actions', fixed: 'right' },
]
const statusVisible = computed({
  get: () => Boolean(statusTarget.value),
  set: (value) => {
    if (!value && !statusBusy.value) statusTarget.value = undefined
  },
})
const statusVerb = computed(() => (statusAction.value === 'enable' ? '启用' : '停用'))
const statusTitle = computed(
  () => `${statusVerb.value}${statusKind.value === 'dictionary' ? '字典' : '字典值'}？`,
)
function refreshMissingDictionary() {
  closeValues(false)
  void load()
}
</script>

<template>
  <AppPage :resource_element="el.page" class="dictionary-page">
    <PageHeader title="字典管理" description="维护平台公共字典与字典值" />
    <el-skeleton v-if="port.authorizationPending" :rows="4" animated />
    <el-result
      v-else-if="!allowed('read')"
      icon="warning"
      title="缺少字典查询权限"
      sub-title="请联系管理员配置页面查询权限。"
    />
    <ListPageTemplate v-else>
      <template #search>
        <SearchPanel
          :resource_element="el.query"
          :loading="loading"
          @search="search"
          @reset="reset"
        >
          <el-form
            class="dictionary-search-form"
            label-position="top"
            novalidate
            @submit.prevent="search"
          >
            <el-form-item label="字典编码"
              ><el-input
                v-model="filters.code"
                clearable
                maxlength="100"
                placeholder="完整编码，精确查询"
                @keyup.enter="search"
            /></el-form-item>
            <el-form-item label="字典名称 / 关键词"
              ><el-input
                v-model="filters.keyword"
                clearable
                placeholder="名称、编码或描述，模糊查询"
                @keyup.enter="search"
            /></el-form-item>
            <el-form-item label="字典状态"
              ><el-select
                v-model="filters.status"
                :empty-values="[null, undefined]"
                placeholder="全部状态"
                ><el-option label="全部状态" value="" /><el-option
                  label="启用"
                  value="active" /><el-option label="停用" value="disabled" /></el-select
            ></el-form-item>
          </el-form>
          <template #footer-leading
            ><el-button
              v-if="allowed('create')"
              v-resource-element="el.create"
              type="primary"
              @click="openForm()"
              >新建字典</el-button
            ></template
          >
        </SearchPanel>
      </template>
      <template #toolbar
        ><TableToolbar
          title="字典列表"
          :resource_element="el.query"
          :total="total"
          :refreshing="loading"
          @refresh="load"
          ><template #summary
            ><span class="dictionary-hint">平台共享 · 点击编码或名称查看字典值</span></template
          ></TableToolbar
        ></template
      >
      <el-alert
        v-if="notice"
        :title="notice"
        type="success"
        show-icon
        closable
        @close="notice = ''"
      />
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false"
        ><el-button v-resource-element="el.query" link type="primary" @click="load"
          >重新加载</el-button
        ></el-alert
      >
      <DataTable v-if="!error" :data="rows" :columns="columns" :loading="loading">
        <template #code="{ row }"
          ><el-button
            v-resource-element="el.values"
            class="dictionary-title"
            link
            type="primary"
            @click="openValues(row as Dictionary)"
            >{{ row.dict_type_code }}</el-button
          ></template
        >
        <template #name="{ row }"
          ><el-button
            v-resource-element="el.values"
            class="dictionary-title"
            link
            type="primary"
            @click="openValues(row as Dictionary)"
            >{{ row.dict_type_name }}</el-button
          ></template
        >
        <template #updated="{ row }">{{ row.updated_at || '未更新' }}</template>
        <template #status="{ row }"
          ><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{
            row.status === 'active' ? '启用' : '停用'
          }}</el-tag></template
        >
        <template #actions="{ row }"
          ><RowActionGrid>
            <el-button
              v-if="allowed('update')"
              v-resource-element="el.update"
              link
              type="primary"
              @click="openForm(row as Dictionary)"
              >编辑</el-button
            >
            <el-button
              v-if="row.status === 'active' && allowed('disable')"
              v-resource-element="el.disable"
              link
              type="warning"
              @click="askStatus(row as Dictionary, 'dictionary', 'disable')"
              >停用</el-button
            >
            <el-button
              v-if="row.status !== 'active' && allowed('enable')"
              v-resource-element="el.enable"
              link
              type="success"
              @click="askStatus(row as Dictionary, 'dictionary', 'enable')"
              >启用</el-button
            >
          </RowActionGrid></template
        >
      </DataTable>
      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :resource_element="el.query"
          :total="total"
          @change="load"
      /></template>
    </ListPageTemplate>

    <DetailDrawer
      :model-value="valuesVisible"
      :resource_element="el.values"
      title="字典值"
      :size="1040"
      @update:model-value="closeValues"
    >
      <template v-if="selected">
        <div class="dictionary-summary">
          <div>
            <h2>{{ selected.dict_type_name }}</h2>
            <p>{{ selected.dict_type_code }}</p>
          </div>
          <el-tag :type="selected.status === 'active' ? 'success' : 'info'">{{
            selected.status === 'active' ? '字典已启用' : '字典已停用'
          }}</el-tag>
        </div>
        <p v-if="selected.status === 'disabled'" class="dictionary-hint">
          父字典已停用，全部字典值均不可用于新业务；仍可查看和维护，启用单个值不会启用父字典。
        </p>
        <p v-if="selected.description" class="dictionary-description">{{ selected.description }}</p>
        <SearchPanel
          :resource_element="el.values"
          :loading="valuesLoading"
          @search="searchItems"
          @reset="resetItems"
        >
          <el-form
            class="dictionary-search-form"
            label-position="top"
            novalidate
            @submit.prevent="searchItems"
          >
            <el-form-item label="字典值关键词"
              ><el-input
                v-model="itemFilters.keyword"
                clearable
                placeholder="编码、名称或描述"
                @keyup.enter="searchItems"
            /></el-form-item>
            <el-form-item label="字典值状态"
              ><el-select
                v-model="itemFilters.status"
                placeholder="全部状态（含未设置）"
                :empty-values="[null, undefined]"
                ><el-option label="全部状态（含未设置）" value="" /><el-option
                  label="启用"
                  value="active" /><el-option label="停用" value="disabled" /></el-select
            ></el-form-item>
          </el-form>
          <template #footer-leading
            ><el-button
              v-if="allowed('createItem')"
              v-resource-element="el.createItem"
              type="primary"
              @click="openItem()"
              >新增字典值</el-button
            ></template
          >
        </SearchPanel>
      </template>
      <el-alert v-if="valuesError" :title="valuesError" type="error" show-icon :closable="false"
        ><el-button
          v-if="selected"
          v-resource-element="el.values"
          link
          type="primary"
          @click="loadItems"
          >重新加载字典值</el-button
        ><el-button
          v-else
          v-resource-element="el.query"
          link
          type="primary"
          @click="refreshMissingDictionary"
          >关闭并刷新字典列表</el-button
        ></el-alert
      >
      <section v-if="selected" class="surface dictionary-values">
        <TableToolbar
          title="字典值列表"
          :total="itemTotal"
          :refreshing="valuesLoading"
          :resource_element="el.values"
          @refresh="loadItems"
        />
        <DataTable
          v-if="!valuesError"
          :data="items"
          :columns="itemColumns"
          :loading="valuesLoading"
        >
          <template #status="{ row }"
            ><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{
              row.status === 'active' ? '启用' : row.status === 'disabled' ? '停用' : '未设置'
            }}</el-tag></template
          >
          <template #available="{ row }"
            ><span>{{ row.is_available ? '可用' : '不可用' }}</span></template
          >
          <template #json="{ row }"
            ><span class="dictionary-json" :title="JSON.stringify(row.ext_data)">{{
              JSON.stringify(row.ext_data)
            }}</span></template
          >
          <template #actions="{ row }"
            ><RowActionGrid>
              <el-button
                v-if="allowed('updateItem') && selected"
                v-resource-element="el.updateItem"
                link
                type="primary"
                @click="openItem(row as DictionaryItem)"
                >编辑</el-button
              >
              <el-button
                v-if="row.status === 'active' && allowed('disableItem') && selected"
                v-resource-element="el.disableItem"
                link
                type="warning"
                @click="askStatus(row as DictionaryItem, 'item', 'disable')"
                >停用</el-button
              >
              <el-button
                v-if="row.status !== 'active' && allowed('enableItem') && selected"
                v-resource-element="el.enableItem"
                link
                type="success"
                @click="askStatus(row as DictionaryItem, 'item', 'enable')"
                >启用</el-button
              >
            </RowActionGrid></template
          >
        </DataTable>
        <AppPagination
          v-model:page="itemPage"
          v-model:page-size="itemPageSize"
          :resource_element="el.values"
          :total="itemTotal"
          @change="loadItems"
        />
      </section>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :resource_element="editing ? el.update : el.create"
      :title="editing ? '编辑字典' : '新建字典'"
      :size="760"
      :dirty="formDirty"
      :submitting="formBusy"
      :confirm-disabled="unknownCreate"
      @confirm="saveDictionary"
    >
      <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon />
      <el-button
        v-if="unknownCreate && !editing"
        v-resource-element="el.query"
        :loading="formBusy"
        @click="verifyCreate"
        >核对创建结果</el-button
      >
      <p v-if="unknownCreate && editing" class="dictionary-hint">
        提交结果未知，已阻止重复保存。请关闭后刷新并核对。
      </p>
      <el-form
        label-position="top"
        novalidate
        class="dictionary-base-form"
        @submit.prevent="saveDictionary"
      >
        <el-form-item label="字典编码" required
          ><el-input
            v-model="form.code"
            :readonly="Boolean(editing)"
            maxlength="100"
            placeholder="稳定业务编码；创建后不可修改"
        /></el-form-item>
        <el-form-item label="字典名称" required
          ><el-input v-model="form.name" maxlength="100"
        /></el-form-item>
        <el-form-item label="描述" class="dictionary-form-wide"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="2000"
            show-word-limit
        /></el-form-item>
      </el-form>
      <template v-if="!editing">
        <div class="dictionary-section-title">
          <h3>
            初始字典值 <small>{{ form.initialItems.length }} / 200</small>
          </h3>
          <el-button
            v-resource-element="el.local"
            :disabled="form.initialItems.length >= 200"
            @click="openItem(undefined, -1)"
            >添加初始值</el-button
          >
        </div>
        <p class="dictionary-hint">可留空，或与字典一次性创建；任一值校验失败则全部不保存。</p>
        <el-empty v-if="!form.initialItems.length" description="尚未添加初始值" :image-size="60" />
        <div v-for="(item, index) in form.initialItems" :key="index" class="dictionary-initial-row">
          <span>{{ item.item_code }} · {{ item.item_name }}</span
          ><RowActionGrid
            ><el-button
              v-resource-element="el.local"
              link
              type="primary"
              @click="openItem(undefined, index)"
              >编辑初始值</el-button
            ><el-button
              v-resource-element="el.local"
              link
              type="danger"
              @click="
                form.initialItems = form.initialItems.filter((_, position) => position !== index)
              "
              >移除</el-button
            ></RowActionGrid
          >
        </div>
      </template>
      <p v-else class="dictionary-hint">
        字典编码创建后只读。修改字典值请返回字典值列表；两者版本独立。
      </p>
    </FormDrawer>

    <FormDrawer
      v-model="itemVisible"
      :resource_element="initialMode ? el.local : itemEditing ? el.updateItem : el.createItem"
      :title="initialMode ? '编辑初始字典值' : itemEditing ? '编辑字典值' : '新增字典值'"
      :size="650"
      :dirty="JSON.stringify(itemForm) !== itemSnapshot"
      :submitting="itemBusy"
      :confirm-disabled="itemUnknown"
      @confirm="saveItem"
    >
      <el-alert v-if="itemError" :title="itemError" type="error" show-icon :closable="false" />
      <p v-if="itemUnknown" class="dictionary-hint">
        提交结果未知，已阻止重复保存。关闭后刷新字典值列表核实。
      </p>
      <DictionaryItemFields v-model="itemForm" :code-readonly="Boolean(itemEditing)" />
    </FormDrawer>

    <FormDialog
      v-model="statusVisible"
      :resource_element="
        statusKind === 'dictionary'
          ? statusAction === 'enable'
            ? el.enable
            : el.disable
          : statusAction === 'enable'
            ? el.enableItem
            : el.disableItem
      "
      :title="statusTitle"
      :confirm-button-text="`确认${statusVerb}`"
      :confirm-type="statusAction === 'enable' ? 'primary' : 'warning'"
      :submitting="statusBusy"
      :confirm-disabled="statusUnknown"
      @confirm="confirmStatus"
    >
      <p>
        将{{ statusVerb }}
        <strong>{{ statusTarget?.dict_type_name || statusTarget?.item_name }}</strong
        >。
      </p>
      <p v-if="statusKind === 'dictionary' && statusAction === 'disable'">
        该字典由全平台共享。停用后全部字典值均不可用于新业务；不会删除数据、修改子值状态或版本，也不改写历史业务记录。之后可重新启用。
      </p>
      <p v-else-if="statusKind === 'dictionary'">
        启用后，自身为启用状态的字典值恢复可用；单独停用的字典值仍保持停用，不会批量启用子值。
      </p>
      <p v-else-if="statusAction === 'disable'">
        仅停用当前字典值，不修改父字典或其他值，不删除数据或改写历史业务记录。之后可重新启用。
      </p>
      <p v-else-if="selected?.status === 'disabled'">
        仅启用当前字典值。父字典仍停用，因此该值仍不可用于新业务；需另行启用父字典。
      </p>
      <p v-else>仅启用当前字典值，不修改父字典或其他值。</p>
      <p v-if="statusUnknown">提交结果未知，已阻止重复提交。请关闭后刷新相应列表核实。</p>
      <el-alert v-if="statusError" :title="statusError" type="error" :closable="false" />
    </FormDialog>
  </AppPage>
</template>

<style scoped>
.dictionary-search-form {
  display: contents;
}
.dictionary-title {
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: left;
  line-height: 1.5;
}
.dictionary-hint {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
.dictionary-summary,
.dictionary-section-title,
.dictionary-initial-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}
.dictionary-summary h2,
.dictionary-section-title h3 {
  margin: 0;
}
.dictionary-summary p {
  margin: var(--spacing-1) 0;
  color: var(--text-secondary);
}
.dictionary-description {
  overflow-wrap: anywhere;
}
.dictionary-values {
  margin-top: var(--spacing-3);
  overflow: hidden;
}
.dictionary-base-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-3);
  margin-top: var(--spacing-3);
}
.dictionary-form-wide {
  grid-column: 1 / -1;
}
.dictionary-section-title {
  margin-top: var(--spacing-3);
}
.dictionary-section-title small {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: normal;
}
.dictionary-initial-row {
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid var(--border-light);
}
.dictionary-json {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
