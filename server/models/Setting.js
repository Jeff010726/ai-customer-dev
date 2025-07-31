module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '设置键'
    },
    value: {
      type: DataTypes.TEXT,
      comment: '设置值'
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'string',
      validate: {
        isIn: [['string', 'number', 'boolean', 'json']]
      },
      comment: '值类型'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '设置描述'
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general',
      comment: '设置分类'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否公开'
    }
  }, {
    tableName: 'settings',
    comment: '系统设置表'
  });

  return Setting;
}; 