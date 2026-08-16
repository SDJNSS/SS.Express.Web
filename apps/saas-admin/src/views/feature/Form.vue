<template>
  <page-container
    :title="isEdit ? '编辑功能' : '创建功能'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="feature-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">所属应用</label>
            <select v-model.number="formData.appId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择应用</option>
              <option v-for="app in appList" :key="app.id" :value="app.id">
                {{ app.appName }}
              </option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">功能编码</label>
            <input
              v-model="formData.featureCode"
              type="text"
              placeholder="请输入功能编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">功能名称</label>
            <input
              v-model="formData.featureName"
              type="text"
              placeholder="请输入功能名称"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label>上级功能</label>
            <select v-model.number="formData.parentId" class="form-select">
              <option :value="0">无上级（根功能）</option>
              <option
                v-for="feature in featureList"
                :key="feature.id"
                :value="feature.id"
                :disabled="isEdit && feature.id === currentFeatureId"
              >
                {{ getFeaturePrefix(feature) }}{{ feature.featureName }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">功能类型</label>
            <select v-model="formData.featureType" class="form-select" required>
              <option value="">请选择功能类型</option>
              <option value="module">模块</option>
              <option value="feature">功能</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
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
            <label>权限编码</label>
            <input
              v-model="formData.permissionCode"
              type="text"
              placeholder="请输入权限编码，如：user:list"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>是否可见</label>
            <select v-model="formData.isVisible" class="form-select">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
          </div>
          <div class="form-item">
            <label>排序</label>
            <input
              v-model.number="formData.sortOrder"
              type="number"
              placeholder="请输入排序"
              class="form-input"
            />
          </div>
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
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createFeature, updateFeature, getFeatureDetail, getFeatureTree } from '@/api/saas/feature';
import { getAppList } from '@/api/saas/app';
import type { Feature, App } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const currentFeatureId = ref<number>(0);
const appList = ref<App[]>([]);
const featureList = ref<Feature[]>([]);

interface FeatureFormData {
  appId: number;
  parentId: number;
  featureCode: string;
  featureName: string;
  featureType: 'module' | 'feature' | '';
  routePath: string;
  permissionCode: string;
  sortOrder: number;
  isVisible: boolean;
  status: string;
  remarks: string;
}

const formData = reactive<FeatureFormData>({
  appId: 0,
  parentId: 0,
  featureCode: '',
  featureName: '',
  featureType: '',
  routePath: '',
  permissionCode: '',
  sortOrder: 0,
  isVisible: true,
  status: 'active',
  remarks: '',
});

// 扁平化功能树
const flattenFeatureTree = (features: Feature[], result: Feature[] = [], level: number = 0): Feature[] => {
  features.forEach(feature => {
    result.push({ ...feature, level } as Feature & { level: number });
    if (feature.children && feature.children.length > 0) {
      flattenFeatureTree(feature.children, result, level + 1);
    }
  });
  return result;
};

// 获取功能层级前缀
const getFeaturePrefix = (feature: any): string => {
  const level = feature.level || 0;
  return '　'.repeat(level) + (level > 0 ? '└ ' : '');
};

const loadAppList = async () => {
  try {
    const result = await getAppList({ pageNum: 1, pageSize: 100 });
    appList.value = result.records || [];
  } catch (error) {
    console.error('加载应用列表失败:', error);
  }
};

const loadFeatureTree = async (appId: number) => {
  if (!appId) {
    featureList.value = [];
    return;
  }
  try {
    const tree = await getFeatureTree(appId);
    featureList.value = flattenFeatureTree(tree);
  } catch (error) {
    console.error('加载功能树失败:', error);
  }
};

const loadFeatureDetail = async () => {
  try {
    const data = await getFeatureDetail(currentFeatureId.value);
    Object.assign(formData, data);
    // 加载对应应用的功能树
    if (formData.appId) {
      await loadFeatureTree(formData.appId);
    }
  } catch (error) {
    console.error('加载功能详情失败:', error);
    alert('加载功能详情失败');
  }
};

const handleSubmit = async () => {
  if (!formData.appId) {
    alert('请选择应用');
    return;
  }

  try {
    if (isEdit.value) {
      await updateFeature(currentFeatureId.value, formData);
      alert('更新成功');
    } else {
      await createFeature(formData);
      alert('创建成功');
    }
    router.push('/feature');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

// 监听应用变化，重新加载功能树
watch(() => formData.appId, (newAppId) => {
  if (newAppId) {
    loadFeatureTree(newAppId);
    // 切换应用时清空上级功能
    if (!isEdit.value) {
      formData.parentId = 0;
    }
  }
});

onMounted(async () => {
  await loadAppList();

  if (route.params.id) {
    isEdit.value = true;
    currentFeatureId.value = Number(route.params.id);
    await loadFeatureDetail();
  }
});
</script>

<style scoped>
.feature-form {
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

.form-input:disabled,
.form-select:disabled {
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
