/**
 * VC 主题 - 文字/文案配置
 */
export const texts = {
  // 品牌
  brand: {
    name: '凌云资本',
    nameEn: 'LinkyunVC',
    slogan: '连接创新与资本',
    description: '专业的VC投资AI智能平台',
    copyright: '© 2026 凌云资本 LinkyunVC. 连接创新与资本。',
    icp: '京ICP备20260001号-1',
  },
  
  // 角色
  roles: {
    individual: {
      id: 'individual',
      title: '创业者',
      description: '寻求融资的创业团队',
    },
    lawyer: {
      id: 'lawyer',
      title: 'VC投资人',
      description: '专业风险投资人',
    },
    judiciary: {
      id: 'judiciary',
      title: '管理员',
      description: '平台管理员',
    },
  },
  
  // 登录页
  login: {
    welcome: '欢迎登录',
    register: '注册账号',
    registerHint: '填写信息并输入邀请码完成注册',
    loginHint: '请输入您的账号信息并选择登录身份',
    usernamePlaceholder: '请输入用户名或邮箱',
    passwordPlaceholder: '请输入密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    loginButton: '立即登录',
    registerButton: '立即注册',
    noAccount: '还没有账号？',
    hasAccount: '已有账号？',
    goRegister: '立即注册',
    goLogin: '返回登录',
    accessDenied: '访问受限',
    accessDeniedMsg: '您暂时还没有VC投资人端的访问权限，请联系管理员开通。',
  },
  
  // 创业者端（Individual Portal）
  individual: {
    sidebarTitle: '凌云资本',
    headerTitle: 'VC投资助手',
    newChat: '发起新对话',
    historyTitle: '历史对话',
    discover: '发现',
    tools: '工具',
    emptyTitle: '您好，我是您的投资助手',
    emptyDescription: '我可以帮您分析商业计划、评估项目价值、解读投资条款。',
    suggestions: ['如何撰写商业计划书？', '种子轮融资估值建议', '投资条款清单解读'],
    inputPlaceholder: '描述您的项目或投资问题',
    inputHint: '支持图片（jpg/png/gif/webp）与文档（pdf/doc/docx/txt/md）。AI 助手仅供参考，不构成正式投资建议。',
    discoverTitle: '发现投资顾问',
    discoverDescription: '选择专业领域的 AI 投资助手',
    noAdvisors: '暂无投资顾问',
    noAdvisorsHint: '投资人创建数字分身后将显示在这里',
    advisorDefault: '投资顾问',
    advisorDescDefault: '专业投资咨询服务',
    clickToChat: '点击投资顾问开始咨询',
    systemBusy: '系统正在忙，请稍后刷新',
    refresh: '刷新',
    editTitle: '编辑标题',
    save: '保存',
    cancel: '取消',
  },
  
  // VC投资人端（Lawyer Portal）
  lawyer: {
    headerTitle: 'VC投资人控制台',
    tabs: {
      assistant: 'AI助手',
      twin: '投资画像',
      knowledge: '项目库',
    },
    assistant: {
      title: 'AI 投资助手',
      emptyTitle: '您好，我是您的投资助手',
      emptyDescription: '我可以帮助您进行项目分析、投资决策、尽职调查等工作。',
      suggestions: ['如何撰写投资备忘录？', 'Term Sheet条款解析', '尽职调查要点'],
      inputPlaceholder: '描述您的投资问题',
      inputHint: '支持图片（jpg/png/gif/webp）与文档（pdf/doc/docx/txt/md）。AI 助手仅供参考，不构成投资建议。',
      notConfigured: '系统助手未配置',
      notConfiguredHint: '请在环境变量中设置 VITE_SYSTEM_ASSISTANT_AGENT_CODE',
    },
    twin: {
      title: '投资画像',
      description: '让 AI 学习您的投资风格，为您初步筛选项目',
      noTwin: '您还没有建立投资画像',
      addTwin: '添加您的投资画像',
      createTitle: '新建投资画像',
      namePlaceholder: '例如：张三投资人',
      descPlaceholder: '描述（可选）',
      editTitle: '编辑投资画像',
      published: '已发布',
      draft: '草稿',
      saveDraft: '存为草稿',
      publish: '发布',
      saveAndPublish: '保存并发布',
      draftHint: '草稿状态下，创业者无法在发现页面看到您的投资画像',
      systemPromptPlaceholder: '描述 AI 的投资风格、关注领域、评估标准等',
      knowledgeBaseLabel: '项目库(RAG)',
      knowledgeBaseHint: '绑定项目库后，AI 会基于项目库内容回答问题',
      preSkillsLabel: '对话前技能',
      imageUpload: '图像上传',
      docUpload: '文档上传',
    },
    knowledge: {
      title: '项目库管理',
      searchPlaceholder: '搜索项目库...',
      newKb: '新建库',
      createTitle: '新建项目库',
      namePlaceholder: '项目库名称',
      descPlaceholder: '描述（可选）',
      noKb: '暂无项目库',
      noKbSearch: '未找到匹配的项目库',
      createFirst: '创建第一个项目库',
      noDocs: '暂无文档',
      uploadFirst: '上传第一个文档',
      uploadDoc: '上传文档',
      addLink: '添加链接',
      addText: '添加文本',
      addLinkTitle: '添加链接',
      addTextTitle: '添加纯文本',
      linkPlaceholder: 'https://example.com/document.pdf',
      linkHint: '支持网页、PDF 等公开可访问的链接',
      docNamePlaceholder: '文档名称（可选）',
      textNamePlaceholder: '文档名称',
      textContentPlaceholder: '输入文本内容...',
    },
  },
  
  // 管理员端
  judiciary: {
    title: '管理员系统',
    description: '该模块正在开发中，将为管理员提供平台管理、数据分析与运营支持。',
    comingSoon: 'Coming Soon',
    backToLogin: '返回选择角色',
  },
  
  // 通用
  common: {
    loading: '加载中...',
    saving: '保存中...',
    creating: '创建中...',
    uploading: '上传中...',
    adding: '添加中...',
    publishing: '发布中...',
    create: '创建',
    add: '添加',
    delete: '删除',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    logout: '退出登录',
    networkError: '网络错误，请稍后重试',
  },
} as const;

export type ThemeTexts = typeof texts;
