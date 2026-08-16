<template>
  <page-container
    :title="isEdit ? '编辑用户' : '创建用户'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="user-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">用户名</label>
            <input
              v-model="formData.username"
              type="text"
              placeholder="请输入用户名"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item" v-if="!isEdit">
            <label class="required">密码</label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">真实姓名</label>
            <input
              v-model="formData.realName"
              type="text"
              placeholder="请输入真实姓名"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label>昵称</label>
            <input
              v-model="formData.nickName"
              type="text"
              placeholder="请输入昵称"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">用户类型</label>
            <select v-model="formData.userType" class="form-select" required>
              <option value="">请选择用户类型</option>
              <option value="platform_admin">平台管理员</option>
              <option value="tenant_admin">租户管理员</option>
              <option value="normal">普通用户</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
              <option value="locked">锁定</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">联系信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">手机号</label>
            <input
              v-model="formData.phone"
              type="tel"
              placeholder="请输入手机号"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">邮箱</label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="请输入邮箱"
              class="form-input"
              required
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">其他信息</h3>
        <div class="form-row">
          <div class="form-item full-width">
            <label>头像URL</label>
            <input
              v-model="formData.avatarUrl"
              type="text"
              placeholder="请输入头像URL"
              class="form-input"
            />
          </div>
        </div>

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
import { createUser, updateUser, getUserDetail } from '@/api/iam/user';
import type { User } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const userId = ref<number>(0);

interface UserFormData {
  username: string;
  password?: string;
  realName: string;
  nickName: string;
  phone: string;
  email: string;
  avatarUrl: string;
  userType: string;
  status: string;
  remarks: string;
}

const formData = reactive<UserFormData>({
  username: '',
  password: '',
  realName: '',
  nickName: '',
  phone: '',
  email: '',
  avatarUrl: '',
  userType: '',
  status: 'active',
  remarks: '',
});

const loadUserDetail = async () => {
  try {
    const data = await getUserDetail(userId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载用户详情失败:', error);
    alert('加载用户详情失败');
  }
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await updateUser(userId.value, formData);
      alert('更新成功');
    } else {
      await createUser(formData);
      alert('创建成功');
    }
    router.push('/user');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(() => {
  if (route.params.id) {
    isEdit.value = true;
    userId.value = Number(route.params.id);
    loadUserDetail();
  }
});
</script>

<style scoped>
.user-form {
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
