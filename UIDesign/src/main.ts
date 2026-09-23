import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import { registerLocalIcons } from '@shared/icons/registerIcons'
import './styles/index.scss'

const app = createApp(App)

registerLocalIcons()
app.use(ElementPlus)
// Isolated previews demonstrate approved interaction states without production authorization data.
app.directive('permission', {
  mounted(element: HTMLElement) {
    element.hidden = false
  },
})
app.mount('#app')
