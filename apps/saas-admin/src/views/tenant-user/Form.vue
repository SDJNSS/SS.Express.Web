<template>
  <page-container
    :title="isEdit ? '编辑租户用户' : '绑定租户用户'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="tenant-user-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">租户</label>
            <select v-model.number="formData.tenantId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择租户</option>
              <option v-for="tenant in tenantList" :key="tenant.id" :value="tenant.id">
                {{ tenant.tenantName }}
              </option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">用户</label>
            <select v-model.number="formData.userId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择用户</option>
              <option v-for="user in userList" :key="user.id" :value="user.id">
                {{ user.realName }} ({{ user.username }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>租户用户编码</label>
            <input
              v-model="formData.tenantUserCode"
              type="text"
              placeholder="请输入租户用户编码（可留空自动生成）"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label class="required">显示名称</label>
            <input
              v-model="formData.displayName"
              type="text"
              placeholder="请输入显示名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">用户类型</label>
            <select v-model="formData.userType" class="form-select" required>
              <option value="">请选择用户类型</option>
              <option value="owner">所有者</option>
              <option value="admin">管理员</option>
              <option value="member">成员</option>
              <option value="guest">访客</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">正常</option>
              <option value="inactive">停用</option>
              <option value="left">已离开</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>是否租户管理员</label>
            <select v-model="formData.isTenantAdmin" class="form-select">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createTenantUser, updateTenantUser, getTenantUserDetail } from '@/api/iam/tenant-user';
import { getTenantList } from '@/api/saas/tenant';
import { getUserList } from '@/api/iam/user';
import type { TenantUser, Tenant, User } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const tenantUserId = ref<number>(0);
const tenantList = ref<Tenant[]>([]);
const userList = ref<User[]>([]);

interface TenantUserFormData {
  tenantId: number;
  userId: number;
  tenantUserCode: string;
  displayName: string;
  userType: string;
  status: string;
  isTenantAdmin: boolean;
  remarks: string;
}

const formData = reactive<TenantUserFormData>({
  tenantId: 0,
  userId: 0,
  tenantUserCode: '',
  displayName: '',
  userType: '',
  status: 'active',
  isTenantAdmin: false,
  remarks: '',
});

const loadTenantList = async () => {
  try {
    const result = await getTenantList({ pageNum: 1, pageSize: 100 });
    tenantList.value = result.records || [];
  } catch (error) {
    console.error('加载租户列表失败:', error);
  }
};

const loadUserList = async () => {
  try {
    const result = await getUserList({ pageNum: 1, pageSize: 100 });
    userList.value = result.records || [];
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
};

const loadTenantUserDetail = async () => {
  try {
    const data = await getTenantUserDetail(tenantUserId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载租户用户详情失败:', error);
    alert('加载租户用户详情失败');
  }
};

const handleSubmit = async () => {
  if (!formData.tenantId) {
    alert('请选择租户');
    return;
  }
  if (!formData.userId) {
    alert('请选择用户');
    return;
  }

  try {
    if (isEdit.value) {
      await updateTenantUser(tenantUserId.value, formData);
      alert('更新成功');
    } else {
      await createTenantUser(formData);
      alert('绑定成功');
    }
    router.push('/tenant-user');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(async () => {
  await Promise.all([loadTenantList(), loadUserList()]);

  if (route.params.id) {
    isEdit.value = true;
    tenantUserId.value = Number(route.params.id);
    await loadTenantUserDetail();
  }
});
</script>

<style scoped>
.tenant-user-form {
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
