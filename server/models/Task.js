module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // 任务基本信息
    type: {
      type: DataTypes.ENUM('email_send', 'customer_search', 'email_generate'),
      allowNull: false,
      comment: '任务类型'
    },
    
    // 任务状态
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending',
      comment: '任务状态'
    },
    
    // 优先级
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '任务优先级，数字越大优先级越高'
    },
    
    // 关联信息
    campaign_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'campaigns',
        key: 'id'
      },
      comment: '所属活动ID'
    },
    
    customer_id: {
      type: DataTypes.UUID,
      references: {
        model: 'customers',
        key: 'id'
      },
      comment: '目标客户ID'
    },
    
    email_id: {
      type: DataTypes.UUID,
      references: {
        model: 'emails',
        key: 'id'
      },
      comment: '关联邮件ID'
    },
    
    // 任务数据
    task_data: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('task_data');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('task_data', JSON.stringify(value || {}));
      },
      comment: '任务相关数据'
    },
    
    // 执行信息
    scheduled_at: {
      type: DataTypes.DATE,
      comment: '计划执行时间'
    },
    
    started_at: {
      type: DataTypes.DATE,
      comment: '开始执行时间'
    },
    
    completed_at: {
      type: DataTypes.DATE,
      comment: '完成时间'
    },
    
    // 重试机制
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '重试次数'
    },
    
    max_retries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '最大重试次数'
    },
    
    // 错误信息
    error_message: {
      type: DataTypes.TEXT,
      comment: '错误信息'
    },
    
    error_details: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('error_details');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('error_details', JSON.stringify(value || {}));
      },
      comment: '详细错误信息'
    },
    
    // 执行结果
    result: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('result');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('result', JSON.stringify(value || {}));
      },
      comment: '执行结果'
    },
    
    // 元数据
    metadata: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('metadata');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('metadata', JSON.stringify(value || {}));
      },
      comment: '任务元数据'
    }
  }, {
    tableName: 'tasks',
    comment: '任务管理表',
    indexes: [
      {
        fields: ['campaign_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['scheduled_at']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 定义关联关系
  Task.associate = function(models) {
    // 任务属于活动
    Task.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });
    
    // 任务关联客户
    Task.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });
    
    // 任务关联邮件
    Task.belongsTo(models.Email, {
      foreignKey: 'email_id',
      as: 'email'
    });
  };

  return Task;
};