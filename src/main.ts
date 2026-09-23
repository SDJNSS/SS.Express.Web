import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from '@/App.vue'
import router from '@app/router'
import { permissionDirective } from '@app/providers/permission'
import { useSessionStore } from '@app/store/session'
import { configureHttpAuth } from '@shared/api/httpClient'
import { registerLocalIcons } from '@shared/icons/registerIcons'
import '@shared/styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

registerLocalIcons()
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.directive('permission', permissionDirective)

const session = useSessionStore(pinia)
configureHttpAuth({
  onSessionExpired: () => {
    const redirect = router.currentRoute.value.fullPath
    session.expireSession()
    if (router.currentRoute.value.name !== 'iam-login') {
      void router.replace({ name: 'iam-login', query: { redirect } })
    }
  },
})

app.mount('#app')
