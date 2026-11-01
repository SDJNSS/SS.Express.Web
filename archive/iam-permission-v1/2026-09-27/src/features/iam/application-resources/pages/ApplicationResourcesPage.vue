<script setup lang="ts">
import { onMounted } from 'vue'

import ApplicationResourcesPageView from '../components/ApplicationResourcesPageView.vue'
import { useApplicationResources } from '../composables/useApplicationResources'

const {
  applications,
  state,
  catalogWarning,
  load,
  submitApplication,
  submitResource,
  submitStatus,
  submitDelete,
} = useApplicationResources()

onMounted(load)
</script>

<template>
  <ApplicationResourcesPageView
    :applications="applications"
    :state="state"
    :catalog-warning="catalogWarning"
    :allow-structural-delete="true"
    :submit-application="submitApplication"
    :submit-resource="submitResource"
    :submit-status="submitStatus"
    :submit-delete="submitDelete"
    @retry="load"
  />
</template>
