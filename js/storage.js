const TOPICS_KEY = 'topics';
const NOTES_KEY = 'notes';
const SCHEDULES_KEY = 'schedules';
const INTERACTIONS_KEY = 'interactions';
const COMPETITORS_KEY = 'competitors';
const TEMPLATES_KEY = 'templates';
const ACCOUNTS_KEY = 'accounts';
const FORBIDDEN_WORDS_KEY = 'forbidden_words';

const DEFAULT_ACCOUNTS = [
  { id: 'acc_main', name: '主账号', color: '#667eea' },
  { id: 'acc_beauty', name: '美妆号', color: '#f093fb' },
  { id: 'acc_fashion', name: '穿搭号', color: '#4facfe' },
  { id: 'acc_life', name: '生活号', color: '#43e97b' }
];

const DEFAULT_FORBIDDEN_WORDS = [
  '国家级', '最高级', '第一', '唯一', '最好', '最大', '全网第一', '顶级',
  '独家', '首个', '首选', '极致', '永久', '万能', '100%', '特效', '无效退款',
  '纯天然', '无副作用', '品牌名占位'
];

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_goods',
    name: '好物分享模板',
    category: 'content',
    icon: '🎁',
    content: `【开头】姐妹们！今天一定要给大家安利这款神仙好物！\n\n【产品介绍】这款{产品名}真的绝了，{核心卖点}\n\n【使用体验】我已经用了{使用时长}，{具体效果}\n\n【对比优势】相比{同类产品}，它的优势在于{差异化卖点}\n\n【购买建议】适合{目标人群}入手，{购买提示}\n\n【互动】你们用过这款吗？评论区聊聊！`,
    remark: '适用于产品推荐、种草类笔记，核心是突出卖点+对比+互动',
    useCount: 0,
    lastUsedAt: null,
    useHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl_review',
    name: '测评对比模板',
    category: 'structure',
    icon: '📊',
    content: `【开头】今天给大家做一期{品类}深度测评！\n\n【产品清单】\n1️⃣ {产品A} - {价格A}\n2️⃣ {产品B} - {价格B}\n3️⃣ {产品C} - {价格C}\n\n【维度对比】\n📌 外观设计：{外观评分}\n📌 功能表现：{功能评分}\n📌 性价比：{性价比评分}\n\n【结论】\n✅ 追求性价比选：{推荐1}\n✅ 追求品质选：{推荐2}\n✅ 综合推荐：{推荐3}\n\n【互动】你们在用哪款？来投票！`,
    remark: '适用于多产品横评，适合建立专业人设',
    useCount: 0,
    lastUsedAt: null,
    useHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl_tutorial',
    name: '教程干货模板',
    category: 'content',
    icon: '📖',
    content: `【开头】保姆级{主题}教程来啦！新手小白也能学会！\n\n【准备工作】\n需要准备：{材料清单}\n\n【步骤详解】\n第1步：{步骤1描述}\n第2步：{步骤2描述}\n第3步：{步骤3描述}\n\n【避坑指南】\n❌ 不要{错误做法1}\n❌ 不要{错误做法2}\n✅ 一定要{正确做法}\n\n【效果展示】\n按照这个方法，{预期效果}\n\n【互动】学会了记得交作业！`,
    remark: '适用于教程、干货类笔记，适合收藏涨粉',
    useCount: 0,
    lastUsedAt: null,
    useHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class StorageManager {
  static get(key, defaultVal = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  static set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  static save(key, val) {
    return this.set(key, val);
  }

  static remove(key) {
    localStorage.removeItem(key);
  }

  static getTopics() {
    return this.get(TOPICS_KEY, []);
  }

  static saveTopic(topic) {
    const topics = this.getTopics();
    if (topic.id) {
      const idx = topics.findIndex(t => t.id === topic.id);
      if (idx > -1) {
        topics[idx] = { ...topics[idx], ...topic };
      } else {
        topics.push(topic);
      }
    } else {
      topic.id = generateId('topic');
      topic.createdAt = new Date().toISOString();
      topics.push(topic);
    }
    this.set(TOPICS_KEY, topics);
    return topic;
  }

  static deleteTopic(id) {
    const topics = this.getTopics().filter(t => t.id !== id);
    this.set(TOPICS_KEY, topics);
  }

  static getNotes() {
    return this.get(NOTES_KEY, []);
  }

  static saveNote(note) {
    const notes = this.getNotes();
    if (note.id) {
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx > -1) {
        notes[idx] = { ...notes[idx], ...note, updatedAt: new Date().toISOString() };
      } else {
        notes.push(note);
      }
    } else {
      note.id = generateId('note');
      note.createdAt = new Date().toISOString();
      note.updatedAt = note.createdAt;
      notes.push(note);
    }
    this.set(NOTES_KEY, notes);
    return note;
  }

  static deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    this.set(NOTES_KEY, notes);
  }

  static getSchedules() {
    return this.get(SCHEDULES_KEY, []);
  }

  static saveSchedule(schedule) {
    const schedules = this.getSchedules();
    if (schedule.id) {
      const idx = schedules.findIndex(s => s.id === schedule.id);
      if (idx > -1) {
        schedules[idx] = { ...schedules[idx], ...schedule };
      } else {
        schedules.push(schedule);
      }
    } else {
      schedule.id = generateId('schedule');
      schedule.createdAt = new Date().toISOString();
      schedules.push(schedule);
    }
    this.set(SCHEDULES_KEY, schedules);
    return schedule;
  }

  static deleteSchedule(id) {
    const schedules = this.getSchedules().filter(s => s.id !== id);
    this.set(SCHEDULES_KEY, schedules);
  }

  static getInteractions() {
    return this.get(INTERACTIONS_KEY, []);
  }

  static saveInteraction(interaction) {
    const interactions = this.getInteractions();
    if (interaction.id) {
      const idx = interactions.findIndex(i => i.id === interaction.id);
      if (idx > -1) {
        interactions[idx] = { ...interactions[idx], ...interaction };
      } else {
        interactions.push(interaction);
      }
    } else {
      interaction.id = generateId('interaction');
      interaction.createdAt = new Date().toISOString();
      interactions.push(interaction);
    }
    this.set(INTERACTIONS_KEY, interactions);
    return interaction;
  }

  static deleteInteraction(id) {
    const interactions = this.getInteractions().filter(i => i.id !== id);
    this.set(INTERACTIONS_KEY, interactions);
  }

  static getCompetitors() {
    return this.get(COMPETITORS_KEY, []);
  }

  static saveCompetitor(competitor) {
    const competitors = this.getCompetitors();
    if (competitor.id) {
      const idx = competitors.findIndex(c => c.id === competitor.id);
      if (idx > -1) {
        competitors[idx] = { ...competitors[idx], ...competitor, updatedAt: new Date().toISOString() };
      } else {
        competitors.push(competitor);
      }
    } else {
      competitor.id = generateId('competitor');
      competitor.createdAt = new Date().toISOString();
      competitor.updatedAt = competitor.createdAt;
      competitors.push(competitor);
    }
    this.set(COMPETITORS_KEY, competitors);
    return competitor;
  }

  static deleteCompetitor(id) {
    const competitors = this.getCompetitors().filter(c => c.id !== id);
    this.set(COMPETITORS_KEY, competitors);
  }

  static getTemplates() {
    const templates = this.get(TEMPLATES_KEY, null);
    if (!templates) {
      this.set(TEMPLATES_KEY, DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    return templates;
  }

  static saveTemplate(template) {
    const templates = this.getTemplates();
    if (template.id) {
      const idx = templates.findIndex(t => t.id === template.id);
      if (idx > -1) {
        templates[idx] = { ...templates[idx], ...template };
      } else {
        templates.push(template);
      }
    } else {
      template.id = generateId('tpl');
      template.createdAt = new Date().toISOString();
      templates.push(template);
    }
    this.set(TEMPLATES_KEY, templates);
    return template;
  }

  static deleteTemplate(id) {
    const templates = this.getTemplates().filter(t => t.id !== id);
    this.set(TEMPLATES_KEY, templates);
  }

  static getAccounts() {
    const accounts = this.get(ACCOUNTS_KEY, null);
    if (!accounts) {
      this.set(ACCOUNTS_KEY, DEFAULT_ACCOUNTS);
      return DEFAULT_ACCOUNTS;
    }
    return accounts;
  }

  static getForbiddenWords() {
    const words = this.get(FORBIDDEN_WORDS_KEY, null);
    if (!words) {
      this.set(FORBIDDEN_WORDS_KEY, DEFAULT_FORBIDDEN_WORDS);
      return DEFAULT_FORBIDDEN_WORDS;
    }
    return words;
  }

  static setForbiddenWords(words) {
    this.set(FORBIDDEN_WORDS_KEY, words);
  }

  static exportAllData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      [TOPICS_KEY]: this.getTopics(),
      [NOTES_KEY]: this.getNotes(),
      [SCHEDULES_KEY]: this.getSchedules(),
      [INTERACTIONS_KEY]: this.getInteractions(),
      [COMPETITORS_KEY]: this.getCompetitors(),
      [TEMPLATES_KEY]: this.getTemplates(),
      [ACCOUNTS_KEY]: this.getAccounts(),
      [FORBIDDEN_WORDS_KEY]: this.getForbiddenWords()
    };
  }

  static importAllData(data) {
    if (!data || typeof data !== 'object') return false;
    try {
      if (data[TOPICS_KEY]) this.set(TOPICS_KEY, data[TOPICS_KEY]);
      if (data[NOTES_KEY]) this.set(NOTES_KEY, data[NOTES_KEY]);
      if (data[SCHEDULES_KEY]) this.set(SCHEDULES_KEY, data[SCHEDULES_KEY]);
      if (data[INTERACTIONS_KEY]) this.set(INTERACTIONS_KEY, data[INTERACTIONS_KEY]);
      if (data[COMPETITORS_KEY]) this.set(COMPETITORS_KEY, data[COMPETITORS_KEY]);
      if (data[TEMPLATES_KEY]) this.set(TEMPLATES_KEY, data[TEMPLATES_KEY]);
      if (data[ACCOUNTS_KEY]) this.set(ACCOUNTS_KEY, data[ACCOUNTS_KEY]);
      if (data[FORBIDDEN_WORDS_KEY]) this.set(FORBIDDEN_WORDS_KEY, data[FORBIDDEN_WORDS_KEY]);
      return true;
    } catch (e) {
      return false;
    }
  }

  static initMockData() {
    const existingTopics = this.getTopics();
    if (existingTopics.length > 0) return;

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const mockTopics = [
      {
        id: generateId('topic'),
        title: '夏日护肤攻略：油皮如何清爽过夏',
        inspiration: '最近很多粉丝问夏季油皮怎么护肤，出油脱妆问题严重，结合自己3年油皮经验整理一份完整攻略',
        score: 9,
        keywords: ['油皮护肤', '夏日控油', '清爽不脱妆', '护肤步骤'],
        audiences: ['油皮星人', '学生党', '混油肌', '新手小白'],
        category: '美妆护肤',
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('topic'),
        title: '5件必入基础款，衣橱百搭不出错',
        inspiration: '换季整理衣橱发现很多穿不上的，总结发现基础款利用率最高，整理5件最值得投资的单品',
        score: 8,
        keywords: ['基础款', '百搭', '衣橱必备', '极简穿搭'],
        audiences: ['打工人', '学生党', '极简主义', '小个子'],
        category: '穿搭时尚',
        status: 'draft',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('topic'),
        title: '租房改造：500元打造温馨小窝',
        inspiration: '北漂租房第三年，终于把出租屋改成了自己喜欢的样子，总成本才500多',
        score: 10,
        keywords: ['租房改造', '低成本', '温馨小窝', '好物推荐'],
        audiences: ['租房族', '北漂青年', '学生宿舍', '预算有限'],
        category: '家居生活',
        status: 'published',
        createdAt: new Date(now.getTime() - 5 * dayMs).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * dayMs).toISOString()
      },
      {
        id: generateId('topic'),
        title: '平价彩妆测评：开架vs专柜差距有多大',
        inspiration: '最近被种草了很多开架彩妆，买了热门款和专柜对比测一下，看看究竟是不是贵的就好',
        score: 9,
        keywords: ['彩妆测评', '开架彩妆', '专柜对比', '平替'],
        audiences: ['美妆爱好者', '预算有限', '学生党', '成分党'],
        category: '美妆护肤',
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('topic'),
        title: '一周穿搭不重样：通勤约会两不误',
        inspiration: '粉丝说每天不知道穿什么，整理7套不同风格穿搭模板，通勤约会都能穿',
        score: 7,
        keywords: ['一周穿搭', '通勤穿搭', '约会穿搭', '穿搭模板'],
        audiences: ['职场新人', '学生党', '约会穿搭', '懒癌'],
        category: '穿搭时尚',
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];
    this.set(TOPICS_KEY, mockTopics);

    const mockNotes = [
      {
        id: generateId('note'),
        topicId: mockTopics[0].id,
        title: '夏日油皮控油护肤完整步骤',
        content: '姐妹们！油皮夏天真的太难了😭\n\n早上起来T区油到可以煎蛋，下午妆就脱得差不多了...\n\n分享我用了两年的控油护肤法：\n\n☀️【晨间护肤】\n1. 氨基酸洁面（不要过度清洁！）\n2. 清爽型爽肤水（用化妆棉二次清洁）\n3. 烟酰胺精华（控油+提亮）\n4. 无油面霜 / 凝胶\n5. 防晒一定要用清爽款！\n\n🌙【晚间护肤】\n1. 卸妆一定要彻底！\n2. 洁面\n3. 水杨酸棉片擦T区（每周2-3次）\n4. 补水精华（不要用太油的）\n5. 清爽乳液锁水\n\n💡小贴士：每周1次清洁面膜，吸走多余油脂～\n\n按照这个方法坚持一个月，你会发现出油真的少很多！',
        images: [],
        tags: ['油皮护肤', '夏日护肤', '控油'],
        status: 'draft',
        accountId: 'acc_beauty',
        likes: 0,
        favorites: 0,
        comments: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('note'),
        topicId: mockTopics[1].id,
        title: '白T恤选购指南：这5款真的百搭',
        content: '每个女生衣橱里都应该有N件白T恤！\n\n但你真的会挑白T恤吗？\n\n【版型选择】\n✅ 圆领：万能百搭，露出锁骨最显瘦\n✅ V领：显脸小+脖子长，圆脸必备\n❌ 小高领：容易显臃肿\n\n【面料选择】\n⭐ 100%纯棉：舒服但容易变形\n⭐ 棉+涤纶混纺：挺括不易皱\n⭐ 莫代尔：柔软亲肤但显胖\n\n【5件必入基础款】\n1️⃣ 合身圆领白T - 内搭外穿都可以\n2️⃣ 宽松男友风T - 下衣失踪超显瘦\n3️⃣ V领修身T - 配西装裤超有气质\n4️⃣ 短款露腰T - 配高腰裤绝了\n5️⃣ 落肩袖T - 遮手臂肉肉\n\n小tips：买T恤一定要看肩线！肩线刚好在肩膀最外侧最合身～',
        images: [],
        tags: ['基础款', '白T恤', '穿搭干货'],
        status: 'published',
        accountId: 'acc_fashion',
        publishDate: new Date(now.getTime() - 2 * dayMs).toISOString(),
        likes: 3256,
        favorites: 1892,
        comments: 267,
        coverScore: 8.5,
        createdAt: now.toISOString(),
        updatedAt: new Date(now.getTime() - 1 * dayMs).toISOString()
      },
      {
        id: generateId('note'),
        topicId: mockTopics[2].id,
        title: '租房改造｜500元把出租屋变成家',
        content: '租房第三年，终于搬了个小单间！\n\n虽然是租的，但日子是自己的～只花了500多改造，朋友来了都夸好看！\n\n🛒 好物清单（附价格）\n\n✅ 窗帘：39元 - 选了奶油色，遮光又温柔\n✅ 地毯：59元 - 仿羊毛质感，踩上去软软的\n✅ 星星灯带：19.9元 - 晚上开超有氛围\n✅ 挂画x3：30元 - 打印+相框，选自己喜欢的图\n✅ 床上四件套：89元 - 水洗棉超舒服\n✅ 收纳盒x5：45元 - 杂物全收起来\n✅ 床头靠垫：49元 - 靠在床上追剧超爽\n✅ 桌布：19元 - 旧桌子瞬间变新\n✅ 花瓶+假花：25元 - 增添生活气息\n✅ 其他小装饰：100元左右\n\n总共：475.9元！\n\n改造后真的幸福感满满，每天下班回家都超开心～\n\n租房的姐妹们冲呀！花点小钱，生活质量提升不止一点点💕',
        images: [],
        tags: ['租房改造', '低成本', '家居好物'],
        status: 'published',
        accountId: 'acc_life',
        publishDate: new Date(now.getTime() - 3 * dayMs).toISOString(),
        likes: 8921,
        favorites: 6543,
        comments: 512,
        coverScore: 9.3,
        createdAt: now.toISOString(),
        updatedAt: new Date(now.getTime() - 2 * dayMs).toISOString()
      }
    ];
    this.set(NOTES_KEY, mockNotes);

    const day1 = new Date(now.getTime() + 1 * dayMs).toISOString().split('T')[0];
    const day2 = new Date(now.getTime() + 2 * dayMs).toISOString().split('T')[0];
    const day3 = new Date(now.getTime() + 3 * dayMs).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const day5 = new Date(now.getTime() + 5 * dayMs).toISOString().split('T')[0];

    const mockSchedules = [
      {
        id: generateId('schedule'),
        title: '发布：夏日护肤攻略',
        date: day1,
        time: '18:00',
        accountId: 'acc_beauty',
        noteId: mockNotes[0].id,
        column: '护肤干货',
        status: 'pending',
        type: '发布',
        remark: '配3张产品对比图',
        createdAt: now.toISOString()
      },
      {
        id: generateId('schedule'),
        title: '拍摄：一周穿搭',
        date: day2,
        time: '10:00',
        accountId: 'acc_fashion',
        column: '穿搭合集',
        status: 'pending',
        type: '拍摄',
        remark: '7套穿搭+细节图',
        createdAt: now.toISOString()
      },
      {
        id: generateId('schedule'),
        title: '回复昨日笔记评论',
        date: today,
        time: '20:00',
        accountId: 'acc_main',
        column: '日常维护',
        status: 'done',
        type: '互动',
        remark: '',
        createdAt: now.toISOString()
      },
      {
        id: generateId('schedule'),
        title: '竞品数据分析',
        date: day3,
        time: '14:00',
        accountId: 'acc_main',
        column: '运营复盘',
        status: 'pending',
        type: '分析',
        remark: '整理本周爆款笔记',
        createdAt: now.toISOString()
      },
      {
        id: generateId('schedule'),
        title: '直播：夏日好物分享',
        date: day5,
        time: '19:30',
        accountId: 'acc_beauty',
        column: '品牌合作',
        status: 'pending',
        type: '直播',
        remark: '确认产品链接和脚本',
        createdAt: now.toISOString()
      }
    ];
    this.set(SCHEDULES_KEY, mockSchedules);

    const mockInteractions = [
      {
        id: generateId('interaction'),
        type: 'comment',
        username: '小草莓🍓',
        userAvatar: '',
        content: '请问烟酰胺精华有推荐的牌子吗？',
        noteId: mockNotes[0].id,
        noteTitle: '夏日油皮控油护肤完整步骤',
        status: 'pending',
        createdAt: now.toISOString()
      },
      {
        id: generateId('interaction'),
        type: 'comment',
        username: '柠檬不萌',
        userAvatar: '',
        content: '地毯有链接吗？求求了！颜色太好看了',
        noteId: mockNotes[2].id,
        noteTitle: '租房改造｜500元把出租屋变成家',
        reply: '已私发链接啦～注意查收💕',
        status: 'replied',
        createdAt: new Date(now.getTime() - 1 * dayMs).toISOString()
      },
      {
        id: generateId('interaction'),
        type: 'question',
        username: '整理收藏',
        userAvatar: '',
        content: '粉丝收藏的问题：小个子适合穿男友风T恤吗？会不会更显矮？',
        noteId: mockNotes[1].id,
        noteTitle: '白T恤选购指南：这5款真的百搭',
        status: 'pending',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('interaction'),
        type: 'dm',
        username: '护肤小白',
        userAvatar: '',
        content: '您好！我是敏感肌，想请问水杨酸棉片可以每天用吗？',
        noteId: null,
        noteTitle: '私信咨询',
        status: 'pending',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('interaction'),
        type: 'todo',
        username: '',
        title: '整理本周热门评论，做成Q&A笔记发布',
        content: '整理本周热门评论，做成Q&A笔记发布',
        priority: 'high',
        dueDate: day2,
        assignee: '小美',
        completed: false,
        sourceType: 'interaction',
        createdAt: now.toISOString()
      },
      {
        id: generateId('interaction'),
        type: 'todo',
        username: '',
        title: '回复租房改造笔记的所有链接请求',
        content: '回复租房改造笔记的所有链接请求',
        priority: 'medium',
        dueDate: today,
        assignee: '运营组',
        completed: true,
        sourceType: 'interaction',
        createdAt: new Date(now.getTime() - 1 * dayMs).toISOString()
      }
    ];
    this.set(INTERACTIONS_KEY, mockInteractions);

    const mockCompetitors = [
      {
        id: generateId('competitor'),
        title: '油皮夏日护肤｜这套控油组合真的绝了',
        account: '美妆日记小美',
        accountAvatar: '',
        url: '',
        cover: '',
        likes: 12560,
        favorites: 8930,
        comments: 845,
        tags: ['油皮护肤', '夏日控油', '护肤干货'],
        status: 'monitoring',
        recordDate: new Date(now.getTime() - 4 * dayMs).toISOString().split('T')[0],
        insights: '标题用了"真的绝了"情感词+emoji，封面是前后对比图，互动率很高',
        notes: '标题用了"真的绝了"情感词+emoji，封面是前后对比图，互动率很高',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('competitor'),
        title: '155小个子穿搭｜显高10cm的秘密',
        account: '穿搭达人Lily',
        accountAvatar: '',
        url: '',
        cover: '',
        likes: 23450,
        favorites: 15670,
        comments: 1230,
        tags: ['小个子穿搭', '显高技巧', '显瘦穿搭'],
        status: 'monitoring',
        recordDate: new Date(now.getTime() - 6 * dayMs).toISOString().split('T')[0],
        insights: '数字标题"155"和"10cm"吸引点击，封面是对比图效果好',
        notes: '数字标题"155"和"10cm"吸引点击，封面是对比图效果好',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: generateId('competitor'),
        title: '300元改造宿舍｜学生党必看',
        account: '生活研究所',
        accountAvatar: '',
        url: '',
        cover: '',
        likes: 45680,
        favorites: 32100,
        comments: 2340,
        tags: ['宿舍改造', '学生党', '低成本'],
        status: 'monitoring',
        recordDate: new Date(now.getTime() - 7 * dayMs).toISOString().split('T')[0],
        insights: '价格锚点"300元"很有吸引力，受众明确是学生党，before/after封面点击高',
        notes: '价格锚点"300元"很有吸引力，受众明确是学生党，before/after封面点击高',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];
    this.set(COMPETITORS_KEY, mockCompetitors);
  }
}
