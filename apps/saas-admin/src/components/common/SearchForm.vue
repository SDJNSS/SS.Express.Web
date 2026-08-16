<template>
  <div class="search-form">
    <form @submit.prevent="handleSearch">
      <div class="form-row">
        <div v-for="item in formItems" :key="item.prop" class="form-item">
          <label class="form-label">{{ item.label }}</label>
          <input
            v-if="item.type === 'input'"
            v-model="formData[item.prop]"
            type="text"
            :placeholder="item.placeholder || `请输入${item.label}`"
            class="form-input"
          />
          <select
            v-else-if="item.type === 'select'"
            v-model="formData[item.prop]"
            class="form-select"
          >
            <option value="">{{ item.placeholder || `请选择${item.label}` }}</option>
            <option v-for="opt in item.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input
            v-else-if="item.type === 'date'"
            v-model="formData[item.prop]"
            type="date"
            class="form-input"
          />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">查询</button>
        <button type="button" class="btn btn-default" @click="handleReset">重置</button>
        <slot name="extra"></slot>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SearchFormItem } from '@/types';

const props = defineProps<{
  formItems: SearchFormItem[];
  modelValue?: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
  (e: 'search', value: Record<string, any>): void;
  (e: 'reset'): void;
}>();

const formData = ref<Record<string, any>>({});

// 初始化表单数据
const initFormData = () => {
  const data: Record<string, any> = {};
  props.formItems.forEach((item) => {
    data[item.prop] = props.modelValue?.[item.prop] || '';
  });
  formData.value = data;
};

initFormData();

watch(
  () => props.modelValue,
  () => {
    initFormData();
  },
  { deep: true }
);

const handleSearch = () => {
  emit('update:modelValue', formData.value);
  emit('search', formData.value);
};

const handleReset = () => {
  const data: Record<string, any> = {};
  props.formItems.forEach((item) => {
    data[item.prop] = '';
  });
  formData.value = data;
  emit('update:modelValue', formData.value);
  emit('reset');
};
</script>

<style scoped>
.search-form {
  width: 100%;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  display: flex;
  align-items: center;
  min-width: 240px;
}

.form-label {
  flex-shrink: 0;
  margin-right: 8px;
  font-size: 14px;
  color: #262626;
  white-space: nowrap;
}

.form-input,
.form-select {
  flex: 1;
  height: 32px;
  padding: 4px 11px;
  font-size: 14px;
  line-height: 1.5715;
  color: #262626;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-input:hover,
.form-select:hover {
  border-color: #40a9ff;
}

.form-input:focus,
.form-select:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.btn {
  height: 32px;
  padding: 4px 15px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  color: #fff;
  background: #1890ff;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

.btn-default:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}
</style>
