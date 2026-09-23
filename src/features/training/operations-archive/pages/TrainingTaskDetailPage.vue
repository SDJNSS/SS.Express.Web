<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DetailDrawer from '@shared/components/DetailDrawer.vue'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { notification } from '@shared/services/notification'
import { mapTaskCourse, mapTaskEmployee, mapTaskExam, mapTrainingTask } from '../adapters/trainingOperationsAdapter'
import { currentTrainingTenantId, trainingApiErrorMessage, trainingOperationsApi, type TrainingCourseOptionDto, type TrainingExamOptionDto } from '../api/trainingOperationsApi'
import TrainingTaskDetailPageView from '../components/TrainingTaskDetailPageView.vue'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  PersonnelDrilldownContext,
  TaskCourseStatisticsRecord,
  TaskEmployeeRecord,
  TaskExamStatisticsRecord,
  TrainingOperationsPreviewState,
  TrainingTaskRecord,
} from '../types/trainingOperations'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const task = ref<TrainingTaskRecord>()
const courses = ref<TaskCourseStatisticsRecord[]>([])
const exams = ref<TaskExamStatisticsRecord[]>([])
const employees = ref<TaskEmployeeRecord[]>([])
const drilldownEmployees = ref<TaskEmployeeRecord[]>([])
const courseOptions = ref<Array<{ id: number; label: string }>>([])
const examOptions = ref<Array<{ id: number; label: string }>>([])
const state = ref<TrainingOperationsPreviewState>('loading')
const personnelLoading = ref(false)
const drilldownLoading = ref(false)
const employeeTotal = ref(0)
const employeePage = ref(1)
const employeePageSize = ref(20)
const drilldownTotal = ref(0)
const drilldownPage = ref(1)
const drilldownPageSize = ref(20)
const employeeQuery = ref({ employeeName: '', trainingStatus: '', courseLearningStatus: '', examStatus: '' })
const drilldownContext = ref<PersonnelDrilldownContext>()
const detailVisible = ref(false)
const detailKind = ref<'course' | 'exam'>('course')
const courseDetail = ref<TrainingCourseOptionDto>()
const examDetail = ref<TrainingExamOptionDto>()
const updateSubmitting = ref(false)
const updateSubmissionVersion = ref(0)
let loadSequence = 0
let employeeSequence = 0
let drilldownSequence = 0
let courseOptionSequence = 0
let examOptionSequence = 0

const taskId = computed(() => Number(route.params.taskId))
const planId = computed(() => Number(route.params.planId))
const canViewCourseDetails = computed(() => hasPermission(TRAINING_PERMISSIONS.courses.view))
const canViewExamDetails = computed(() => hasPermission(TRAINING_PERMISSIONS.exams.view))
const canEditTask = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.update) && canViewCourseDetails.value && canViewExamDetails.value)
const canViewTaskEmployees = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.queryEmployees))

const tenantId = currentTrainingTenantId
const errorMessage = trainingApiErrorMessage

async function queryEmployees(value: { employeeName: string; trainingStatus: string; courseLearningStatus: string; examStatus: string; pageIndex: number; pageSize: number }) {
  if (!canViewTaskEmployees.value) return
  employeeQuery.value = {
    employeeName: value.employeeName,
    trainingStatus: value.trainingStatus,
    courseLearningStatus: value.courseLearningStatus,
    examStatus: value.examStatus,
  }
  employeePage.value = value.pageIndex
  employeePageSize.value = value.pageSize
  const sequence = ++employeeSequence
  const tenantAtStart = tenantId()
  personnelLoading.value = true
  try {
    const response = await trainingOperationsApi.queryTaskEmployees({
      training_task_id: taskId.value,
      page_index: value.pageIndex,
      page_size: value.pageSize,
      ...(value.employeeName.trim() ? { employee_name: value.employeeName.trim() } : {}),
      ...(value.trainingStatus ? { training_status: value.trainingStatus } : {}),
      ...(value.courseLearningStatus ? { course_learning_status: value.courseLearningStatus } : {}),
      ...(value.examStatus ? { exam_status: value.examStatus } : {}),
    })
    if (sequence !== employeeSequence || tenantAtStart !== tenantId()) return
    employees.value = response.employees.items.map(mapTaskEmployee)
    employeeTotal.value = response.employees.total
  } catch (error) {
    if (sequence === employeeSequence) notification.error(errorMessage(error, '任务员工加载失败'))
  } finally {
    if (sequence === employeeSequence) personnelLoading.value = false
  }
}

