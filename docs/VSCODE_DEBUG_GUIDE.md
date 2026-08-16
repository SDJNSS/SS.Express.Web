# VSCode 启动和调试 SaaS Admin 指南

## 📋 前置要求

### 1. 安装依赖
```bash
# 在项目根目录运行
pnpm install
```

### 2. 推荐的 VSCode 插件

打开 VSCode 后，会自动提示安装推荐插件，或手动安装：

- **Vue - Official** (vue.volar) - Vue 3 语法支持
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Debugger for Chrome** - Chrome 调试
- **i18n Ally** - 国际化支持
- **Iconify IntelliSense** - 图标智能提示

## 🚀 启动方式

### 方法 1：使用 VSCode 调试面板（推荐）

1. **打开调试面板**
   - 快捷键：`F5` 或 `Ctrl+Shift+D`
   - 或点击左侧活动栏的"运行和调试"图标

2. **选择调试配置**

   在调试面板顶部下拉菜单中选择：

   - **🚀 启动 SaaS Admin (开发模式)** - 仅启动 SaaS Admin
   - **🌐 启动所有应用 (并行)** - 启动所有前端应用
   - **🎯 全栈调试 SaaS Admin** - 启动服务 + 打开 Chrome 调试

3. **启动项目**
   - 点击绿色播放按钮 ▶️
   - 或按 `F5`

4. **查看运行结果**
   - 终端会显示服务启动信息
   - 服务就绪后会自动打开浏览器（通常是 `http://localhost:3001`）

### 方法 2：使用集成终端

1. **打开终端**
   - 快捷键：`` Ctrl+` ``
   - 或菜单：`终端` → `新建终端`

2. **运行启动命令**
   ```bash
   # 仅启动 SaaS Admin
   pnpm dev:saas
   
   # 或启动所有应用
   pnpm dev
   ```

3. **打开浏览器**
   - 访问：http://localhost:3001

## 🔍 调试功能

### 前端调试（Chrome DevTools）

**方式 1：使用 VSCode 内置调试器**

1. 先启动项目（方法 1 或 2）
2. 在调试面板选择 **🔍 Chrome 调试 SaaS Admin**
3. 按 `F5` 启动 Chrome 调试会话
4. 在 VSCode 中设置断点（点击行号左侧）
5. 在浏览器中触发代码执行

**方式 2：使用 Chrome DevTools**

1. 在 Chrome 中按 `F12` 打开开发者工具
2. 切换到 `Sources` 标签
3. 找到源代码文件（webpack://）
4. 设置断点并调试

### 断点调试技巧

**在 Vue 组件中设置断点：**

```vue
<script setup lang="ts">
import { ref } from 'vue'

const handleClick = () => {
  debugger; // 👈 代码执行到这里会自动暂停
  console.log('调试点')
}
</script>
```

**在 API 调用中设置断点：**

```typescript
// 在 VSCode 编辑器中点击行号左侧设置断点
export async function getTenantList(params: TenantQuery) {
  const response = await request.get<PageResult<Tenant>>('/api/saas/tenants', { params })
  return response.data // 👈 在这里设置断点
}
```

## 📊 可用的调试配置

### 1. 🚀 启动 SaaS Admin (开发模式)
- **功能**：仅启动 SaaS Admin 应用
- **端口**：http://localhost:3001
- **用途**：日常开发和测试

### 2. 🌐 启动所有应用 (并行)
- **功能**：并行启动所有前端应用（shell, saas, wms, yms, tms, oms, crm）
- **端口**：各应用使用不同端口
- **用途**：测试应用间交互

### 3. 🔍 Chrome 调试 SaaS Admin
- **功能**：连接到运行中的 SaaS Admin 进行调试
- **要求**：需要先启动项目
- **用途**：前端代码断点调试

### 4. 🎯 全栈调试 SaaS Admin（组合配置）
- **功能**：同时启动服务 + Chrome 调试
- **用途**：一键启动完整调试环境

## 🛠️ 常用快捷键

### 调试操作
- `F5` - 启动调试 / 继续执行
- `F9` - 切换断点
- `F10` - 单步跳过（Step Over）
- `F11` - 单步进入（Step Into）
- `Shift+F11` - 单步跳出（Step Out）
- `Shift+F5` - 停止调试

### 编辑器
- `Ctrl+P` - 快速打开文件
- `Ctrl+Shift+F` - 全局搜索
- `Ctrl+B` - 切换侧边栏
- `Ctrl+J` - 切换面板
- `Ctrl+\`` - 切换终端

## 📝 开发工作流

### 典型的开发流程：

1. **启动项目**
   ```bash
   pnpm dev:saas
   ```

2. **修改代码**
   - 代码会自动热重载（HMR）
   - 无需手动刷新浏览器

3. **查看效果**
   - 浏览器自动更新
   - 控制台查看日志

4. **调试问题**
   - 在 VSCode 中设置断点
   - 或在 Chrome DevTools 中调试

5. **提交代码**
   - ESLint 自动检查
   - Prettier 自动格式化

## 🐛 常见问题

### 问题 1：端口被占用

```bash
# 错误信息：Port 3001 is already in use

# 解决方案：
# 1. 关闭占用端口的进程
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# 2. 或修改端口（在 apps/saas-admin/vite.config.ts）
```

### 问题 2：依赖安装失败

```bash
# 清理并重新安装
pnpm clean
pnpm install
```

### 问题 3：TypeScript 报错

```bash
# 运行类型检查
pnpm typecheck

# 重启 VSCode TypeScript 服务
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### 问题 4：HMR 不工作

```bash
# 重启开发服务器
# 按 Ctrl+C 停止，然后重新运行：
pnpm dev:saas
```

## 🔧 性能优化

### 减少 VSCode 内存占用

在 `.vscode/settings.json` 中已配置：
- 排除 `node_modules` 和 `dist` 目录
- 启用 Vue 混合模式
- 自动保存时格式化

### 加快启动速度

```bash
# 使用 Turbo 缓存
turbo run dev:saas

# 清理缓存（如果遇到问题）
rm -rf .turbo
```

## 📚 相关文档

- **项目文档**：`docs/SAAS_ADMIN_FINAL_REPORT.md`
- **快速开始**：`docs/SAAS_ADMIN_QUICK_START.md`
- **PRD 文档**：`docs/saas-prd-v1.1-revised.md`

## 💡 提示

- 首次启动可能需要较长时间（安装依赖 + 编译）
- 后续启动会快很多（使用缓存）
- 修改代码后会自动热重载，无需重启
- 使用 `Ctrl+C` 停止开发服务器

---

**现在可以开始开发了！** 🎉

按 `F5` 启动项目，或在终端运行 `pnpm dev:saas`。
