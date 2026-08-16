import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

// 初始化请求客户端
import { request } from '@logistics/request';
import { useAuthStore } from '@/stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 配置请求客户端
const authStore = useAuthStore();
authStore.restoreFromStorage();

request.setTokenGetter(() => authStore.token);
request.setTenantIdGetter(() => authStore.tenantId);
request.onUnauthorizedCallback(() => {
  authStore.logout();
  router.push('/login');
});

app.mount('#app');
