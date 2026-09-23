<script setup lang="ts">
import QuestionBankPageView from '../components/QuestionBankPageView.vue'
import { useQuestionBank } from '../composables/useContentPages'

const { records, state, runtime, contextKey } = useQuestionBank()
</script>

<template>
  <QuestionBankPageView :key="contextKey" :records="records" :state="state" :runtime="runtime" />
</template>
