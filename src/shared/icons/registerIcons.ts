import accountKeyOutline from '@iconify-icons/mdi/account-key-outline'
import accountMultipleOutline from '@iconify-icons/mdi/account-multiple-outline'
import accountTieHatOutline from '@iconify-icons/mdi/account-tie-hat-outline'
import alertCircleOutline from '@iconify-icons/mdi/alert-circle-outline'
import arrowDown from '@iconify-icons/mdi/arrow-down'
import arrowUp from '@iconify-icons/mdi/arrow-up'
import bellAlertOutline from '@iconify-icons/mdi/bell-alert-outline'
import bellOutline from '@iconify-icons/mdi/bell-outline'
import calendarClockOutline from '@iconify-icons/mdi/calendar-clock-outline'
import carCog from '@iconify-icons/mdi/car-cog'
import cardAccountDetailsOutline from '@iconify-icons/mdi/card-account-details-outline'
import cashMultiple from '@iconify-icons/mdi/cash-multiple'
import chartLine from '@iconify-icons/mdi/chart-line'
import chevronDown from '@iconify-icons/mdi/chevron-down'
import chevronLeft from '@iconify-icons/mdi/chevron-left'
import chevronRight from '@iconify-icons/mdi/chevron-right'
import chevronUp from '@iconify-icons/mdi/chevron-up'
import clipboardCheckOutline from '@iconify-icons/mdi/clipboard-check-outline'
import clipboardTextOutline from '@iconify-icons/mdi/clipboard-text-outline'
import cogOutline from '@iconify-icons/mdi/cog-outline'
import counter from '@iconify-icons/mdi/counter'
import cubeOutline from '@iconify-icons/mdi/cube-outline'
import domain from '@iconify-icons/mdi/domain'
import eyeOffOutline from '@iconify-icons/mdi/eye-off-outline'
import eyeOutline from '@iconify-icons/mdi/eye-outline'
import fileDocumentCheckOutline from '@iconify-icons/mdi/file-document-check-outline'
import fileDocumentOutline from '@iconify-icons/mdi/file-document-outline'
import inboxOutline from '@iconify-icons/mdi/inbox-outline'
import layersTripleOutline from '@iconify-icons/mdi/layers-triple-outline'
import magnify from '@iconify-icons/mdi/magnify'
import mapMarkerPath from '@iconify-icons/mdi/map-marker-path'
import mapMarkerQuestionOutline from '@iconify-icons/mdi/map-marker-question-outline'
import menuClose from '@iconify-icons/mdi/menu-close'
import menuOpen from '@iconify-icons/mdi/menu-open'
import plus from '@iconify-icons/mdi/plus'
import refresh from '@iconify-icons/mdi/refresh'
import routes from '@iconify-icons/mdi/routes'
import shieldAccountOutline from '@iconify-icons/mdi/shield-account-outline'
import shieldLockOutline from '@iconify-icons/mdi/shield-lock-outline'
import tableIcon from '@iconify-icons/mdi/table'
import trayArrowDown from '@iconify-icons/mdi/tray-arrow-down'
import truckDeliveryOutline from '@iconify-icons/mdi/truck-delivery-outline'
import truckFastOutline from '@iconify-icons/mdi/truck-fast-outline'
import truckOutline from '@iconify-icons/mdi/truck-outline'
import tuneVariant from '@iconify-icons/mdi/tune-variant'
import viewDashboardOutline from '@iconify-icons/mdi/view-dashboard-outline'
import wrenchOutline from '@iconify-icons/mdi/wrench-outline'
import { addIcon } from '@iconify/vue'

const localMdiIcons = {
  'account-key-outline': accountKeyOutline,
  'account-multiple-outline': accountMultipleOutline,
  'account-tie-hat-outline': accountTieHatOutline,
  'alert-circle-outline': alertCircleOutline,
  'arrow-down': arrowDown,
  'arrow-up': arrowUp,
  'bell-alert-outline': bellAlertOutline,
  'bell-outline': bellOutline,
  'calendar-clock-outline': calendarClockOutline,
  'car-cog': carCog,
  'card-account-details-outline': cardAccountDetailsOutline,
  'cash-multiple': cashMultiple,
  'chart-line': chartLine,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  'chevron-up': chevronUp,
  'clipboard-check-outline': clipboardCheckOutline,
  'clipboard-text-outline': clipboardTextOutline,
  'cog-outline': cogOutline,
  counter: counter,
  'cube-outline': cubeOutline,
  domain: domain,
  'eye-off-outline': eyeOffOutline,
  'eye-outline': eyeOutline,
  'file-document-check-outline': fileDocumentCheckOutline,
  'file-document-outline': fileDocumentOutline,
  'inbox-outline': inboxOutline,
  'layers-triple-outline': layersTripleOutline,
  magnify: magnify,
  'map-marker-path': mapMarkerPath,
  'map-marker-question-outline': mapMarkerQuestionOutline,
  'menu-close': menuClose,
  'menu-open': menuOpen,
  plus: plus,
  refresh: refresh,
  routes: routes,
  'shield-account-outline': shieldAccountOutline,
  'shield-lock-outline': shieldLockOutline,
  table: tableIcon,
  'tray-arrow-down': trayArrowDown,
  'truck-delivery-outline': truckDeliveryOutline,
  'truck-fast-outline': truckFastOutline,
  'truck-outline': truckOutline,
  'tune-variant': tuneVariant,
  'view-dashboard-outline': viewDashboardOutline,
  'wrench-outline': wrenchOutline,
}

export function resolveLocalMdiIcon(value: string, fallback: string): string {
  const iconName = value.trim().replace(/^mdi:/u, '')
  return Object.prototype.hasOwnProperty.call(localMdiIcons, iconName)
    ? `mdi:${iconName}`
    : fallback
}

export function registerLocalIcons() {
  for (const [name, icon] of Object.entries(localMdiIcons)) {
    addIcon(`mdi:${name}`, icon)
  }
}
