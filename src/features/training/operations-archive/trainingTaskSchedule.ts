import dayjs from 'dayjs'
import { TRAINING_TASK_TYPES } from './constants/trainingTaskTypes'

import type { TrainingPlanRecord, TrainingTaskType } from './types/trainingOperations'

function planBounds(plan: TrainingPlanRecord) {
  if (
    !plan.year ||
    !Number.isInteger(plan.year) ||
    plan.year < 1000 ||
    plan.year > 9999 ||
    !plan.endAt
  )
    return
  const start = dayjs(plan.startAt)
  const end = /^\d{4}-\d{2}-\d{2}$/u.test(plan.endAt)
    ? dayjs(plan.endAt).endOf('day')
    : dayjs(plan.endAt)
  if (!start.isValid() || !end.isValid()) return
  // Period identity comes from plan_year, never the date portion of a UTC instant.
  const yearStart = dayjs(`${plan.year}-01-01`).startOf('day')
  const yearEnd = yearStart.endOf('year')
  const lower = Math.max(start.valueOf(), yearStart.valueOf())
  const upper = Math.min(end.valueOf(), yearEnd.valueOf())
  return lower <= upper ? { lower, upper } : undefined
}

function naturalPeriod(year: number, index: number, months: number) {
  const start = dayjs(`${year}-${String(index * months + 1).padStart(2, '0')}-01`).startOf('day')
  return {
    lower: start.valueOf(),
    upper: start.add(months, 'month').subtract(1, 'millisecond').valueOf(),
  }
}

export function trainingPeriodOptions(
  plan: TrainingPlanRecord | undefined,
  taskType: TrainingTaskType,
  occupied: readonly string[] = [],
): string[] {
  if (!plan || taskType === TRAINING_TASK_TYPES.OTHER || plan.planType === 'STANDING') return []
  const bounds = planBounds(plan)
  if (!bounds || !plan.year) return []
  const months = taskType === 'QUARTERLY' ? 3 : 1
  const keys: string[] = []
  for (let index = 0; index < 12 / months; index += 1) {
    const period = naturalPeriod(plan.year, index, months)
    const key =
      taskType === 'QUARTERLY'
        ? `${plan.year}-Q${index + 1}`
        : `${plan.year}-${String(index + 1).padStart(2, '0')}`
    if (period.lower <= bounds.upper && period.upper >= bounds.lower && !occupied.includes(key))
      keys.push(key)
  }
  return keys
}

export function quarterlyTaskSchedule(plan: TrainingPlanRecord | undefined, periodKey: string) {
  const match = /^(\d{4})-Q([1-4])$/u.exec(periodKey)
  if (!plan || !match || Number(match[1]) !== plan.year) return
  const bounds = planBounds(plan)
  if (!bounds) return
  const quarter = Number(match[2])
  const period = naturalPeriod(plan.year, quarter - 1, 3)
  const lower = Math.max(period.lower, bounds.lower)
  const upper = Math.min(period.upper, bounds.upper)
  if (lower > upper) return
  // Match the existing DatePicker/DateTimeText local-calendar and explicit-offset transport.
  return {
    name: `${plan.name.trim()}Q${quarter}培训任务`,
    startAt: dayjs(lower).format('YYYY-MM-DDTHH:mm:ssZ'),
    endAt: dayjs(upper).format('YYYY-MM-DDTHH:mm:ssZ'),
  }
}
