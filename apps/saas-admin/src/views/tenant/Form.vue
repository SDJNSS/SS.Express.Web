<template>
  <page-container
    :title="isEdit ? '编辑租户' : '创建租户'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="tenant-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">租户编码</label>
            <input
              v-model="formData.tenantCode"
              type="text"
              placeholder="请输入租户编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">租户名称</label>
            <input
              v-model="formData.tenantName"
              type="text"
              placeholder="请输入租户名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">租户类型</label>
            <select v-model="formData.tenantType" class="form-select" required>
              <option value="">请选择租户类型</option>
              <option value="enterprise">企业版</option>
              <option value="standard">标准版</option>
              <option value="trial">试用版</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="trial">试用</option>
              <option value="active">正式</option>
              <option value="frozen">冻结</option>
              <option value="expired">过期</option>
              <option value="cancelled">注销</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">企业信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label>企业名称</label>
            <input
              v-model="formData.companyName"
              type="text"
              placeholder="请输入企业名称"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>联系人</label>
            <input
              v-model="formData.contactName"
              type="text"
              placeholder="请输入联系人"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>联系电话</label>
            <input
              v-model="formData.contactPhone"
              type="tel"
              placeholder="请输入联系电话"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>联系邮箱</label>
            <input
              v-model="formData.contactEmail"
              type="email"
              placeholder="请输入联系邮箱"
              class="form-input"
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">系统配置</h3>
        <div class="form-row">
          <div class="form-item">
            <label>域名</label>
            <input
              v-model="formData.domain"
              type="text"
              placeholder="请输入域名"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>子域名</label>
            <input
              v-model="formData.subdomain"
              type="text"
              placeholder="请输入子域名"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">时区</label>
            <select v-model="formData.timezone" class="form-select" required>
              <option value="Asia/Shanghai">Asia/Shanghai (北京时间)</option>
              <option value="America/New_York">America/New_York (纽约时间)</option>
              <option value="Europe/London">Europe/London (伦敦时间)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (东京时间)</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">语言</label>
            <select v-model="formData.language" class="form-select" required>
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
              <option value="ja-JP">日本語</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>隔离模式</label>
            <select v-model="formData.isolationMode" class="form-select">
              <option value="">请选择隔离模式</option>
              <option value="shared">共享数据库</option>
              <option value="schema">独立 Schema</option>
              <option value="database">独立数据库</option>
            </select>
          </div>
          <div class="form-item">
            <label>Logo URL</label>
            <input
              v-model="formData.logoUrl"
              type="text"
              placeholder="请输入 Logo URL"
              class="form-input"
            />
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
import { createTenant, updateTenant, getTenantDetail } from '@/api/saas/tenant';
import type { Tenant } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const tenantId = ref<number>(0);

const formData = reactive<Partial<Tenant>>({
  tenantCode: '',
  tenantName: '',
  tenantType: '',
  status: 'trial',
  companyName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  domain: '',
  subdomain: '',
  logoUrl: '',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  isolationMode: 'shared',
  remarks: '',
});

// 加载租户详情
const loadTenantDetail = async () => {
  try {
    const response = await getTenantDetail(tenantId.value);
    Object.assign(formData, response.data);
  } catch (error) {
    console.error('加载租户详情失败:', error);
    alert('加载租户详情失败');
  }
};

// 提交表单
const handleSubmit = async () => {
  try {
    // 验证邮箱格式
    if (formData.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        alert('请输入正确的邮箱格式');
        return;
      }
    }

    // 验证域名唯一性（需要后端校验）
    if (isEdit.value) {
      await updateTenant(tenantId.value, formData);
      alert('修改成功');
    } else {
      await createTenant(formData);
      alert('创建成功');
    }
    router.push('/tenant');
  } catch (error: any) {
    console.error('保存失败:', error);
    alert(error.response?.data?.message || '保存失败');
  }
};

// 取消
const handleCancel = () => {
  router.back();
};

onMounted(() => {
  const id = route.params.id;
  if (id) {
    isEdit.value = true;
    tenantId.value = Number(id);
    loadTenantDetail();
  }
});
</script>

<style scoped>
.tenant-form {
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
