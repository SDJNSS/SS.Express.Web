<template>
  <page-container
    :title="isEdit ? '编辑资源' : '创建资源'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="resource-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">资源编码</label>
            <input
              v-model="formData.resourceCode"
              type="text"
              placeholder="请输入资源编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">资源名称</label>
            <input
              v-model="formData.resourceName"
              type="text"
              placeholder="请输入资源名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>上级资源</label>
            <select v-model.number="formData.parentId" class="form-select">
              <option :value="0">无上级（根资源）</option>
              <option
                v-for="resource in resourceList"
                :key="resource.id"
                :value="resource.id"
                :disabled="isEdit && resource.id === currentResourceId"
              >
                {{ getResourcePrefix(resource) }}{{ resource.resourceName }}
              </option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">资源类型</label>
            <select v-model="formData.resourceType" class="form-select" required>
              <option value="">请选择资源类型</option>
              <option value="menu">菜单</option>
              <option value="page">页面</option>
              <option value="button">按钮</option>
              <option value="api">API接口</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <div class="form-item">
            <label>是否可见</label>
            <select v-model="formData.isVisible" class="form-select">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">路由与权限</h3>
        <div class="form-row">
          <div class="form-item">
            <label>路由路径</label>
            <input
              v-model="formData.routePath"
              type="text"
              placeholder="请输入路由路径，如：/user/list"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>组件路径</label>
            <input
              v-model="formData.component"
              type="text"
              placeholder="请输入组件路径"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>权限编码</label>
            <input
              v-model="formData.permissionCode"
              type="text"
              placeholder="请输入权限编码，如：user:list"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>图标</label>
            <input
              v-model="formData.icon"
              type="text"
              placeholder="请输入图标"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>HTTP方法</label>
            <select v-model="formData.httpMethod" class="form-select">
              <option value="">请选择</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div class="form-item">
            <label>API路径</label>
            <input
              v-model="formData.apiPath"
              type="text"
              placeholder="请输入API路径"
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
              placeholder="请输入排序"
              class="form-input"
            />
          </div>
          <div class="form-item"></div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">其他信息</h3>
        <div class="form-row">
          <div class="form-item full-width">
            <label>备注</label>
            <textarea
              v-model="formData.remarks"
              placeholder="请输入备注"
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
        <button type="button" class="btn-submit" @click="handleSubmit">保存</button>
      </div>
    </template>
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createResource, updateResource, getResourceDetail, getResourceTree } from '@/api/iam/resource';
import { useAuthStore } from '@/stores/auth';
import type { Resource } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isEdit = ref(false);
const currentResourceId = ref<number>(0);
const resourceList = ref<Resource[]>([]);

interface ResourceFormData {
  tenantId: number;
  appId: number;
  parentId: number;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  routePath: string;
  component: string;
  permissionCode: string;
  icon: string;
  httpMethod: string;
  apiPath: string;
  isVisible: boolean;
  sortOrder: number;
  status: string;
  remarks: string;
}

const formData = reactive<ResourceFormData>({
  tenantId: authStore.tenantId || 0,
  appId: 0,
  parentId: 0,
  resourceCode: '',
  resourceName: '',
  resourceType: '',
  routePath: '',
  component: '',
  permissionCode: '',
  icon: '',
  httpMethod: '',
  apiPath: '',
  isVisible: true,
  sortOrder: 0,
  status: 'active',
  remarks: '',
});

// 扁平化资源树
const flattenResourceTree = (resources: Resource[], result: Resource[] = [], level: number = 0): Resource[] => {
  resources.forEach(resource => {
    result.push({ ...resource, level } as Resource & { level: number });
    if (resource.children && resource.children.length > 0) {
      flattenResourceTree(resource.children, result, level + 1);
    }
  });
  return result;
};

// 获取资源层级前缀
const getResourcePrefix = (resource: any): string => {
  const level = resource.level || 0;
  return '　'.repeat(level) + (level > 0 ? '└ ' : '');
};

const loadResourceTree = async () => {
  try {
    const tree = await getResourceTree(formData.tenantId);
    resourceList.value = flattenResourceTree(tree);
  } catch (error) {
    console.error('加载资源树失败:', error);
  }
};

const loadResourceDetail = async () => {
  try {
    const data = await getResourceDetail(currentResourceId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载资源详情失败:', error);
    alert('加载资源详情失败');
  }
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await updateResource(currentResourceId.value, formData);
      alert('更新成功');
    } else {
      await createResource(formData);
      alert('创建成功');
    }
    router.push('/resource');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(async () => {
  await loadResourceTree();

  if (route.params.id) {
    isEdit.value = true;
    currentResourceId.value = Number(route.params.id);
    await loadResourceDetail();
  }
});
</script>

<style scoped>
.resource-form {
  max-width: 1200px;
}

.form-section {
  background: #fff;
  padding: 24px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
  color: #262626;
}

.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
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
  font-size: 14px;
  color: #262626;
  margin-bottom: 8px;
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
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
  width: 100%;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.form-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-submit {
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #fff;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.btn-cancel:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.btn-submit {
  background: #1890ff;
  color: #fff;
}

.btn-submit:hover {
  background: #40a9ff;
}
</style>