async function load() {
  if (!Number.isFinite(taskId.value) || taskId.value <= 0 || !Number.isFinite(planId.value) || planId.value <= 0) {
    state.value = 'empty'
    return
  }
  const sequence = ++loadSequence
  const tenantAtStart = tenantId()
  state.value = 'loading'
  try {
    const detail = await trainingOperationsApi.getTask(taskId.value)
    if (sequence !== loadSequence || tenantAtStart !== tenantId()) return
    if (detail.training_id !== planId.value) {
      state.value = 'empty'
      return
    }
    task.value = mapTrainingTask(detail)
    courses.value = detail.courses.map(mapTaskCourse)
    exams.value = detail.exams.map(mapTaskExam)
    courseOptions.value = detail.courses.map((item) => ({ id: item.course_id, label: `${item.course_name}${item.course_disabled ? ' · 已停用' : ''}` }))
    examOptions.value = detail.exams.map((item) => ({ id: item.exam_id, label: `${item.exam_name}${item.exam_disabled ? ' · 已停用' : ''}` }))
    state.value = 'ready'
    if (canViewTaskEmployees.value) await queryEmployees({ ...employeeQuery.value, pageIndex: 1, pageSize: employeePageSize.value })
  } catch (error) {
    if (sequence !== loadSequence || tenantAtStart !== tenantId()) return
    task.value = undefined
    courses.value = []
    exams.value = []
    state.value = 'retryable-error'
    notification.error(errorMessage(error, '培训任务详情加载失败'))
  }
}

async function loadTaskOptions() {
  await Promise.all([searchCourses(''), searchExams('')])
}

async function searchCourses(keyword: string) {
  const sequence = ++courseOptionSequence
  const tenantAtStart = tenantId()
  try {
    const activeCourses = await trainingOperationsApi.queryCourses({ page_index: 1, page_size: 50, status: 'ACTIVE', ...(keyword.trim() ? { keyword: keyword.trim() } : {}) })
    if (sequence !== courseOptionSequence || tenantAtStart !== tenantId()) return
    const currentCourses = courses.value.map((item) => ({ id: item.courseId, label: `${item.name}${item.status !== 'ACTIVE' ? ' · 已停用' : ''}` }))
    courseOptions.value = [...activeCourses.items.map((item) => ({ id: item.id, label: `${item.course_name} · ${item.training_type}` })), ...currentCourses]
      .filter((item, index, values) => values.findIndex((candidate) => candidate.id === item.id) === index)
  } catch (error) {
    notification.error(errorMessage(error, '课程候选加载失败，当前任务详情仍可查看'))
  }
}

async function searchExams(keyword: string) {
  const sequence = ++examOptionSequence
  const tenantAtStart = tenantId()
  try {
    const activeExams = await trainingOperationsApi.queryExams({ page_index: 1, page_size: 50, status: 'ACTIVE', ...(keyword.trim() ? { keyword: keyword.trim() } : {}) })
    if (sequence !== examOptionSequence || tenantAtStart !== tenantId()) return
    const currentExams = exams.value.map((item) => ({ id: item.examId, label: `${item.name}${item.status !== 'ACTIVE' ? ' · 已停用' : ''}` }))
    examOptions.value = [...activeExams.items.map((item) => ({ id: item.id, label: item.exam_name })), ...currentExams]
      .filter((item, index, values) => values.findIndex((candidate) => candidate.id === item.id) === index)
  } catch (error) {
    notification.error(errorMessage(error, '考试候选加载失败，当前任务详情仍可查看'))
  }
}

async function drilldown(context: PersonnelDrilldownContext, pageIndex: number, pageSize: number) {
  if (!canViewTaskEmployees.value) return
  drilldownContext.value = context
  drilldownPage.value = pageIndex
  drilldownPageSize.value = pageSize
  const sequence = ++drilldownSequence
  const tenantAtStart = tenantId()
  drilldownLoading.value = true
  try {
    const response = await trainingOperationsApi.queryTaskEmployees({
      training_task_id: taskId.value,
      page_index: pageIndex,
      page_size: pageSize,
      ...(context.courseId == null ? {} : { course_id: context.courseId }),
      ...(context.courseStatus ? { course_learning_status: context.courseStatus } : {}),
      ...(context.examId == null ? {} : { exam_id: context.examId }),
      ...(context.examStatus ? { exam_status: context.examStatus } : {}),
    })
    if (sequence !== drilldownSequence || tenantAtStart !== tenantId()) return
    drilldownEmployees.value = response.employees.items.map(mapTaskEmployee)
    drilldownTotal.value = response.employees.total
  } catch (error) {
    if (sequence === drilldownSequence) notification.error(errorMessage(error, '人员明细加载失败'))
  } finally {
    if (sequence === drilldownSequence) drilldownLoading.value = false
  }
}

