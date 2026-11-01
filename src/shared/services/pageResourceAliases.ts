/**
 * Transitional UI predicate labels, not a second authorization source.
 * A label is projected only from an EXACT V2 resource returned for this page.
 * No prefix grants, old CurrentFunctions response, login permissions or SA bypass.
 * Remove an entry when its consumer uses its registered resource code directly.
 */
const pageViewAliases: Record<string, string> = {
  'DMS.DASHBOARD': 'dms:dashboard:view',
  'IAM.OVERVIEW': 'iam:overview:view',
  'TMS.OVERVIEW': 'tms:overview:view',
  'VMS.OVERVIEW': 'vms:overview:view',
  'IAM.GROUP': 'iam:group:view',
  'IAM.TENANTS': 'iam:tenants:view',
  'IAM.ORGANIZATIONS': 'iam:organizations:view',
  'IAM.POSITIONS': 'iam:positions:view',
  'IAM.MEMBERS': 'iam:members:view',
  'IAM.ROLES': 'iam:roles:view',
  'IAM.ROLES.ASSIGNMENTS': 'iam:role-assignments:view',
  'IAM.TRAINING.COURSES': 'iam:training:courses:view',
  'IAM.TRAINING.QUESTIONS': 'iam:training:questions:view',
  'IAM.TRAINING.PAPERS': 'iam:training:papers:view',
  'IAM.TRAINING.EXAMS': 'iam:training:exams:view',
  'IAM.TRAINING.PLANS': 'iam:training:plans:view',
  'IAM.TRAINING.PLANS.DETAIL': 'iam:training:plan-detail:view',
  'IAM.TRAINING.PLANS.DETAIL.TASK': 'iam:training:task-detail:view',
  'IAM.TRAINING.OVERVIEW': 'iam:training:overview:view',
  'IAM.TRAINING.EMPLOYEE_ARCHIVES': 'iam:training:employee-archives:view',
  'IAM.TRAINING.STATISTICS': 'iam:training:statistics:view',
}

