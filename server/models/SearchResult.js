module.exports = (sequelize, DataTypes) => {
  const SearchResult = sequelize.define('SearchResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '搜索平台'
    },
    keywords: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '搜索关键词'
    },
    url: {
      type: DataTypes.TEXT,
      comment: '结果URL'
    },
    title: {
      type: DataTypes.STRING,
      comment: '标题'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '描述'
    },
    extracted_data: {
      type: DataTypes.TEXT,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('extracted_data');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('extracted_data', JSON.stringify(value || {}));
      },
      comment: '提取的数据'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processed', 'failed']]
      },
      comment: '处理状态'
    },
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: 'Campaign',
        key: 'id'
      }
    },
    customer_id: {
      type: DataTypes.UUID,
      references: {
        model: 'Customer',
        key: 'id'
      }
    }
  }, {
    tableName: 'search_results',
    comment: '搜索结果表'
  });

  SearchResult.associate = (models) => {
    SearchResult.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });
    
    SearchResult.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });
  };

  return SearchResult;
}; 