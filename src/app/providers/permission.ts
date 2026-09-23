import { watchEffect, type Directive } from 'vue'

import { useSessionStore } from '@app/store/session'

const cleanupByElement = new WeakMap<HTMLElement, () => void>()

function applyPermissionVisibility(element: HTMLElement, allowed: boolean): void {
  element.hidden = !allowed
  if (allowed) {
    element.style.removeProperty('display')
    return
  }

  // Component libraries may set an author-level display rule (for example
  // Element Plus buttons use inline-flex), which overrides the browser's
  // default [hidden] rule. Keep the semantic attribute and enforce the visual
  // state so permission-gated controls never remain actionable.
  element.style.setProperty('display', 'none', 'important')
}

export const permissionDirective: Directive<HTMLElement, string> = {
  mounted(element, binding) {
    const session = useSessionStore()
    const stop = watchEffect(() => {
      applyPermissionVisibility(element, session.hasPermission(binding.value))
    })
    cleanupByElement.set(element, stop)
  },
  updated(element, binding) {
    const session = useSessionStore()
    applyPermissionVisibility(element, session.hasPermission(binding.value))
  },
  unmounted(element) {
    cleanupByElement.get(element)?.()
    cleanupByElement.delete(element)
  },
}
