module.exports = (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '活动名称'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '活动描述'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'active', 'paused', 'completed', 'cancelled']]
      },
      comment: '活动状态'
    },
    
    // 搜索配置
    search_platforms: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('search_platforms');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('search_platforms', JSON.stringify(value || []));
      },
      comment: '搜索平台列表'
    },
    search_keywords: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('search_keywords');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('search_keywords', JSON.stringify(value || []));
      },
      comment: '搜索关键词'
    },
    
    // AI邮件生成配置
    email_config: {
      type: DataTypes.TEXT,
      defaultValue: JSON.stringify({
        product_description: '',
        service_description: '',
        writing_style: 'professional',
        tone: 'friendly',
        sender_name: '',
        sender_title: '',
        company_info: '',
        call_to_action: '',
        custom_prompt: ''
      }),
      get() {
        const rawValue = this.getDataValue('email_config');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('email_config', JSON.stringify(value || {}));
      },
      comment: 'AI邮件生成配置'
    },
    
    // 自动化配置
    automation_config: {
      type: DataTypes.TEXT,
      defaultValue: JSON.stringify({
        auto_search: false,
        auto_send: false,
        emails_per_hour: 10,
        max_retries: 3,
        search_interval_hours: 24,
        duplicate_check: true
      }),
      get() {
        const rawValue = this.getDataValue('automation_config');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('automation_config', JSON.stringify(value || {}));
      },
      comment: '自动化处理配置'
    },
    search_filters: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('search_filters');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('search_filters', JSON.stringify(value || {}));
      },
      comment: '搜索过滤器'
    },
    
    // 邮件配置
    email_template_id: {
      type: DataTypes.UUID,
      comment: '邮件模板ID'
    },
    
    // 发送策略
    send_strategy: {
      type: DataTypes.TEXT,
      defaultValue: JSON.stringify({
        daily_limit: 50,
        interval_minutes: 30,
        working_hours: {
          start: '09:00',
          end: '18:00'
        },
        working_days: [1, 2, 3, 4, 5], // 周一到周五
        timezone: 'Asia/Shanghai'
      }),
      get() {
        const rawValue = this.getDataValue('send_strategy');
        return rawValue ? JSON.parse(rawValue) : {
          daily_limit: 50,
          interval_minutes: 30,
          working_hours: { start: '09:00', end: '18:00' },
          working_days: [1, 2, 3, 4, 5],
          timezone: 'Asia/Shanghai'
        };
      },
      set(value) {
        this.setDataValue('send_strategy', JSON.stringify(value || {}));
      },
      comment: '发送策略配置'
    },
    
    // 统计数据
    total_searched: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总搜索数量'
    },
    total_emails_sent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总发送邮件数'
    },
    total_replies: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总回复数'
    },
    
    // 时间配置
    start_date: {
      type: DataTypes.DATE,
      comment: '开始时间'
    },
    end_date: {
      type: DataTypes.DATE,
      comment: '结束时间'
    },
    
    // 配置选项
    settings: {
      type: DataTypes.TEXT,
      defaultValue: JSON.stringify({
        anti_detection: true,
        random_delay: true,
        human_simulation: true,
        duplicate_check: true
      }),
      get() {
        const rawValue = this.getDataValue('settings');
        return rawValue ? JSON.parse(rawValue) : {
          anti_detection: true,
          random_delay: true,
          human_simulation: true,
          duplicate_check: true
        };
      },
      set(value) {
        this.setDataValue('settings', JSON.stringify(value || {}));
      },
      comment: '活动配置'
    }
  }, {
    tableName: 'campaigns',
    comment: '营销活动表'
  });

  // 模型关联
  Campaign.associate = (models) => {
    // 一个活动有多个客户
    Campaign.hasMany(models.Customer, {
      foreignKey: 'campaign_id',
      as: 'customers'
    });
    
    // 一个活动有多个邮件
    Campaign.hasMany(models.Email, {
      foreignKey: 'campaign_id',
      as: 'emails'
    });
    
    // 一个活动有多个搜索结果
    Campaign.hasMany(models.SearchResult, {
      foreignKey: 'campaign_id',
      as: 'search_results'
    });
    
    // 一个活动属于一个邮件模板
    Campaign.belongsTo(models.EmailTemplate, {
      foreignKey: 'email_template_id',
      as: 'email_template'
    });
    
    // 一个活动有多个报告
    Campaign.hasMany(models.Report, {
      foreignKey: 'campaign_id',
      as: 'reports'
    });
  };

  // 实例方法
  Campaign.prototype.getSuccessRate = function() {
    if (this.total_emails_sent === 0) return 0;
    return ((this.total_replies / this.total_emails_sent) * 100).toFixed(2);
  };

  Campaign.prototype.isActive = function() {
    return this.status === 'active';
  };

  Campaign.prototype.canSendEmail = function() {
    const now = new Date();
    if (this.end_date && now > this.end_date) return false;
    if (this.start_date && now < this.start_date) return false;
    return this.status === 'active';
  };

  // 类方法
  Campaign.getActiveStats = async function() {
    const activeCount = await this.count({ where: { status: 'active' } });
    const totalEmails = await this.sum('total_emails_sent');
    const totalReplies = await this.sum('total_replies');
    
    return {
      active_campaigns: activeCount,
      total_emails_sent: totalEmails || 0,
      total_replies: totalReplies || 0,
      success_rate: totalEmails ? ((totalReplies / totalEmails) * 100).toFixed(2) : 0
    };
  };

  return Campaign;
}; 