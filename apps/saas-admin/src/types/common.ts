// 通用类型定义

// 分页响应类型
export interface PageResponse<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// 树形节点类型
export interface TreeNode {
  id: number;
  label: string;
  children?: TreeNode[];
  [key: string]: any;
}

// 字典项类型
export interface DictItem {
  label: string;
  value: string | number;
  type?: string;
  sort?: number;
  status?: string;
  [key: string]: any;
}

// 表单规则类型
export interface FormRule {
  required?: boolean;
  message?: string;
  trigger?: string | string[];
  validator?: (rule: any, value: any, callback: any) => void;
  [key: string]: any;
}

// 表格列类型
export interface TableColumn {
  prop: string;
  label: string;
  width?: string | number;
  minWidth?: string | number;
  fixed?: boolean | 'left' | 'right';
  sortable?: boolean | 'custom';
  formatter?: (row: any, column: any, cellValue: any, index: number) => any;
  [key: string]: any;
}

// 操作按钮类型
export interface ActionButton {
  label: string;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  icon?: string;
  permission?: string;
  disabled?: boolean | ((row: any) => boolean);
  show?: boolean | ((row: any) => boolean);
  handler: (row: any) => void;
}

// 搜索表单项类型
export interface SearchFormItem {
  prop: string;
  label: string;
  type: 'input' | 'select' | 'date' | 'daterange' | 'cascader';
  placeholder?: string;
  options?: DictItem[];
  [key: string]: any;
}
