<template>
  <page-container
    :title="isEdit ? '编辑应用' : '创建应用'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="app-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">应用编码</label>
            <input
              v-model="formData.appCode"
              type="text"
              placeholder="请输入应用编码（大写字母、数字、下划线）"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">应用名称</label>
            <input
              v-model="formData.appName"
              type="text"
              placeholder="请输入应用名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">应用类型</label>
            <select v-model="formData.appType" class="form-select" required>
              <option value="">请选择应用类型</option>
              <option value="web">Web应用</option>
              <option value="mobile">移动应用</option>
              <option value="api">API服务</option>
            </select>
          </div>
          <div class="form-item">
            <label>应用版本</label>
            <input
              v-model="formData.appVersion"
              type="text"
              placeholder="请输入应用版本，如：1.0.0"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>图标</label>
            <input
              v-model="formData.icon"
              type="text"
              placeholder="请输入图标URL或图标代码"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>入口路由</label>
            <input
              v-model="formData.routePath"
              type="text"
              placeholder="请输入路由路径，如：/wms"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>排序</label>
            <input
              v-model.number="formData.sortOrder"
              type="number"
              placeholder="请输入排序号，数字越小越靠前"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">备注</h3>
        <div class="form-row">
          <div class="form-item full-width">
            <textarea
              v-model="formData.remarks"
              placeholder="请输入备注信息"
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-default" @click="handleCancel">取消</button>
      <button type="button" class="btn btn-primary" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </template>
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createApp, updateApp, getAppDetail } from '@/api/saas/app';
import type { App } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const appId = ref<number>(0);

const formData = reactive<Partial<App>>({
  appCode: '',
  appName: '',
  appType: '',
  appVersion: '',
  icon: '',
  routePath: '',
  sortOrder: 0,
  status: 'active',
  remarks: '',
});

const loadAppDetail = async () => {
  try {
    const response = await getAppDetail(appId.value);
    Object.assign(formData, response.data);
  } catch (error) {
    console.error('加载应用详情失败:', error);
    alert('加载应用详情失败');
  }
};

const handleSubmit = async () => {
  try {
    // 验证 appCode 格式
    if (formData.appCode && !/^[A-Z0-9_]+$/.test(formData.appCode)) {
      alert('应用编码只能包含大写字母、数字和下划线');
      return;
    }

    if (isEdit.value) {
      await updateApp(appId.value, formData);
      alert('修改成功');
    } else {
      await createApp(formData);
      alert('创建成功');
    }
    router.push('/app');
  } catch (error: any) {
    console.error('保存失败:', error);
    alert(error.response?.data?.message || '保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(() => {
  const id = route.params.id;
  if (id) {
    isEdit.value = true;
    appId.value = Number(id);
    loadAppDetail();
  }
});
</script>

<style scoped>
.app-form {
  max-width: 1000px;
}

.form-section {
  margin-bottom: 32px;
  padding: 24px;
  background: #fafafa;
  border-radius: 4px;
}

.section-title {
  margin: 0 0 24px 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-item.full-width {
  flex: 1 1 100%;
}

.form-item label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.form-item label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5715;
  color: #262626;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-input:hover,
.form-select:hover,
.form-textarea:hover {
  border-color: #40a9ff;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: rgba(0, 0, 0, 0.25);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
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
