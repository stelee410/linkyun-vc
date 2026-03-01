/**
 * 律小乖 法律主题 - 文字/文案配置
 */
export const texts = {
  // 品牌
  brand: {
    name: '律小乖',
    nameEn: 'LegalWise AI',
    slogan: '守护您的法律权益',
    description: '专业的法律AI智能咨询平台',
    copyright: '© 2026 律小乖 LegalWise AI. 守护您的法律权益。',
    icp: '京ICP备20260001号-1',
  },
  
  // 角色
  roles: {
    individual: {
      id: 'individual',
      title: '个人用户',
      description: '寻求法律咨询的用户',
    },
    lawyer: {
      id: 'lawyer',
      title: '律师端',
      description: '专业执业律师',
    },
    judiciary: {
      id: 'judiciary',
      title: '司法端',
      description: '司法工作人员',
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
    accessDeniedMsg: '您暂时还没有律师端的访问权限，请联系管理员开通。',
  },
  
  // 个人用户端（Individual Portal）
  individual: {
    sidebarTitle: '法律 AI',
    headerTitle: '法律咨询助手',
    newChat: '发起新对话',
    historyTitle: '历史对话',
    discover: '发现',
    tools: '工具',
    emptyTitle: '您好，我是您的法律助手',
    emptyDescription: '我可以帮您解答法律问题、分析合同条款、提供法律建议。',
    suggestions: ['劳动合同纠纷怎么处理？', '房屋买卖注意事项', '离婚财产如何分割？'],
    inputPlaceholder: '描述您的法律问题',
    inputHint: '支持图片（jpg/png/gif/webp）与文档（pdf/doc/docx/txt/md）。AI 助手仅供参考，不构成正式法律意见。',
    discoverTitle: '发现律师数字人',
    discoverDescription: '选择专业领域的 AI 律师助手',
    noAdvisors: '暂无律师数字人',
    noAdvisorsHint: '律师创建数字分身后将显示在这里',
    advisorDefault: '律师助手',
    advisorDescDefault: '专业法律咨询服务',
    clickToChat: '点击律师数字人开始咨询',
    systemBusy: '系统正在忙，请稍后刷新',
    refresh: '刷新',
    editTitle: '编辑标题',
    save: '保存',
    cancel: '取消',
  },
  
  // 律师端（Lawyer Portal）
  lawyer: {
    headerTitle: '律师端控制台',
    tabs: {
      assistant: '律助对话',
      twin: '数字分身',
      knowledge: '知识库',
    },
    assistant: {
      title: 'AI 法律助手',
      emptyTitle: '您好，我是您的法律助手',
      emptyDescription: '我可以帮助您进行案件分析、法律研究、文书起草等工作。',
      suggestions: ['如何撰写起诉状？', '民事诉讼时效规定', '证据收集要点'],
      inputPlaceholder: '描述您的法律问题',
      inputHint: '支持图片（jpg/png/gif/webp）与文档（pdf/doc/docx/txt/md）。AI 助手仅供参考，不构成法律意见。',
      notConfigured: '系统助手未配置',
      notConfiguredHint: '请在环境变量中设置 VITE_SYSTEM_ASSISTANT_AGENT_CODE',
    },
    twin: {
      title: '数字分身',
      description: '让 AI 学习您的专业风格，为您初步接待咨询用户',
      noTwin: '您还没有创建数字分身',
      addTwin: '添加你的数字分身',
      createTitle: '新建数字分身',
      namePlaceholder: '例如：张律师',
      descPlaceholder: '描述（可选）',
      editTitle: '编辑数字分身',
      published: '已发布',
      draft: '草稿',
      saveDraft: '存为草稿',
      publish: '发布',
      saveAndPublish: '保存并发布',
      draftHint: '草稿状态下，用户无法在发现页面看到您的数字分身',
      systemPromptPlaceholder: '描述 AI 的专业风格、擅长领域、沟通方式等',
      knowledgeBaseLabel: '知识库(RAG)',
      knowledgeBaseHint: '绑定知识库后，AI 会基于知识库内容回答问题',
      preSkillsLabel: '对话前技能',
      imageUpload: '图像上传',
      docUpload: '文档上传',
    },
    knowledge: {
      title: '知识库管理',
      searchPlaceholder: '搜索知识库...',
      newKb: '新建库',
      createTitle: '新建知识库',
      namePlaceholder: '知识库名称',
      descPlaceholder: '描述（可选）',
      noKb: '暂无知识库',
      noKbSearch: '未找到匹配的知识库',
      createFirst: '创建第一个知识库',
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
  
  // 司法端
  judiciary: {
    title: '司法端系统',
    description: '该模块正在开发中，将为司法工作人员提供智能辅助服务。',
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
