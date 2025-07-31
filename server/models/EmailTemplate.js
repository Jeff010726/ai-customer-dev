module.exports = (sequelize, DataTypes) => {
  const EmailTemplate = sequelize.define('EmailTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '模板名称'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '模板描述'
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '邮件主题模板'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '邮件内容模板'
    },
    html_content: {
      type: DataTypes.TEXT,
      comment: 'HTML内容模板'
    },
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '模板变量列表'
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general',
      comment: '模板分类'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
    }
  }, {
    tableName: 'email_templates',
    comment: '邮件模板表'
  });

  EmailTemplate.associate = (models) => {
    EmailTemplate.hasMany(models.Campaign, {
      foreignKey: 'email_template_id',
      as: 'campaigns'
    });
    
    EmailTemplate.hasMany(models.Email, {
      foreignKey: 'template_id',
      as: 'emails'
    });
  };

  return EmailTemplate;
}; 