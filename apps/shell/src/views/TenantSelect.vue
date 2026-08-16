<template>
  <div class="tenant-select-container">
    <div class="tenant-select-box">
      <h2>选择租户</h2>
      <div class="tenant-list">
        <div v-for="tenant in tenants" :key="tenant.id" class="tenant-item" @click="selectTenant(tenant)">
          <h3>{{ tenant.name }}</h3>
          <p>{{ tenant.code }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tenants = ref([
  { id: 1, code: 'TENANT001', name: '示例租户 1' },
  { id: 2, code: 'TENANT002', name: '示例租户 2' }
])

function selectTenant(tenant: any) {
  console.log('Selected tenant:', tenant)
  router.push('/workbench')
}
</script>

<style scoped>
.tenant-select-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
}

.tenant-select-box {
  width: 600px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tenant-select-box h2 {
  margin-bottom: 30px;
  text-align: center;
}

.tenant-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.tenant-item {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.tenant-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.tenant-item h3 {
  margin-bottom: 8px;
  font-size: 16px;
}

.tenant-item p {
  font-size: 14px;
  color: #999;
}
</style>
