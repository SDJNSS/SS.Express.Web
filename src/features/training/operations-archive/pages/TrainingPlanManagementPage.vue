<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import { mapTrainingPlan } from '../adapters/trainingOperationsAdapter'
import { trainingApiErrorMessage, trainingOperationsApi } from '../api/trainingOperationsApi'
import TrainingPlanPageView from '../components/TrainingPlanPageView.vue'
import type { TrainingOperationsPreviewState, TrainingPlanFormValue, TrainingPlanRecord } from '../types/trainingOperations'

const router = useRouter()
const records = ref<TrainingPlanRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const currentQuery = ref<{ planYear?: number; keyword?: string; status?: string }>({})
const state = ref<TrainingOperationsPreviewState>('loading')
const submitting = ref(false)
const submissionVersion = ref(0)
let loadSequence = 0

const errorMessage = trainingApiErrorMessage
async function load(next?: { planYear?: number; keyword?: string; status?: string; pageIndex: number; pageSize: number }) {
  if (next) {
    currentQuery.value = {
      ...(next.planYear == null ? {} : { planYear: next.planYear }),
      ...(next.keyword ? { keyword: next.keyword } : {}),
      ...(next.status ? { status: next.status } : {}),
    }
    page.value = next.pageIndex
    pageSize.value = next.pageSize
  }
  const sequence = ++loadSequence
  state.value = 'loading'
  try {
    const response = await trainingOperationsApi.queryPlans({
      page_index: page.value,
      page_size: pageSize.value,
      ...(currentQuery.value.planYear == null ? {} : { plan_year: currentQuery.value.planYear }),
      ...(currentQuery.value.keyword ? { keyword: currentQuery.value.keyword } : {}),
      ...(currentQuery.value.status ? { status: currentQuery.value.status } : {}),
    })
    if (sequence !== loadSequence) return
    records.value = response.items.map(mapTrainingPlan)
    total.value = response.total
    state.value = response.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== loadSequence) return
    records.value = []
    total.value = 0
    state.value = 'retryable-error'
    notification.error(errorMessage(error, '培训计划加载失败'))
  }
}

async function save(value: TrainingPlanFormValue, record?: TrainingPlanRecord) {
  if (submitting.value) return
  if (value.planType === 'STANDING') {
    notification.warning('常设计划当前处于 Candidate 审核阶段，审核通过后再接入正式保存接口')
    return
  }
  if (value.year == null || !value.endAt || !value.frequency) {
    notification.error('年度计划的年度、结束日期与培训频率不能为空')
    return
  }
  submitting.value = true
  try {
    const payload = { plan_year: value.year, plan_name: value.name.trim(), start_at: value.startAt, end_at: value.endAt, frequency: value.frequency }
    if (record) await trainingOperationsApi.updatePlan({ id: record.id, updated_at: record.updatedAt, ...payload })
    else await trainingOperationsApi.createPlan(payload)
    notification.success(record ? '培训计划已保存' : '培训计划已创建')
    await load()
    submissionVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '培训计划保存失败'))
  } finally {
    submitting.value = false
  }
}

async function publish(record: TrainingPlanRecord) {
  try { await trainingOperationsApi.publishPlan({ id: record.id, updated_at: record.updatedAt }); notification.success('培训计划已发布'); await load() }
  catch (error) { notification.error(errorMessage(error, '培训计划发布失败')); throw error }
}
async function remove(record: TrainingPlanRecord) {
  try { await trainingOperationsApi.deletePlan({ id: record.id, updated_at: record.updatedAt }); notification.success('培训计划已删除'); await load() }
  catch (error) { notification.error(errorMessage(error, '培训计划删除失败')); throw error }
}
function openDetail(record: TrainingPlanRecord, section?: 'tasks' | 'employees') {
  void router.push({
    name: 'training-plan-detail',
    params: { planId: record.id },
    ...(section === 'employees' ? { query: { tab: 'employees' } } : {}),
  })
}

onMounted(load)
</script>

<template>
  <TrainingPlanPageView
    :plans="records"
    :state="state"
    :total="total"
    :page="page"
    :page-size="pageSize"
    :submitting="submitting"
    :submission-version="submissionVersion"
    @retry="load"
    @query="load"
    @open-detail="openDetail"
    @save="save"
    @publish="publish"
    @delete="remove"
  />
</template>
