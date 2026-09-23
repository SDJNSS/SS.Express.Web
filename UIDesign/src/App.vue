<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import {
  uiPrototypes,
  type PreviewSource,
  type PrototypeStatus,
} from './prototype-registry'

const statusLabels: Record<PrototypeStatus, string> = {
  draft: '草稿',
  reviewing: '评审中',
  approved: '已确认',
  implemented: '已实现',
  archived: '已归档',
}

const sourceLabels: Record<PreviewSource, string> = {
  'legacy-prototype': 'Legacy 原型',
  'canonical-feature': 'Canonical 页面',
}

const params = new URLSearchParams(window.location.search)
const previewId = params.get('preview') ?? params.get('prototype')
const captureMode = params.get('capture') === '1'
const selectedPrototype = uiPrototypes.find((prototype) => prototype.id === previewId)
const SelectedPrototype = selectedPrototype ? defineAsyncComponent(selectedPrototype.load) : null
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div
      v-if="SelectedPrototype"
      class="prototype-stage"
      :data-preview-id="selectedPrototype?.id"
      :data-preview-source="selectedPrototype?.source"
    >
      <nav v-if="!captureMode" class="prototype-stage__bar" aria-label="原型工具栏">
        <a href="/">返回原型目录</a>
        <span>{{ selectedPrototype?.name }}</span>
        <span>{{ selectedPrototype?.viewport }}</span>
      </nav>
      <component :is="SelectedPrototype" />
    </div>

    <main v-else class="catalog">
    <header class="catalog__header">
      <div>
        <h1>UI Design</h1>
        <p>物流平台可运行原型目录</p>
      </div>
      <code>pnpm ui:dev</code>
    </header>

    <section class="catalog__section" aria-labelledby="prototype-title">
      <div class="catalog__section-heading">
        <div>
          <h2 id="prototype-title">业务原型</h2>
          <p>已注册的原型会按子系统、Feature 和确认状态集中展示。</p>
        </div>
      </div>

      <div v-if="uiPrototypes.length" class="prototype-table-wrap">
        <table class="prototype-table">
          <thead>
            <tr>
              <th>页面</th>
              <th>归属</th>
              <th>页面类型</th>
              <th>来源</th>
              <th>基准视口</th>
              <th>状态</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prototype in uiPrototypes" :key="prototype.id">
              <td><a :href="`/?preview=${prototype.id}`">{{ prototype.name }}</a></td>
              <td>{{ prototype.subsystem }} / {{ prototype.feature }}</td>
              <td>{{ prototype.pageType }}</td>
              <td>{{ sourceLabels[prototype.source] }}</td>
              <td>{{ prototype.viewport }}</td>
              <td>{{ statusLabels[prototype.status] }}</td>
              <td>{{ prototype.updatedAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="catalog-empty">
        <strong>尚未注册业务原型</strong>
        <p>从 <code>src/prototypes/_template</code> 复制页面模板，并在 prototype-registry.ts 中注册。</p>
      </div>
    </section>

    <section class="catalog__guides" aria-label="原型工作约定">
      <article>
        <h2>唯一标准</h2>
        <p>复用生产工程 Design Token 和稳定 Shared Component；公共问题优先回收到统一规则。</p>
      </article>
      <article>
        <h2>职责分离</h2>
        <p>原型定义视觉和交互，PRD 与 Page Specification 定义业务、权限、校验和异常。</p>
      </article>
      <article>
        <h2>确认后冻结</h2>
        <p>状态为“已确认”的原型是正式开发和视觉验收基准，变更必须留下评审记录。</p>
      </article>
    </section>
    </main>
  </el-config-provider>
</template>
