<template>
  <page-container
    :title="isEdit ? '编辑订阅' : '创建订阅'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="subscription-form" @submit.prevent="handleSubmit">
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
            <label class="required">套餐</label>
            <select v-model.number="formData.planId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择套餐</option>
              <option v-for="plan in planList" :key="plan.id" :value="plan.id">
                {{ plan.planName }} ({{ plan.planType }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">订阅编码</label>
            <input
              v-model="formData.subscriptionCode"
              type="text"
              placeholder="请输入订阅编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">订阅状态</label>
            <select v-model="formData.subscriptionStatus" class="form-select" required>
              <option value="">请选择订阅状态</option>
              <option value="active">生效中</option>
              <option value="pending">待生效</option>
              <option value="expired">已过期</option>
              <option value="cancelled">已取消</option>
              <option value="frozen">已冻结</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">订阅周期</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">开始时间</label>
            <input
              v-model="formData.startAt"
              type="datetime-local"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">结束时间</label>
            <input
              v-model="formData.endAt"
              type="datetime-local"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>自动续费</label>
            <select v-model="formData.autoRenew" class="form-select">
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
import { createSubscription, updateSubscription, getSubscriptionDetail } from '@/api/saas/subscription';
import { getTenantList } from '@/api/saas/tenant';
import { getPlanList } from '@/api/saas/plan';
import type { Subscription, Tenant, Plan } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const subscriptionId = ref<number>(0);
const tenantList = ref<Tenant[]>([]);
const planList = ref<Plan[]>([]);

interface SubscriptionFormData {
  tenantId: number;
  planId: number;
  subscriptionCode: string;
  subscriptionStatus: string;
  startAt: string;
  endAt: string;
  autoRenew: boolean;
  remarks: string;
}

const formData = reactive<SubscriptionFormData>({
  tenantId: 0,
  planId: 0,
  subscriptionCode: '',
  subscriptionStatus: 'active',
  startAt: '',
  endAt: '',
  autoRenew: false,
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

const loadPlanList = async () => {
  try {
    const result = await getPlanList({ pageNum: 1, pageSize: 100 });
    planList.value = result.records || [];
  } catch (error) {
    console.error('加载套餐列表失败:', error);
  }
};

const loadSubscriptionDetail = async () => {
  try {
    const data = await getSubscriptionDetail(subscriptionId.value);
    Object.assign(formData, {
      ...data,
      startAt: formatDateTimeForInput(data.startAt),
      endAt: formatDateTimeForInput(data.endAt),
    });
  } catch (error) {
    console.error('加载订阅详情失败:', error);
    alert('加载订阅详情失败');
  }
};

// 格式化日期时间为 input[type="datetime-local"] 所需格式
const formatDateTimeForInput = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const handleSubmit = async () => {
  if (!formData.tenantId) {
    alert('请选择租户');
    return;
  }
  if (!formData.planId) {
    alert('请选择套餐');
    return;
  }

  try {
    // 转换日期时间格式
    const submitData = {
      ...formData,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : '',
      endAt: formData.endAt ? new Date(formData.endAt).toISOString() : '',
    };

    if (isEdit.value) {
      await updateSubscription(subscriptionId.value, submitData);
      alert('更新成功');
    } else {
      await createSubscription(submitData);
      alert('创建成功');
    }
    router.push('/subscription');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(async () => {
  await Promise.all([loadTenantList(), loadPlanList()]);

  if (route.params.id) {
    isEdit.value = true;
    subscriptionId.value = Number(route.params.id);
    await loadSubscriptionDetail();
  } else {
    // 新建时设置默认时间
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    formData.startAt = formatDateTimeForInput(now.toISOString());
    formData.endAt = formatDateTimeForInput(oneYearLater.toISOString());
  }
});
</script>

<style scoped>
.subscription-form {
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
