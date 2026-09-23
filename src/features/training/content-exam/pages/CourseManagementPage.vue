<script setup lang="ts">
import CourseManagementPageView from '../components/CourseManagementPageView.vue'
import { useCourseManagement } from '../composables/useContentPages'

const { records, state, runtime, contextKey } = useCourseManagement()
</script>

<template>
  <CourseManagementPageView
    :key="contextKey"
    :records="records"
    :state="state"
    :runtime="runtime"
  />
</template>
