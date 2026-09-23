import { ElMessage, type MessageOptions, type MessageType } from 'element-plus'

const defaults = {
  duration: 3000,
  grouping: true,
  showClose: true,
} satisfies Pick<MessageOptions, 'duration' | 'grouping' | 'showClose'>

type NotificationMessage = NonNullable<MessageOptions['message']>
type NotificationType = Exclude<MessageType, 'primary'>

function show(type: NotificationType, message: NotificationMessage) {
  return ElMessage({ ...defaults, type, message })
}

export const notification = {
  success: (message: NotificationMessage) => show('success', message),
  warning: (message: NotificationMessage) => show('warning', message),
  info: (message: NotificationMessage) => show('info', message),
  error: (message: NotificationMessage) => show('error', message),
}
