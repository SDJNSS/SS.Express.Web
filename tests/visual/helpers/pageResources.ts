import { readFileSync } from 'node:fs'

import { projectPageResourceAliases } from '../../../src/shared/services/pageResourceAliases'

interface ResourcePage {
  resource_code: string
  authorization_model: string
  route_path: string
  buttons: Record<string, { resource_code: string }>
  elements: Record<string, { target_resource_code?: string }>
}

const { pages } = JSON.parse(
  readFileSync(new URL('../../../artifacts/iam-resource-elements.json', import.meta.url), 'utf8'),
) as { pages: ResourcePage[] }

export function resourceCodeForRoute(path: string): string {
  return pages.find((item) => item.route_path === path)?.resource_code ?? ''
}

export function pageResourcesFixture(
  code: string,
  options: {
    readOnly?: boolean
    excludedMenuPaths?: string[]
    excludedFunctionPermissions?: string[]
  } = {},
) {
  const page = pages.find((item) => item.resource_code === code)
  const canAccess = Boolean(
    page &&
    page.authorization_model !== 'v2' &&
    !options.excludedMenuPaths?.includes(page.route_path),
  )
  const buttons = page ? Object.values(page.buttons).map((item) => item.resource_code) : []
  const targets = page
    ? Object.values(page.elements).flatMap((item) =>
        item.target_resource_code ? [item.target_resource_code] : [],
      )
    : []
  const included = (resource: string) =>
    !projectPageResourceAliases(code, [resource]).some((alias) =>
      options.excludedFunctionPermissions?.includes(alias),
    )
  return {
    page_resource_code: code,
    can_access: canAccess,
    button_resource_codes: canAccess && !options.readOnly ? buttons.filter(included) : [],
    button_page_resource_codes: canAccess ? targets.filter(included) : [],
    read_function_resource_codes: [],
    authorization_version: '63924670932147368',
  }
}
