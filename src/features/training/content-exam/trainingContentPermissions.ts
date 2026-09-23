/** Permission names to register on the backend; this module does not grant permissions. */
export const CONTENT_PERMISSIONS = {
  courses: {
    view: 'iam:training:courses:view',
    create: 'iam:training:courses:create',
    update: 'iam:training:courses:update',
    status: 'iam:training:courses:change-status',
    copy: 'iam:training:courses:copy',
  },
  questions: {
    view: 'iam:training:questions:view',
    create: 'iam:training:questions:create',
    update: 'iam:training:questions:update',
    status: 'iam:training:questions:change-status',
  },
  papers: {
    view: 'iam:training:papers:view',
    create: 'iam:training:papers:create',
    update: 'iam:training:papers:update',
    status: 'iam:training:papers:change-status',
  },
  exams: {
    view: 'iam:training:exams:view',
    create: 'iam:training:exams:create',
    update: 'iam:training:exams:update',
    status: 'iam:training:exams:change-status',
  },
} as const
