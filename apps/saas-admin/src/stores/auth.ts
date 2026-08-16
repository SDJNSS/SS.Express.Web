// 认证状态管理
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface UserInfo {
  userId: number;
  username: string;
  realName: string;
  nickName: string;
  avatarUrl: string;
  userType: string;
  status: string;
}

export interface TenantInfo {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
  timezone: string;
  language: string;
  logoUrl: string;
}

export interface SubscriptionInfo {
  subscriptionId: number;
  subscriptionStatus: string;
  planId: number;
  planCode: string;
  planName: string;
  subscriptionStartAt: string;
  subscriptionEndAt: string;
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>('');
  const refreshToken = ref<string>('');
  const sessionId = ref<number>(0);
  const userInfo = ref<UserInfo | null>(null);
  const tenantInfo = ref<TenantInfo | null>(null);
  const subscriptions = ref<SubscriptionInfo[]>([]);
  const nearestSubscriptionEndAt = ref<string>('');
  const planSummary = ref<string>('');

  // 设置 Token
  const setToken = (access: string, refresh: string) => {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  };

  // 设置用户信息
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info;
    localStorage.setItem('user_info', JSON.stringify(info));
  };

  // 设置租户信息
  const setTenantInfo = (info: TenantInfo) => {
    tenantInfo.value = info;
    localStorage.setItem('tenant_info', JSON.stringify(info));
  };

  // 设置订阅信息
  const setSubscriptions = (subs: SubscriptionInfo[]) => {
    subscriptions.value = subs;

    // 计算最近到期时间
    if (subs.length > 0) {
      const sorted = [...subs].sort((a, b) =>
        new Date(a.subscriptionEndAt).getTime() - new Date(b.subscriptionEndAt).getTime()
      );
      nearestSubscriptionEndAt.value = sorted[0].subscriptionEndAt;
    }

    // 生成套餐摘要
    const planNames = subs.map(s => s.planName).join(', ');
    planSummary.value = planNames;

    localStorage.setItem('subscriptions', JSON.stringify(subs));
  };

  // 设置会话 ID
  const setSessionId = (id: number) => {
    sessionId.value = id;
    localStorage.setItem('session_id', String(id));
  };

  // 从本地存储恢复状态
  const restoreFromStorage = () => {
    const token = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    const user = localStorage.getItem('user_info');
    const tenant = localStorage.getItem('tenant_info');
    const subs = localStorage.getItem('subscriptions');
    const session = localStorage.getItem('session_id');

    if (token) accessToken.value = token;
    if (refresh) refreshToken.value = refresh;
    if (user) userInfo.value = JSON.parse(user);
    if (tenant) tenantInfo.value = JSON.parse(tenant);
    if (subs) setSubscriptions(JSON.parse(subs));
    if (session) sessionId.value = Number(session);
  };

  // 清除认证信息
  const logout = () => {
    accessToken.value = '';
    refreshToken.value = '';
    sessionId.value = 0;
    userInfo.value = null;
    tenantInfo.value = null;
    subscriptions.value = [];
    nearestSubscriptionEndAt.value = '';
    planSummary.value = '';

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('user_info');
    localStorage.removeItem('tenant_info');
    localStorage.removeItem('subscriptions');
  };

  // 检查是否已登录
  const isAuthenticated = () => {
    return !!accessToken.value && !!userInfo.value && !!tenantInfo.value;
  };

  return {
    accessToken,
    refreshToken,
    sessionId,
    userInfo,
    tenantInfo,
    subscriptions,
    nearestSubscriptionEndAt,
    planSummary,
    setToken,
    setUserInfo,
    setTenantInfo,
    setSubscriptions,
    setSessionId,
    restoreFromStorage,
    logout,
    isAuthenticated,
  };
});
