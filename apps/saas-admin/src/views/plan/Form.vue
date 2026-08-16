<template>
  <page-container
    :title="isEdit ? '编辑套餐' : '创建套餐'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="plan-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">套餐编码</label>
            <input
              v-model="formData.planCode"
              type="text"
              placeholder="请输入套餐编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">套餐名称</label>
            <input
              v-model="formData.planName"
              type="text"
              placeholder="请输入套餐名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">套餐类型</label>
            <select v-model="formData.planType" class="form-select" required>
              <option value="">请选择套餐类型</option>
              <option value="free">免费版</option>
              <option value="basic">基础版</option>
              <option value="standard">标准版</option>
              <option value="professional">专业版</option>
              <option value="enterprise">企业版</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">上架</option>
              <option value="inactive">下架</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">计费信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">计费周期</label>
            <select v-model="formData.billingCycle" class="form-select" required>
              <option value="">请选择计费周期</option>
              <option value="monthly">月付</option>
              <option value="quarterly">季付</option>
              <option value="annually">年付</option>
              <option value="lifetime">永久</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">价格</label>
            <input
              v-model.number="formData.price"
              type="number"
              step="0.01"
              placeholder="请输入价格"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">货币</label>
            <select v-model="formData.currency" class="form-select" required>
              <option value="">请选择货币</option>
              <option value="CNY">人民币 (CNY)</option>
              <option value="USD">美元 (USD)</option>
              <option value="EUR">欧元 (EUR)</option>
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
import { createPlan, updatePlan, getPlanDetail } from '@/api/saas/plan';
import type { Plan } from '@/types';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const planId = ref<number>(0);

interface PlanFormData {
  planCode: string;
  planName: string;
  planType: string;
  billingCycle: string;
  price: number;
  currency: string;
  sortOrder: number;
  status: string;
  remarks: string;
}

const formData = reactive<PlanFormData>({
  planCode: '',
  planName: '',
  planType: '',
  billingCycle: '',
  price: 0,
  currency: 'CNY',
  sortOrder: 0,
  status: 'active',
  remarks: '',
});

const loadPlanDetail = async () => {
  try {
    const data = await getPlanDetail(planId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载套餐详情失败:', error);
    alert('加载套餐详情失败');
  }
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await updatePlan(planId.value, formData);
      alert('更新成功');
    } else {
      await createPlan(formData);
      alert('创建成功');
    }
    router.push('/plan');
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
    planId.value = Number(route.params.id);
    loadPlanDetail();
  }
});
</script>

<style scoped>
.plan-form {
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
