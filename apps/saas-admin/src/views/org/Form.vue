<template>
  <page-container
    :title="isEdit ? '编辑组织' : '创建组织'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="org-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">组织编码</label>
            <input
              v-model="formData.orgCode"
              type="text"
              placeholder="请输入组织编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">组织名称</label>
            <input
              v-model="formData.orgName"
              type="text"
              placeholder="请输入组织名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>上级组织</label>
            <select v-model.number="formData.parentId" class="form-select">
              <option :value="0">无上级（根组织）</option>
              <option
                v-for="org in orgList"
                :key="org.id"
                :value="org.id"
                :disabled="isEdit && org.id === currentOrgId"
              >
                {{ getOrgPrefix(org.level) }}{{ org.orgName }}
              </option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">组织类型</label>
            <select v-model="formData.orgType" class="form-select" required>
              <option value="">请选择组织类型</option>
              <option value="company">公司</option>
              <option value="department">部门</option>
              <option value="group">小组</option>
              <option value="team">团队</option>
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createOrg, updateOrg, getOrgDetail, getOrgTree } from '@/api/iam/org';
import { useAuthStore } from '@/stores/auth';
import type { Org } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isEdit = ref(false);
const currentOrgId = ref<number>(0);
const orgList = ref<Org[]>([]);

interface OrgFormData {
  tenantId: number;
  parentId: number;
  orgCode: string;
  orgName: string;
  orgType: string;
  sortOrder: number;
  status: string;
  remarks: string;
}

const formData = reactive<OrgFormData>({
  tenantId: authStore.tenantId || 0,
  parentId: 0,
  orgCode: '',
  orgName: '',
  orgType: '',
  sortOrder: 0,
  status: 'active',
  remarks: '',
});

// 扁平化组织树
const flattenOrgTree = (orgs: Org[], result: Org[] = []): Org[] => {
  orgs.forEach(org => {
    result.push(org);
    if (org.children && org.children.length > 0) {
      flattenOrgTree(org.children, result);
    }
  });
  return result;
};

// 获取组织层级前缀
const getOrgPrefix = (level: number): string => {
  return '　'.repeat(level) + (level > 0 ? '└ ' : '');
};

const loadOrgTree = async () => {
  try {
    const tree = await getOrgTree(formData.tenantId);
    orgList.value = flattenOrgTree(tree);
  } catch (error) {
    console.error('加载组织树失败:', error);
  }
};

const loadOrgDetail = async () => {
  try {
    const data = await getOrgDetail(currentOrgId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载组织详情失败:', error);
    alert('加载组织详情失败');
  }
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await updateOrg(currentOrgId.value, formData);
      alert('更新成功');
    } else {
      await createOrg(formData);
      alert('创建成功');
    }
    router.push('/org');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(async () => {
  await loadOrgTree();

  if (route.params.id) {
    isEdit.value = true;
    currentOrgId.value = Number(route.params.id);
    await loadOrgDetail();
  }
});
</script>

<style scoped>
.org-form {
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
