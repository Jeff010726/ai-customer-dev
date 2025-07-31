module.exports = (sequelize, DataTypes) => {
  const Email = sequelize.define('Email', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // 邮件内容
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '邮件主题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '邮件内容'
    },
    html_content: {
      type: DataTypes.TEXT,
      comment: 'HTML邮件内容'
    },
    
    // 收发信息
    from_email: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '发件人邮箱'
    },
    from_name: {
      type: DataTypes.STRING,
      comment: '发件人姓名'
    },
    to_email: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '收件人邮箱'
    },
    to_name: {
      type: DataTypes.STRING,
      comment: '收件人姓名'
    },
    
    // 状态信息
    status: {
      type: DataTypes.ENUM('draft', 'queued', 'sending', 'sent', 'delivered', 'bounced', 'failed', 'replied'),
      defaultValue: 'draft',
      comment: '邮件状态'
    },
    
    // 时间信息
    scheduled_at: {
      type: DataTypes.DATE,
      comment: '计划发送时间'
    },
    sent_at: {
      type: DataTypes.DATE,
      comment: '实际发送时间'
    },
    delivered_at: {
      type: DataTypes.DATE,
      comment: '送达时间'
    },
    opened_at: {
      type: DataTypes.DATE,
      comment: '首次打开时间'
    },
    replied_at: {
      type: DataTypes.DATE,
      comment: '回复时间'
    },
    
    // 统计信息
    open_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '打开次数'
    },
    click_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '点击次数'
    },
    
    // 错误信息
    error_message: {
      type: DataTypes.TEXT,
      comment: '错误信息'
    },
    bounce_type: {
      type: DataTypes.ENUM('hard', 'soft', 'complaint'),
      comment: '退信类型'
    },
    
    // 关联信息
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: 'Campaign',
        key: 'id'
      },
      comment: '活动ID'
    },
    customer_id: {
      type: DataTypes.UUID,
      references: {
        model: 'Customer',
        key: 'id'
      },
      comment: '客户ID'
    },
    template_id: {
      type: DataTypes.UUID,
      references: {
        model: 'EmailTemplate',
        key: 'id'
      },
      comment: '模板ID'
    },
    
    // 邮件服务商信息
    provider: {
      type: DataTypes.STRING,
      comment: '邮件服务商'
    },
    provider_id: {
      type: DataTypes.STRING,
      comment: '服务商邮件ID'
    },
    
    // 附加信息
    headers: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '邮件头信息'
    },
    tracking_data: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '追踪数据'
    },
    
    // 个性化变量
    variables: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '模板变量'
    },
    
    // 重试信息
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '重试次数'
    },
    max_retries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '最大重试次数'
    }
  }, {
    tableName: 'emails',
    comment: '邮件记录表',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['campaign_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['to_email']
      },
      {
        fields: ['sent_at']
      },
      {
        fields: ['scheduled_at']
      }
    ]
  });

  // 模型关联
  Email.associate = (models) => {
    // 一封邮件属于一个活动
    Email.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });
    
    // 一封邮件属于一个客户
    Email.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });
    
    // 一封邮件使用一个模板
    Email.belongsTo(models.EmailTemplate, {
      foreignKey: 'template_id',
      as: 'template'
    });
  };

  // 实例方法
  Email.prototype.isSent = function() {
    return ['sent', 'delivered', 'bounced', 'replied'].includes(this.status);
  };

  Email.prototype.isDelivered = function() {
    return ['delivered', 'replied'].includes(this.status);
  };

  Email.prototype.canRetry = function() {
    return this.status === 'failed' && 
           this.retry_count < this.max_retries;
  };

  Email.prototype.markAsSent = function() {
    this.status = 'sent';
    this.sent_at = new Date();
  };

  Email.prototype.markAsDelivered = function() {
    this.status = 'delivered';
    this.delivered_at = new Date();
  };

  Email.prototype.markAsOpened = function() {
    if (!this.opened_at) {
      this.opened_at = new Date();
    }
    this.open_count += 1;
  };

  Email.prototype.markAsClicked = function() {
    this.click_count += 1;
  };

  Email.prototype.markAsReplied = function() {
    this.status = 'replied';
    this.replied_at = new Date();
  };

  Email.prototype.markAsFailed = function(errorMessage) {
    this.status = 'failed';
    this.error_message = errorMessage;
    this.retry_count += 1;
  };

  Email.prototype.markAsBounced = function(bounceType, errorMessage) {
    this.status = 'bounced';
    this.bounce_type = bounceType;
    this.error_message = errorMessage;
  };

  // 类方法
  Email.getDeliveryStats = async function(campaignId = null, days = 30) {
    const whereClause = {
      created_at: {
        [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    };
    
    if (campaignId) {
      whereClause.campaign_id = campaignId;
    }
    
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

  Email.getPerformanceMetrics = async function(campaignId = null) {
    const whereClause = {};
    if (campaignId) {
      whereClause.campaign_id = campaignId;
    }
    
    const totalSent = await this.count({
      where: { ...whereClause, status: ['sent', 'delivered', 'replied'] }
    });
    
    const totalDelivered = await this.count({
      where: { ...whereClause, status: ['delivered', 'replied'] }
    });
    
    const totalOpened = await this.count({
      where: { 
        ...whereClause, 
        opened_at: { [sequelize.Sequelize.Op.ne]: null }
      }
    });
    
    const totalClicked = await this.count({
      where: { 
        ...whereClause, 
        click_count: { [sequelize.Sequelize.Op.gt]: 0 }
      }
    });
    
    const totalReplied = await this.count({
      where: { ...whereClause, status: 'replied' }
    });
    
    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      total_replied: totalReplied,
      delivery_rate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0,
      open_rate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(2) : 0,
      click_rate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(2) : 0,
      reply_rate: totalDelivered > 0 ? ((totalReplied / totalDelivered) * 100).toFixed(2) : 0
    };
  };

  // 获取待发送邮件
  Email.getPendingEmails = async function(limit = 10) {
    const now = new Date();
    
    return await this.findAll({
      where: {
        status: 'queued',
        scheduled_at: {
          [sequelize.Sequelize.Op.lte]: now
        }
      },
      order: [['scheduled_at', 'ASC']],
      limit,
      include: [
        {
          model: this.sequelize.models.Customer,
          as: 'customer'
        },
        {
          model: this.sequelize.models.Campaign,
          as: 'campaign'
        }
      ]
    });
  };

  return Email;
}; 