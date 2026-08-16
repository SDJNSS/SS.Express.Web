<template>
  <div class="forbidden-container">
    <h1>403</h1>
    <p>无权访问</p>
    <button @click="goBack">返回</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<style scoped>
.forbidden-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.forbidden-container h1 {
  font-size: 72px;
  color: #667eea;
  margin-bottom: 20px;
}

.forbidden-container p {
  font-size: 24px;
  color: #666;
  margin-bottom: 30px;
}

.forbidden-container button {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
