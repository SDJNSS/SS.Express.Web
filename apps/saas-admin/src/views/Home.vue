<template>
  <div class="home-container">
    <h1>SaaS 管理后台</h1>
    <p>欢迎使用 SaaS 管理后台</p>
    <div class="module-list">
      <h2>功能模块</h2>
      <ul>
        <li>租户管理</li>
        <li>应用管理</li>
        <li>功能管理</li>
        <li>套餐管理</li>
        <li>订阅管理</li>
        <li>用户管理</li>
        <li>组织架构管理</li>
        <li>角色管理</li>
        <li>权限管理</li>
        <li>审计管理</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 40px;
}

.home-container h1 {
  margin-bottom: 20px;
}

.module-list {
  margin-top: 40px;
}

.module-list h2 {
  margin-bottom: 20px;
}

.module-list ul {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.module-list li {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
