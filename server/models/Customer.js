module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // 基本信息
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: '邮箱地址'
    },
    name: {
      type: DataTypes.STRING,
      comment: '姓名或公司名'
    },
    company: {
      type: DataTypes.STRING,
      comment: '公司名称'
    },
    website: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      },
      comment: '网站地址'
    },
    phone: {
      type: DataTypes.STRING,
      comment: '电话号码'
    },
    
    // 地理位置
    country: {
      type: DataTypes.STRING,
      comment: '国家'
    },
    city: {
      type: DataTypes.STRING,
      comment: '城市'
    },
    address: {
      type: DataTypes.TEXT,
      comment: '详细地址'
    },
    
    // 业务信息
    business_type: {
      type: DataTypes.STRING,
      comment: '业务类型'
    },
    industry: {
      type: DataTypes.STRING,
      comment: '行业'
    },
    company_size: {
      type: DataTypes.ENUM('个人', '小型(1-10人)', '中型(11-50人)', '大型(51-200人)', '企业(200+人)'),
      comment: '公司规模'
    },
    
    // 联系状态
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'replied', 'interested', 'not_interested', 'bounced', 'blacklisted'),
      defaultValue: 'new',
      comment: '联系状态'
    },
    
    // 来源信息
    source_platform: {
      type: DataTypes.STRING,
      comment: '来源平台'
    },
    source_url: {
      type: DataTypes.TEXT,
      comment: '来源URL'
    },
    source_keywords: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '搜索关键词'
    },
    
    // 社交媒体
    social_media: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '社交媒体信息'
    },
    
    // 备注和标签
    notes: {
      type: DataTypes.TEXT,
      comment: '备注信息'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '标签'
    },
    
    // 评分和优先级
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: '客户评分(0-100)'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      comment: '优先级'
    },
    
    // 联系次数和最后联系时间
    contact_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '联系次数'
    },
    last_contacted_at: {
      type: DataTypes.DATE,
      comment: '最后联系时间'
    },
    last_replied_at: {
      type: DataTypes.DATE,
      comment: '最后回复时间'
    },
    
    // 关联活动
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: 'Campaign',
        key: 'id'
      },
      comment: '关联活动ID'
    },
    
    // 额外数据
    custom_fields: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '自定义字段'
    },
    
    // 质量标记
    is_valid_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '邮箱是否有效'
    },
    is_duplicate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否重复'
    }
  }, {
    tableName: 'customers',
    comment: '客户信息表',
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['company']
      },
      {
        fields: ['status']
      },
      {
        fields: ['campaign_id']
      },
      {
        fields: ['source_platform']
      },
      {
        fields: ['last_contacted_at']
      }
    ]
  });

  // 模型关联
  Customer.associate = (models) => {
    // 一个客户属于一个活动
    Customer.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });
    
    // 一个客户有多个邮件
    Customer.hasMany(models.Email, {
      foreignKey: 'customer_id',
      as: 'emails'
    });
    
    // 一个客户可能有多个搜索结果记录
    Customer.hasMany(models.SearchResult, {
      foreignKey: 'customer_id',
      as: 'search_results'
    });
  };

  // 实例方法
  Customer.prototype.getFullName = function() {
    if (this.name && this.company) {
      return `${this.name} (${this.company})`;
    }
    return this.name || this.company || this.email;
  };

  Customer.prototype.isContactable = function() {
    return this.status !== 'blacklisted' && 
           this.status !== 'not_interested' && 
           this.is_valid_email;
  };

  Customer.prototype.updateContactInfo = function() {
    this.contact_count += 1;
    this.last_contacted_at = new Date();
    if (this.status === 'new') {
      this.status = 'contacted';
    }
  };

  Customer.prototype.markAsReplied = function() {
    this.status = 'replied';
    this.last_replied_at = new Date();
  };

  // 计算客户价值评分
  Customer.prototype.calculateScore = function() {
    let score = 50; // 基础分数
    
    // 根据公司规模加分
    const sizeScores = {
      '个人': 10,
      '小型(1-10人)': 20,
      '中型(11-50人)': 40,
      '大型(51-200人)': 60,
      '企业(200+人)': 80
    };
    score += sizeScores[this.company_size] || 0;
    
    // 有网站加分
    if (this.website) score += 10;
    
    // 有社交媒体加分
    if (this.social_media && Object.keys(this.social_media).length > 0) {
      score += 5;
    }
    
    // 根据联系状态调整
    const statusScores = {
      'new': 0,
      'contacted': -5,
      'replied': 20,
      'interested': 30,
      'not_interested': -50,
      'bounced': -30,
      'blacklisted': -100
    };
    score += statusScores[this.status] || 0;
    
    // 确保分数在0-100范围内
    this.score = Math.max(0, Math.min(100, score));
    return this.score;
  };

  // 类方法
  Customer.getStatusStats = async function(campaignId = null) {
    const whereClause = campaignId ? { campaign_id: campaignId } : {};
    
    const stats = await this.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    const result = {};
    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
    });
    
    return result;
  };

  // 查找重复客户
  Customer.findDuplicates = async function() {
    const duplicates = await this.findAll({
      attributes: [
        'email',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['email'],
      having: sequelize.where(sequelize.fn('COUNT', '*'), '>', 1),
      raw: true
    });
    
    return duplicates;
  };

  // 批量更新重复标记
  Customer.markDuplicates = async function() {
    const duplicateEmails = await this.findDuplicates();
    
    for (const duplicate of duplicateEmails) {
      await this.update(
        { is_duplicate: true },
        { 
          where: { email: duplicate.email },
          limit: duplicate.count - 1 // 保留一个，其他标记为重复
        }
      );
    }
    
    return duplicateEmails.length;
  };

  return Customer;
}; 