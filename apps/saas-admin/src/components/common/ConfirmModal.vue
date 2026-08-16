<template>
  <teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="handleCancel">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="handleCancel">×</button>
        </div>
        <div class="modal-body">
          <slot>{{ content }}</slot>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="handleCancel">{{ cancelText }}</button>
          <button class="btn btn-primary" :class="{ 'btn-danger': type === 'danger' }" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger';
  }>(),
  {
    title: '确认',
    confirmText: '确定',
    cancelText: '取消',
    type: 'default',
  }
);

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const handleConfirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  min-width: 400px;
  max-width: 600px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.modal-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  color: #8c8c8c;
  cursor: pointer;
  transition: color 0.3s;
}

.modal-close:hover {
  color: #262626;
}

.modal-body {
  padding: 24px;
  font-size: 14px;
  color: #595959;
  line-height: 1.5715;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
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

.btn-danger {
  background: #ff4d4f;
  border-color: #ff4d4f;
}

.btn-danger:hover {
  background: #ff7875;
  border-color: #ff7875;
}

.btn-default:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}
</style>
