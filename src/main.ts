import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from '@/App.vue'
import router from '@app/router'
import { permissionDirective } from '@app/providers/permission'
import { useSessionStore } from '@app/store/session'
import { configureHttpAuth } from '@shared/api/httpClient'
import { observeTenantSwitch } from '@shared/api/tenantSwitchSignal'
import { registerLocalIcons } from '@shared/icons/registerIcons'
import { resourceElementDirective } from '@shared/services/resourceElement'
import '@shared/styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

registerLocalIcons()
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.directive('permission', permissionDirective)
app.directive('resource-element', resourceElementDirective)

const session = useSessionStore(pinia)
observeTenantSwitch()
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