async function updateTask(value: { name: string; taskType: TrainingTaskRecord['taskType']; periodKey: string; startAt: string; endAt: string; courseIds: number[]; examId: number }) {
  if (!task.value?.updatedAt) return
  if (updateSubmitting.value) return
  updateSubmitting.value = true
  try {
    await trainingOperationsApi.updateTask({
      id: task.value.id,
      updated_at: task.value.updatedAt,
      task_name: value.name,
      task_type: value.taskType,
      period_key: value.periodKey,
      start_at: value.startAt,
      deadline_at: value.endAt,
      exam_id: value.examId,
      courses: value.courseIds.map((courseId, index) => ({ course_id: courseId, sort_order: index + 1 })),
    })
    notification.success('培训任务已保存')
    await load()
    updateSubmissionVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '培训任务保存失败'))
  } finally {
    updateSubmitting.value = false
  }
}

async function startTask() {
  if (!task.value?.updatedAt) return
  try {
    await trainingOperationsApi.startTask({ id: task.value.id, updated_at: task.value.updatedAt })
    notification.success('培训任务已启动')
    await load()
  } catch (error) { notification.error(errorMessage(error, '启动培训任务失败')) }
}

async function deleteTask() {
  if (!task.value?.updatedAt) return
  try {
    await trainingOperationsApi.deleteTask({ id: task.value.id, updated_at: task.value.updatedAt })
    notification.success('培训任务已删除')
    await router.replace({ name: 'training-plan-detail', params: { planId: planId.value } })
  } catch (error) { notification.error(errorMessage(error, '删除培训任务失败')) }
}

async function openCourse(courseId: number) {
  try {
    courseDetail.value = await trainingOperationsApi.getCourse(courseId)
    detailKind.value = 'course'
    detailVisible.value = true
  } catch (error) { notification.error(errorMessage(error, '课程详情加载失败')) }
}
async function openExam(examId: number) {
  try {
    examDetail.value = await trainingOperationsApi.getExam(examId)
    detailKind.value = 'exam'
    detailVisible.value = true
  } catch (error) { notification.error(errorMessage(error, '考试详情加载失败')) }
}

watch([planId, taskId], () => { void load() })
onMounted(load)
</script>

<template>
  <TrainingTaskDetailPageView
    :task="task"
    :courses="courses"
    :exams="exams"
    :employees="employees"
    :state="state"
    :employee-total="employeeTotal"
    :employee-page="employeePage"
    :employee-page-size="employeePageSize"
    :personnel-loading="personnelLoading"
    :drilldown-loading="drilldownLoading"
    :drilldown-employees="drilldownEmployees"
    :drilldown-total="drilldownTotal"
    :drilldown-page="drilldownPage"
    :drilldown-page-size="drilldownPageSize"
    :course-options="courseOptions"
    :exam-options="examOptions"
    :update-submitting="updateSubmitting"
    :update-submission-version="updateSubmissionVersion"
    :can-view-course-details="canViewCourseDetails"
    :can-view-exam-details="canViewExamDetails"
    :can-edit-task="canEditTask"
    :can-view-employees="canViewTaskEmployees"
    @back="router.push({ name: 'training-plan-detail', params: { planId } })"
    @retry="load"
    @query-employees="queryEmployees"
    @drilldown="drilldown"
    @open-course="openCourse"
    @open-exam="openExam"
    @update-task="updateTask"
    @load-task-options="loadTaskOptions"
    @search-courses="searchCourses"
    @search-exams="searchExams"
    @start-task="startTask"
    @delete-task="deleteTask"
  />

  <DetailDrawer v-model="detailVisible" :title="detailKind === 'course' ? '课程详情' : '考试详情'" :size="720">
    <el-descriptions v-if="detailKind === 'course' && courseDetail" :column="2" border>
      <el-descriptions-item label="课程名称">{{ courseDetail.course_name }}</el-descriptions-item>
      <el-descriptions-item label="课程类型">{{ courseDetail.training_type }}</el-descriptions-item>
      <el-descriptions-item label="计划学习时长">{{ Math.round(courseDetail.planned_learning_seconds / 60) }} 分钟</el-descriptions-item>
      <el-descriptions-item label="状态">{{ courseDetail.status }}</el-descriptions-item>
      <el-descriptions-item label="课程简介" :span="2">{{ courseDetail.introduction || '暂无简介' }}</el-descriptions-item>
    </el-descriptions>
    <el-descriptions v-else-if="examDetail" :column="2" border>
      <el-descriptions-item label="考试名称">{{ examDetail.exam_name }}</el-descriptions-item>
      <el-descriptions-item label="试卷">{{ examDetail.paper_name }}</el-descriptions-item>
      <el-descriptions-item label="考试时长">{{ Math.round(examDetail.duration_seconds / 60) }} 分钟</el-descriptions-item>
      <el-descriptions-item label="通过分数">{{ examDetail.pass_score }}</el-descriptions-item>
      <el-descriptions-item label="最大次数">{{ examDetail.max_attempts }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ examDetail.status }}</el-descriptions-item>
    </el-descriptions>
  </DetailDrawer>
</template>
