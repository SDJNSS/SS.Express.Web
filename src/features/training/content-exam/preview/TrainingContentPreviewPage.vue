<script setup lang="ts">
import { ref } from 'vue'

import CourseManagementPageView from '../components/CourseManagementPageView.vue'
import ExamConfigurationPageView from '../components/ExamConfigurationPageView.vue'
import PaperManagementPageView from '../components/PaperManagementPageView.vue'
import QuestionBankPageView from '../components/QuestionBankPageView.vue'
import type { TrainingPreviewState } from '../types/trainingContent'
import { trainingContentFixture } from './trainingContent.fixture'

const params = new URLSearchParams(window.location.search)
const previewId = params.get('preview') ?? 'training-course-management'
const requestedScenario = params.get('scenario')
const supportedStates = new Set<TrainingPreviewState>([
  'ready',
  'loading',
  'empty',
  'retryable-error',
])
const state = ref<TrainingPreviewState>(
  supportedStates.has(requestedScenario as TrainingPreviewState)
    ? (requestedScenario as TrainingPreviewState)
    : 'ready',
)
const feedback = ref('候选页面已就绪')

const titleMap: Record<string, string> = {
  'training-course-management': '课程管理',
  'training-question-bank': '题库管理',
  'training-paper-management': '试卷管理',
  'training-exam-configuration': '考试配置管理',
}

document.title = `${titleMap[previewId] ?? '在线培训考试'} · UI Design`

function announce(message: string) {
  feedback.value = message
}

function retry() {
  state.value = 'loading'
  feedback.value = '正在重新加载候选数据'
  window.setTimeout(() => {
    state.value = 'ready'
    feedback.value = '候选数据已重新加载'
  }, 240)
}
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>

  <CourseManagementPageView
    v-if="previewId === 'training-course-management'"
    :records="trainingContentFixture.courses"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <QuestionBankPageView
    v-else-if="previewId === 'training-question-bank'"
    :records="trainingContentFixture.questions"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <PaperManagementPageView
    v-else-if="previewId === 'training-paper-management'"
    :records="trainingContentFixture.papers"
    :questions="trainingContentFixture.questions"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <ExamConfigurationPageView
    v-else
    :records="trainingContentFixture.examConfigurations"
    :papers="trainingContentFixture.papers"
    :state="state"
    @action="announce"
    @retry="retry"
  />
</template>

<style lang="scss">
@use '@shared/styles/index.scss';
</style>
