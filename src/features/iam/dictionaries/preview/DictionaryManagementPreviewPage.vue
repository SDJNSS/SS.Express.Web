<script setup lang="ts">
import DictionaryManagementPageView from '../components/DictionaryManagementPageView.vue'
import { createDictionaryPreviewPort } from './createDictionaryPreviewPort'

const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'ready'
const port = createDictionaryPreviewPort(scenario)
document.title = '字典管理 · UI Design'
</script>

<template><DictionaryManagementPageView :port="port" /></template>
