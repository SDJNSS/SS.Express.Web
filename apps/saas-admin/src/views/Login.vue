<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>SaaS Admin</h1>
        <p>物流平台SaaS管理后台</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-item">
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="请输入用户名"
            required
            class="form-input"
          />
        </div>

        <div class="form-item">
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            required
            class="form-input"
          />
        </div>

        <button type="submit" class="btn-login">登录</button>

        <div class="login-tips">
          <p>提示：此为演示系统，请使用测试账号登录</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const loginForm = reactive({
  username: '',
  password: '',
});

const handleLogin = async () => {
  try {
    // TODO: 对接登录 API
    // 临时模拟登录
    authStore.setToken('mock-access-token', 'mock-refresh-token');
    authStore.setUserInfo({
      userId: 1,
      username: loginForm.username,
      realName: '管理员',
      nickName: 'Admin',
      avatarUrl: '',
      userType: 'platform_admin',
      status: 'active',
    });
    authStore.setTenantInfo({
      tenantId: 1,
      tenantCode: 'PLATFORM',
      tenantName: '平台租户',
      tenantStatus: 'active',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      logoUrl: '',
    });
    authStore.setSessionId(1);

    router.push('/');
  } catch (error) {
    console.error('登录失败:', error);
    alert('登录失败，请检查用户名和密码');
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: #262626;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
}

.login-form {
  width: 100%;
}

.form-item {
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5715;
  color: #262626;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-input:hover {
  border-color: #40a9ff;
}

.form-input:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.btn-login {
  width: 100%;
  height: 40px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  background: #1890ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-login:hover {
  background: #40a9ff;
}

.btn-login:active {
  background: #096dd9;
}

.login-tips {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.login-tips p {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
