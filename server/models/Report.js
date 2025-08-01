module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'campaign'),
      allowNull: false,
      comment: '报告类型'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '报告标题'
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '报告数据'
    },
    period_start: {
      type: DataTypes.DATE,
      comment: '统计开始时间'
    },
    period_end: {
      type: DataTypes.DATE,
      comment: '统计结束时间'
    },
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: 'campaigns',
        key: 'id'
      },
      comment: '关联活动ID'
    }
  }, {
    tableName: 'reports',
    comment: '报告表'
  });

  Report.associate = (models) => {
    Report.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });
  };

  return Report;
}; 