import type { ObjectDirective } from 'vue'

/** Discovery metadata only. Never grants permission, intercepts events or sends requests. */
export interface ResourceElement {
  readonly resource_element: string
  readonly owner_page_resource_code: string
  readonly frontend_resource_code: string
  readonly kind: string
  readonly remarks: string
  readonly events: Readonly<Record<string, readonly string[]>>
}

export interface ResourcePageRegistry {
  readonly page_id: string
  readonly resource_code: string
  readonly resource_name: string
  readonly remarks: string
  readonly route_path: string
  readonly component: string
  readonly parent_resource_code: string
  readonly buttons: Readonly<
    Record<
      string,
      { readonly resource_code: string; readonly resource_name: string; readonly remarks: string }
    >
  >
  readonly elements: Readonly<
    Record<
      string,
      {
        readonly resource_element: string
        readonly resource_key: string
        readonly kind: string
        readonly events: Readonly<Record<string, readonly string[]>>
        readonly target_resource_code?: string
        readonly remarks?: string
      }
    >
  >
}

export function defineResourceElement<T extends ResourceElement>(descriptor: T): T {
  return descriptor
}

export function bindResourceElements<T extends ResourcePageRegistry>(page: T) {
  const result = Object.fromEntries(
    Object.entries(page.elements).map(([key, element]) => {
      const code =
        element.target_resource_code ??
        (element.resource_key === 'page'
          ? page.resource_code
          : page.buttons[element.resource_key]?.resource_code)
      if (!code) throw new Error(`Unknown resource key: ${element.resource_element}`)
      return [
        key,
        Object.freeze(
          defineResourceElement({
            resource_element: element.resource_element,
            owner_page_resource_code: page.resource_code,
            frontend_resource_code: code,
            kind: element.kind,
            remarks:
              element.remarks ??
              (element.target_resource_code
                ? ''
                : element.resource_key === 'page'
                  ? page.remarks
                  : (page.buttons[element.resource_key]?.remarks ?? '')),
            events: element.events,
          }),
        ),
      ]
    }),
  )
  return Object.freeze(result) as { readonly [K in keyof T['elements']]: ResourceElement }
}

export function resourceElementAttributes(descriptor?: ResourceElement) {
  return {
    'data-resource-element': descriptor?.resource_element,
    'data-resource-code': descriptor?.frontend_resource_code,
    'data-resource-owner': descriptor?.owner_page_resource_code,
    'data-resource-description': descriptor?.remarks,
  }
}

function updateMarker(element: HTMLElement, descriptor?: ResourceElement) {
  for (const [name, value] of Object.entries(resourceElementAttributes(descriptor))) {
    if (value) element.setAttribute(name, value)
    else element.removeAttribute(name)
  }
}

export const resourceElementDirective: ObjectDirective<HTMLElement, ResourceElement | undefined> = {
  mounted: (element, binding) => updateMarker(element, binding.value),
  updated: (element, binding) => updateMarker(element, binding.value),
}
