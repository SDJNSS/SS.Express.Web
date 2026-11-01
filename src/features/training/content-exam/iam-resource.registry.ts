import { bindResourceElements } from '@shared/services/resourceElement'

// Stable discovery metadata. Existing V1 guards remain the runtime authority.
export const resourceRegistry = {
  courses: {
    page_id: 'training-course-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.COURSES',
    resource_name: '课程管理',
    remarks:
      '用途：分页查询当前租户课程、读取课程详情并按需获取视频临时链接进行只读预览；场景：查找与检查培训素材，播放不写入员工学习时长或完成记录。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/courses',
    component: 'training/content-exam/pages/CourseManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.TRAINING.COURSES.BUTTON.CREATE',
        permission_code: 'iam:training:courses:button:create',
        resource_name: '新建课程',
        remarks:
          '用途：上传并校验 DMS 视频，获取标准化视频和缩略图进行只读核对，再创建课程；场景：建立培训素材，仅保存文件引用与计划时长，不写学习记录。',
      },
      edit: {
        resource_code: 'IAM.TRAINING.COURSES.BUTTON.EDIT',
        permission_code: 'iam:training:courses:button:edit',
        resource_name: '编辑课程',
        remarks:
          '用途：读取最新课程并预览现有视频，替换视频上传校验后获取标准化播放与缩略图，再更新课程资料；场景：维护前核对素材，预览不写员工学习记录。',
      },
      status: {
        resource_code: 'IAM.TRAINING.COURSES.BUTTON.STATUS',
        permission_code: 'iam:training:courses:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：通过 ChangeStatus 启用或停用课程并刷新列表；场景：控制课程可选状态，不删除历史培训结果。',
      },
      copy: {
        resource_code: 'IAM.TRAINING.COURSES.BUTTON.COPY',
        permission_code: 'iam:training:courses:button:copy',
        resource_name: '复制课程',
        remarks:
          '用途：按源课程 ID 调用 Copy 生成独立副本，副本名称由服务端生成；场景：复用已有素材建立新课程，再按需编辑。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.courses.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/TrainingCourse/Query'],
        },
      },
      query: {
        resource_element: 'iam.training.courses.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingCourse/Query'],
          reset: ['POST /iam-admin/TrainingCourse/Query'],
          refresh: ['POST /iam-admin/TrainingCourse/Query'],
          paginate: ['POST /iam-admin/TrainingCourse/Query'],
        },
      },
      detail: {
        resource_element: 'iam.training.courses.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingCourse/Detail'],
        },
      },
      videoPreview: {
        resource_element: 'iam.training.courses.videoPreview',
        resource_key: 'page',
        kind: 'detail',
        events: {
          mount: ['POST /dms/File/GetAccessUrl'],
          'context-change': ['POST /dms/File/GetAccessUrl'],
          click: ['POST /dms/File/GetAccessUrl'],
          retry: ['POST /dms/File/GetAccessUrl'],
          renew: ['POST /dms/File/GetAccessUrl'],
          error: ['POST /dms/File/GetAccessUrl'],
          play: [],
          pause: [],
          seek: [],
          close: [],
        },
      },
      videoPlayback: {
        resource_element: 'iam.training.courses.videoPlayback',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      createVideoPreview: {
        resource_element: 'iam.training.courses.createVideoPreview',
        resource_key: 'create',
        kind: 'detail',
        events: {
          mount: ['POST /dms/File/GetAccessUrl'],
          'context-change': ['POST /dms/File/GetAccessUrl'],
          click: ['POST /dms/File/GetAccessUrl'],
          retry: ['POST /dms/File/GetAccessUrl'],
          renew: ['POST /dms/File/GetAccessUrl'],
          error: ['POST /dms/File/GetAccessUrl'],
          play: [],
          pause: [],
          seek: [],
          close: [],
        },
      },
      createVideoPlayback: {
        resource_element: 'iam.training.courses.createVideoPlayback',
        resource_key: 'create',
        kind: 'local',
        events: { click: [] },
      },
      editVideoPreview: {
        resource_element: 'iam.training.courses.editVideoPreview',
        resource_key: 'edit',
        kind: 'detail',
        events: {
          mount: ['POST /dms/File/GetAccessUrl'],
          'context-change': ['POST /dms/File/GetAccessUrl'],
          click: ['POST /dms/File/GetAccessUrl'],
          retry: ['POST /dms/File/GetAccessUrl'],
          renew: ['POST /dms/File/GetAccessUrl'],
          error: ['POST /dms/File/GetAccessUrl'],
          play: [],
          pause: [],
          seek: [],
          close: [],
        },
      },
      editVideoPlayback: {
        resource_element: 'iam.training.courses.editVideoPlayback',
        resource_key: 'edit',
        kind: 'local',
        events: { click: [] },
      },
      local: {
        resource_element: 'iam.training.courses.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
          cancel: [],
        },
      },
      create: {
        resource_element: 'iam.training.courses.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingCourse/Create', 'POST /iam-admin/TrainingCourse/Query'],
        },
      },
      edit: {
        resource_element: 'iam.training.courses.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingCourse/Detail'],
          submit: ['POST /iam-admin/TrainingCourse/Update', 'POST /iam-admin/TrainingCourse/Query'],
        },
      },
      status: {
        resource_element: 'iam.training.courses.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          open: [],
          confirm: [
            'POST /iam-admin/TrainingCourse/ChangeStatus',
            'POST /iam-admin/TrainingCourse/Query',
          ],
        },
      },
      copy: {
        resource_element: 'iam.training.courses.copy',
        resource_key: 'copy',
        kind: 'action',
        events: {
          open: [],
          confirm: ['POST /iam-admin/TrainingCourse/Copy', 'POST /iam-admin/TrainingCourse/Query'],
        },
      },
      createUpload: {
        resource_element: 'iam.training.courses.createUpload',
        resource_key: 'create',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload', 'POST /dms/File/ValidateVideo'],
          retry: ['POST /dms/File/Upload', 'POST /dms/File/ValidateVideo'],
          remove: [],
        },
      },
      editUpload: {
        resource_element: 'iam.training.courses.editUpload',
        resource_key: 'edit',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload', 'POST /dms/File/ValidateVideo'],
          retry: ['POST /dms/File/Upload', 'POST /dms/File/ValidateVideo'],
          remove: [],
        },
      },
    },
    view_files: [
      'src/features/training/content-exam/components/CourseManagementPageView.vue',
      'src/features/training/content-exam/components/CourseVideoPreview.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-course-management.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看课程管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'videoPreview', 'videoPlayback', 'local'],
        },
        {
          permission_key: 'training-course-management.create',
          parent_permission_key: 'training-course-management.view',
          default_selected_with_parent: false,
          permission_name: '新建课程',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createUpload', 'createVideoPreview', 'createVideoPlayback'],
        },
        {
          permission_key: 'training-course-management.edit',
          parent_permission_key: 'training-course-management.view',
          default_selected_with_parent: false,
          permission_name: '编辑课程',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editUpload', 'editVideoPreview', 'editVideoPlayback'],
        },
        {
          permission_key: 'training-course-management.status',
          parent_permission_key: 'training-course-management.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
        {
          permission_key: 'training-course-management.copy',
          parent_permission_key: 'training-course-management.view',
          default_selected_with_parent: false,
          permission_name: '复制课程',
          resource_key: 'copy',
          permission_kind: 'business',
          element_keys: ['copy'],
        },
      ],
    },
  },
  questions: {
    page_id: 'training-question-bank',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.QUESTIONS',
    resource_name: '题库管理',
    remarks:
      '用途：查询题目列表并按需读取题干、题型、选项、正确答案和解析；场景：维护考题素材，不是员工答题或成绩查询入口。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/questions',
    component: 'training/content-exam/pages/QuestionBankPage',
    buttons: {
      create: {
        resource_code: 'IAM.TRAINING.QUESTIONS.BUTTON.CREATE',
        permission_code: 'iam:training:questions:button:create',
        resource_name: '新建题库',
        remarks:
          '用途：创建题目及其选项、正确答案和解析；场景：向题库补充考题，提交前按题型校验正确答案数量。',
      },
      edit: {
        resource_code: 'IAM.TRAINING.QUESTIONS.BUTTON.EDIT',
        permission_code: 'iam:training:questions:button:edit',
        resource_name: '编辑题库',
        remarks:
          '用途：读取题目完整详情及并发时间戳后更新题干、选项、答案和解析；场景：修订现有考题，不把列表摘要当完整题目覆盖。',
      },
      status: {
        resource_code: 'IAM.TRAINING.QUESTIONS.BUTTON.STATUS',
        permission_code: 'iam:training:questions:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：启用或停用选定题目并重查列表；场景：控制后续选题可用性，不通过状态操作改写既有答题事实。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.questions.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/TrainingQuestion/Query'],
        },
      },
      query: {
        resource_element: 'iam.training.questions.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingQuestion/Query'],
          reset: ['POST /iam-admin/TrainingQuestion/Query'],
          refresh: ['POST /iam-admin/TrainingQuestion/Query'],
          paginate: ['POST /iam-admin/TrainingQuestion/Query'],
        },
      },
      detail: {
        resource_element: 'iam.training.questions.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingQuestion/Detail'],
        },
      },
      local: {
        resource_element: 'iam.training.questions.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
          cancel: [],
        },
      },
      create: {
        resource_element: 'iam.training.questions.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingQuestion/Create',
            'POST /iam-admin/TrainingQuestion/Query',
          ],
        },
      },
      edit: {
        resource_element: 'iam.training.questions.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingQuestion/Detail'],
          submit: [
            'POST /iam-admin/TrainingQuestion/Update',
            'POST /iam-admin/TrainingQuestion/Query',
          ],
        },
      },
      status: {
        resource_element: 'iam.training.questions.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          open: [],
          confirm: [
            'POST /iam-admin/TrainingQuestion/ChangeStatus',
            'POST /iam-admin/TrainingQuestion/Query',
          ],
        },
      },
    },
    view_files: ['src/features/training/content-exam/components/QuestionBankPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-question-bank.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看题库管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'training-question-bank.create',
          parent_permission_key: 'training-question-bank.view',
          default_selected_with_parent: false,
          permission_name: '新建题库',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create'],
        },
        {
          permission_key: 'training-question-bank.edit',
          parent_permission_key: 'training-question-bank.view',
          default_selected_with_parent: false,
          permission_name: '编辑题库',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit'],
        },
        {
          permission_key: 'training-question-bank.status',
          parent_permission_key: 'training-question-bank.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
  papers: {
    page_id: 'training-paper-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.PAPERS',
    resource_name: '试卷管理',
    remarks:
      '用途：查询试卷并读取已保存的最终题集、分值和排序详情；场景：核对考试使用的试卷，查看不会重新抽题，不代表执行考试或批改。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/papers',
    component: 'training/content-exam/pages/PaperManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.TRAINING.PAPERS.BUTTON.CREATE',
        permission_code: 'iam:training:papers:button:create',
        resource_name: '新建试卷',
        remarks:
          '用途：选择题目或生成随机初稿后按明确最终题集创建试卷；场景：准备考试试卷，携带每题版本并精确均分，保存不重新抽题。',
      },
      edit: {
        resource_code: 'IAM.TRAINING.PAPERS.BUTTON.EDIT',
        permission_code: 'iam:training:papers:button:edit',
        resource_name: '编辑试卷',
        remarks:
          '用途：读取最新试卷和可用题目后更新组卷、分值与随机顺序配置；场景：修订试卷定义，保留并发时间戳，不生成员工考试记录。',
      },
      status: {
        resource_code: 'IAM.TRAINING.PAPERS.BUTTON.STATUS',
        permission_code: 'iam:training:papers:button:status',
        resource_name: '启用/停用',
        remarks: '用途：启用或停用试卷并刷新列表；场景：控制试卷后续可选状态，不删除历史考试材料。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.papers.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/TrainingPaper/Query'],
        },
      },
      query: {
        resource_element: 'iam.training.papers.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingPaper/Query'],
          reset: ['POST /iam-admin/TrainingPaper/Query'],
          refresh: ['POST /iam-admin/TrainingPaper/Query'],
          paginate: ['POST /iam-admin/TrainingPaper/Query'],
        },
      },
      detail: {
        resource_element: 'iam.training.papers.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingPaper/Detail'],
        },
      },
      local: {
        resource_element: 'iam.training.papers.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
          cancel: [],
        },
      },
      create: {
        resource_element: 'iam.training.papers.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingQuestion/Query'],
          submit: ['POST /iam-admin/TrainingPaper/Create', 'POST /iam-admin/TrainingPaper/Query'],
        },
      },
      edit: {
        resource_element: 'iam.training.papers.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingPaper/Detail', 'POST /iam-admin/TrainingQuestion/Query'],
          submit: ['POST /iam-admin/TrainingPaper/Update', 'POST /iam-admin/TrainingPaper/Query'],
        },
      },
      status: {
        resource_element: 'iam.training.papers.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          open: [],
          confirm: [
            'POST /iam-admin/TrainingPaper/ChangeStatus',
            'POST /iam-admin/TrainingPaper/Query',
          ],
        },
      },
      createOptions: {
        resource_element: 'iam.training.papers.createOptions',
        resource_key: 'create',
        kind: 'selector',
        remarks:
          '用途：按题型和题干关键词分页查询当前租户启用题目；场景：新建试卷打开选题或替换抽屉、搜索、清除、重试或翻页，不获取答案解析、不保存试卷。',
        events: {
          open: ['POST /iam-admin/TrainingQuestion/Query'],
          change_type: ['POST /iam-admin/TrainingQuestion/Query'],
          search: ['POST /iam-admin/TrainingQuestion/Query'],
          clear: ['POST /iam-admin/TrainingQuestion/Query'],
          retry: ['POST /iam-admin/TrainingQuestion/Query'],
          paginate: ['POST /iam-admin/TrainingQuestion/Query'],
        },
      },
      editOptions: {
        resource_element: 'iam.training.papers.editOptions',
        resource_key: 'edit',
        kind: 'selector',
        remarks:
          '用途：为试卷编辑或跨题型替换分页查找当前租户启用题目；场景：选题抽屉按题型搜索、清除、重试和翻页，既有停用题目只保留原关联，不作为新候选。',
        events: {
          open: ['POST /iam-admin/TrainingQuestion/Query'],
          change_type: ['POST /iam-admin/TrainingQuestion/Query'],
          search: ['POST /iam-admin/TrainingQuestion/Query'],
          clear: ['POST /iam-admin/TrainingQuestion/Query'],
          retry: ['POST /iam-admin/TrainingQuestion/Query'],
          paginate: ['POST /iam-admin/TrainingQuestion/Query'],
        },
      },
      createSelection: {
        resource_element: 'iam.training.papers.createSelection',
        resource_key: 'create',
        kind: 'local',
        remarks:
          '用途：在新建试卷草稿内勾选、确认、移除或跨题型替换题目并设置分值；场景：仅修改未保存副本，实际创建统一由新建试卷提交，重新组卷为独立读取事件。',
        events: {
          select: [],
          confirm: [],
          cancel: [],
          remove: [],
          score: [],
          reorder: [],
          preview: [],
        },
      },
      editSelection: {
        resource_element: 'iam.training.papers.editSelection',
        resource_key: 'edit',
        kind: 'local',
        remarks:
          '用途：编辑试卷时维护最终题集及按题型均分；场景：选题确认前不改试卷、保存前不改后端或历史考试，不兼容旧规则型数据。',
        events: {
          select: [],
          confirm: [],
          cancel: [],
          remove: [],
          score: [],
          reorder: [],
          preview: [],
        },
      },
      createPreview: {
        resource_element: 'iam.training.papers.createPreview',
        resource_key: 'create',
        kind: 'action',
        remarks:
          '用途：按题型数量与题型总分从当前租户启用题库抽取一次真实题集；场景：新建试卷时生成可人工调整的初稿，不保存试卷、不返回答案解析。',
        events: {
          click: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
          retry: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
        },
      },
      editPreview: {
        resource_element: 'iam.training.papers.editPreview',
        resource_key: 'edit',
        kind: 'action',
        remarks:
          '用途：显式清空原编辑题集后重新抽取一次初稿；场景：试卷编辑重新组卷，保存与回读不再调用此接口，不改变历史考试。',
        events: {
          click: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
          retry: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
        },
      },
    },
    view_files: ['src/features/training/content-exam/components/PaperManagementPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-paper-management.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看试卷管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'training-paper-management.create',
          parent_permission_key: 'training-paper-management.view',
          default_selected_with_parent: false,
          permission_name: '新建试卷',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createOptions', 'createSelection', 'createPreview'],
        },
        {
          permission_key: 'training-paper-management.edit',
          parent_permission_key: 'training-paper-management.view',
          default_selected_with_parent: false,
          permission_name: '编辑试卷',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editOptions', 'editSelection', 'editPreview'],
        },
        {
          permission_key: 'training-paper-management.status',
          parent_permission_key: 'training-paper-management.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
  exams: {
    page_id: 'training-exam-configuration',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.EXAMS',
    resource_name: '考试配置管理',
    remarks:
      '用途：查询考试配置并读取关联试卷、考试时长、及格分、次数和反馈规则；场景：核对考试规则，不是参加考试或查看个人成绩。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/exams',
    component: 'training/content-exam/pages/ExamConfigurationPage',
    buttons: {
      create: {
        resource_code: 'IAM.TRAINING.EXAMS.BUTTON.CREATE',
        permission_code: 'iam:training:exams:button:create',
        resource_name: '新建考试配置',
        remarks:
          '用途：查询启用试卷并创建考试配置，设置时长、及格分、次数及答案解析反馈；场景：为培训任务准备可引用的考试规则。',
      },
      edit: {
        resource_code: 'IAM.TRAINING.EXAMS.BUTTON.EDIT',
        permission_code: 'iam:training:exams:button:edit',
        resource_name: '编辑考试配置',
        remarks:
          '用途：读取最新考试与原试卷，再更新关联试卷和考试规则；场景：修订考试配置，新选试卷须可用，不把未返回的试卷状态伪造为启用。',
      },
      status: {
        resource_code: 'IAM.TRAINING.EXAMS.BUTTON.STATUS',
        permission_code: 'iam:training:exams:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：启用或停用考试配置并回读列表；场景：控制后续任务引用的可用性，不改写真实成绩或通过结果。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.exams.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/TrainingExam/Query'],
        },
      },
      query: {
        resource_element: 'iam.training.exams.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingExam/Query'],
          reset: ['POST /iam-admin/TrainingExam/Query'],
          refresh: ['POST /iam-admin/TrainingExam/Query'],
          paginate: ['POST /iam-admin/TrainingExam/Query'],
        },
      },
      detail: {
        resource_element: 'iam.training.exams.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingExam/Detail'],
        },
      },
      local: {
        resource_element: 'iam.training.exams.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
          cancel: [],
        },
      },
      create: {
        resource_element: 'iam.training.exams.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingPaper/Query'],
          submit: ['POST /iam-admin/TrainingExam/Create', 'POST /iam-admin/TrainingExam/Query'],
        },
      },
      edit: {
        resource_element: 'iam.training.exams.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [
            'POST /iam-admin/TrainingExam/Detail',
            'POST /iam-admin/TrainingPaper/Detail',
            'POST /iam-admin/TrainingPaper/Query',
          ],
          submit: ['POST /iam-admin/TrainingExam/Update', 'POST /iam-admin/TrainingExam/Query'],
        },
      },
      status: {
        resource_element: 'iam.training.exams.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          open: [],
          confirm: [
            'POST /iam-admin/TrainingExam/ChangeStatus',
            'POST /iam-admin/TrainingExam/Query',
          ],
        },
      },
      createOptions: {
        resource_element: 'iam.training.exams.createOptions',
        resource_key: 'create',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingPaper/Query'],
          paginate: ['POST /iam-admin/TrainingPaper/Query'],
        },
      },
      editOptions: {
        resource_element: 'iam.training.exams.editOptions',
        resource_key: 'edit',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingPaper/Query'],
          paginate: ['POST /iam-admin/TrainingPaper/Query'],
        },
      },
    },
    view_files: ['src/features/training/content-exam/components/ExamConfigurationPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-exam-configuration.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看考试配置管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'training-exam-configuration.create',
          parent_permission_key: 'training-exam-configuration.view',
          default_selected_with_parent: false,
          permission_name: '新建考试配置',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createOptions'],
        },
        {
          permission_key: 'training-exam-configuration.edit',
          parent_permission_key: 'training-exam-configuration.view',
          default_selected_with_parent: false,
          permission_name: '编辑考试配置',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editOptions'],
        },
        {
          permission_key: 'training-exam-configuration.status',
          parent_permission_key: 'training-exam-configuration.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
} as const

export const coursesElements = bindResourceElements(resourceRegistry.courses)
export const questionsElements = bindResourceElements(resourceRegistry.questions)
export const papersElements = bindResourceElements(resourceRegistry.papers)
export const examsElements = bindResourceElements(resourceRegistry.exams)
