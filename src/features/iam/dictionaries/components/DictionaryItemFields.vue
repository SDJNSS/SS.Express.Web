<script setup lang="ts">
import type { ItemForm } from '../adapters/dictionaryForms'
const form = defineModel<ItemForm>({ required: true })
defineProps<{ codeReadonly: boolean }>()
</script>

<template>
  <el-form label-position="top" class="dictionary-form" novalidate>
    <el-form-item label="字典值编码" required>
      <el-input
        v-model="form.item_code"
        :readonly="codeReadonly"
        maxlength="100"
        placeholder="稳定业务编码；创建后不可修改"
      />
    </el-form-item>
    <el-form-item label="字典值名称" required
      ><el-input v-model="form.item_name" maxlength="100"
    /></el-form-item>
    <el-form-item label="排序"
      ><el-input-number
        v-model="form.sort_no"
        :min="0"
        :max="2147483647"
        :precision="0"
        controls-position="right"
    /></el-form-item>
    <el-form-item label="状态" required>
      <el-select v-model="form.status" placeholder="请选择状态">
        <el-option label="启用" value="active" /><el-option label="停用" value="disabled" />
      </el-select>
    </el-form-item>
    <el-form-item label="颜色或标签"
      ><el-input v-model="form.item_color" maxlength="30" placeholder="可填写颜色值或简短标签"
    /></el-form-item>
    <el-form-item label="描述" class="dictionary-form__wide"
      ><el-input
        v-model="form.description"
        type="textarea"
        :rows="3"
        maxlength="2000"
        show-word-limit
    /></el-form-item>
    <el-form-item label="扩展数据（JSON，可选）" class="dictionary-form__wide">
      <el-input
        v-model="form.json"
        type="textarea"
        :rows="5"
        placeholder="支持对象、数组、字符串、数值、布尔值或 null；最多 16 KiB"
      />
    </el-form-item>
  </el-form>
</template>

<style scoped>
.dictionary-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-3);
}
.dictionary-form__wide {
  grid-column: 1 / -1;
}
.dictionary-form :deep(.el-select),
.dictionary-form :deep(.el-input-number) {
  width: 100%;
}
</style>