const aliases: Record<string, Record<string, string[]>> = {
  'IAM.GROUP': {
    'IAM.GROUP.BUTTON.EDIT': ['iam:group:update'],
  },
  'IAM.TENANTS': {
    'IAM.TENANTS.BUTTON.CREATE': ['iam:tenants:create'],
    'IAM.TENANTS.BUTTON.EDIT': ['iam:tenants:update'],
    'IAM.TENANTS.BUTTON.STATUS': ['iam:tenants:change-status'],
  },
  'IAM.ORGANIZATIONS': {
    'IAM.ORGANIZATIONS.BUTTON.CREATE': ['iam:organizations:create'],
    'IAM.ORGANIZATIONS.BUTTON.EDIT': ['iam:organizations:update'],
    'IAM.ORGANIZATIONS.BUTTON.STATUS': ['iam:organizations:change-status'],
    'IAM.ORGANIZATIONS.BUTTON.MOVE': ['iam:organizations:move'],
  },
  'IAM.POSITIONS': {
    'IAM.POSITIONS.BUTTON.CREATE': ['iam:positions:create'],
    'IAM.POSITIONS.BUTTON.EDIT': ['iam:positions:update'],
    'IAM.POSITIONS.BUTTON.STATUS': ['iam:positions:change-status'],
  },
  'IAM.MEMBERS': {
    'IAM.MEMBERS.BUTTON.CREATE': ['iam:members:create'],
    'IAM.MEMBERS.BUTTON.EDIT_USER': ['iam:members:update-user'],
    'IAM.MEMBERS.BUTTON.EDIT_MEMBER': ['iam:members:update'],
    'IAM.MEMBERS.BUTTON.MEMBER_STATUS': ['iam:members:change-status'],
    'IAM.MEMBERS.BUTTON.ORGANIZATION': ['iam:members:save-organization'],
    'IAM.MEMBERS.BUTTON.POSITION': ['iam:members:save-position'],
    'IAM.MEMBERS.BUTTON.ASSIGN_ROLE': ['iam:members:permissions:assign-role'],
    'IAM.MEMBERS.BUTTON.REVOKE_ROLE': ['iam:members:permissions:revoke-role'],
    'IAM.MEMBERS.BUTTON.APPOINT_ADMIN': ['iam:members:appoint-admin'],
    'IAM.MEMBERS.BUTTON.CANCEL_ADMIN': ['iam:members:cancel-admin'],
    'IAM.MEMBERS.BUTTON.END_ORGANIZATION': ['iam:members:end-organization'],
    'IAM.MEMBERS.BUTTON.END_POSITION': ['iam:members:end-position'],
    // The read-only roles drawer is declared as an element of the Menu itself.
    'IAM.MEMBERS': ['iam:members:permissions:view'],
  },
  'IAM.ROLES': {
    'IAM.ROLES.BUTTON.CREATE': ['iam:roles:create'],
    'IAM.ROLES.BUTTON.EDIT': ['iam:roles:update'],
    'IAM.ROLES.BUTTON.STATUS': ['iam:roles:change-status'],
    'IAM.ROLES.ASSIGNMENTS': ['iam:role-assignments:view'],
  },
  'IAM.ROLES.ASSIGNMENTS': {
    'IAM.ROLES.ASSIGNMENTS.BUTTON.ASSIGN': ['iam:role-assignments:assign'],
    'IAM.ROLES.ASSIGNMENTS.BUTTON.REVOKE': ['iam:role-assignments:revoke'],
  },
  'IAM.TRAINING.COURSES': {
    'IAM.TRAINING.COURSES.BUTTON.CREATE': ['iam:training:courses:create'],
    'IAM.TRAINING.COURSES.BUTTON.EDIT': ['iam:training:courses:update'],
    'IAM.TRAINING.COURSES.BUTTON.STATUS': ['iam:training:courses:change-status'],
    'IAM.TRAINING.COURSES.BUTTON.COPY': ['iam:training:courses:copy'],
  },
  'IAM.TRAINING.QUESTIONS': {
    'IAM.TRAINING.QUESTIONS.BUTTON.CREATE': ['iam:training:questions:create'],
    'IAM.TRAINING.QUESTIONS.BUTTON.EDIT': ['iam:training:questions:update'],
    'IAM.TRAINING.QUESTIONS.BUTTON.STATUS': ['iam:training:questions:change-status'],
  },
  'IAM.TRAINING.PAPERS': {
    'IAM.TRAINING.PAPERS.BUTTON.CREATE': ['iam:training:papers:create'],
    'IAM.TRAINING.PAPERS.BUTTON.EDIT': ['iam:training:papers:update'],
    'IAM.TRAINING.PAPERS.BUTTON.STATUS': ['iam:training:papers:change-status'],
  },
  'IAM.TRAINING.EXAMS': {
    'IAM.TRAINING.EXAMS.BUTTON.CREATE': ['iam:training:exams:create'],
    'IAM.TRAINING.EXAMS.BUTTON.EDIT': ['iam:training:exams:update'],
    'IAM.TRAINING.EXAMS.BUTTON.STATUS': ['iam:training:exams:change-status'],
  },
  'IAM.TRAINING.PLANS': {
    'IAM.TRAINING.PLANS.BUTTON.CREATE': ['iam:training:plans:create'],
    'IAM.TRAINING.PLANS.BUTTON.EDIT': ['iam:training:plans:update'],
    'IAM.TRAINING.PLANS.BUTTON.PUBLISH': ['iam:training:plans:publish'],
    'IAM.TRAINING.PLANS.BUTTON.DELETE': ['iam:training:plans:delete'],
    'IAM.TRAINING.PLANS.DETAIL': ['iam:training:plan-detail:view'],
  },
  'IAM.TRAINING.PLANS.DETAIL': {
    // Task and employee lists are read-only loads of the plan detail itself.
    'IAM.TRAINING.PLANS.DETAIL': ['iam:training:plans:employees:view', 'iam:training:tasks:view'],
    'IAM.TRAINING.PLANS.DETAIL.BUTTON.CREATETASK': ['iam:training:tasks:create'],
    'IAM.TRAINING.PLANS.DETAIL.BUTTON.STARTTASK': ['iam:training:tasks:start'],
    'IAM.TRAINING.PLANS.DETAIL.BUTTON.DELETETASK': ['iam:training:tasks:delete'],
    'IAM.TRAINING.PLANS.DETAIL.TASK': ['iam:training:task-detail:view'],
  },
  'IAM.TRAINING.PLANS.DETAIL.TASK': {
    'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.EDIT': ['iam:training:tasks:update'],
    'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.START': ['iam:training:tasks:start'],
    'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.DELETE': ['iam:training:tasks:delete'],
    // These are read-only drawers/queries owned by this Page in the registry.
    'IAM.TRAINING.PLANS.DETAIL.TASK': [
      'iam:training:tasks:employees',
      'iam:training:courses:view',
      'iam:training:exams:view',
    ],
  },
  'IAM.TRAINING.EMPLOYEE_ARCHIVES': {
    'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.EXPORT': ['iam:training:statistics:export'],
    'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.SENSITIVEEXPORT': [
      'iam:training:statistics:audit-export',
    ],
    'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.SNAPSHOT': ['iam:training:employee-archives:audit'],
  },
  'IAM.TRAINING.STATISTICS': {
    'IAM.TRAINING.STATISTICS.BUTTON.EXPORT': ['iam:training:statistics:export'],
    'IAM.TRAINING.STATISTICS.BUTTON.AUDITEXPORT': ['iam:training:statistics:audit-export'],
    'IAM.TRAINING.PLANS.DETAIL.TASK': ['iam:training:task-detail:view'],
  },
}

export function projectPageResourceAliases(
  pageCode: string,
  resourceCodes: Iterable<string>,
): string[] {
  const map = aliases[pageCode] ?? {}
  const codes = new Set(resourceCodes)
  return [
    ...new Set([
      ...(codes.has(pageCode) && pageViewAliases[pageCode] ? [pageViewAliases[pageCode]] : []),
      ...[...codes].flatMap((code) => map[code] ?? []),
    ]),
  ]
}
