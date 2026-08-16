// SaaS 租户与计费域类型定义

// 租户类型
export interface Tenant {
  id: number;
  tenantCode: string;
  tenantName: string;
  tenantType: string;
  status: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  domain: string;
  subdomain: string;
  logoUrl: string;
  timezone: string;
  language: string;
  isolationMode: string;
  dbKey: string;
  schemaName: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 应用类型
export interface App {
  id: number;
  appCode: string;
  appName: string;
  appType: string;
  appVersion: string;
  icon: string;
  routePath: string;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 功能类型
export interface Feature {
  id: number;
  appId: number;
  parentId: number;
  featureCode: string;
  featureName: string;
  featureType: 'module' | 'feature';
  routePath: string;
  permissionCode: string;
  sortOrder: number;
  isVisible: boolean;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  children?: Feature[];
}

// 套餐类型
export interface Plan {
  id: number;
  planCode: string;
  planName: string;
  planType: string;
  billingCycle: string;
  price: number;
  currency: string;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 套餐功能类型
export interface PlanFeature {
  id: number;
  planId: number;
  appId: number;
  featureId: number;
  grantType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 订阅类型
export interface Subscription {
  id: number;
  tenantId: number;
  planId: number;
  subscriptionCode: string;
  subscriptionStatus: string;
  startAt: string;
  endAt: string;
  autoRenew: boolean;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  tenant?: Tenant;
  plan?: Plan;
}

// 查询参数类型
export interface TenantQueryParams {
  tenantCode?: string;
  tenantName?: string;
  tenantType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface AppQueryParams {
  appCode?: string;
  appName?: string;
  appType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface FeatureQueryParams {
  appId?: number;
  featureCode?: string;
  featureName?: string;
  featureType?: string;
  status?: string;
}

export interface PlanQueryParams {
  planCode?: string;
  planName?: string;
  planType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface SubscriptionQueryParams {
  tenantId?: number;
  planId?: number;
  subscriptionStatus?: string;
  pageNum: number;
  pageSize: number;
}
