import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { setupPermissionDirective } from '@logistics/permission'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

setupPermissionDirective(app)

app.mount('#app')
