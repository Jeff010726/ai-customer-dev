const { Sequelize } = require('sequelize');
const path = require('path');

// 数据库配置
const sequelize = new Sequelize({
  dialect: process.env.DATABASE_DIALECT || 'sqlite',
  storage: process.env.DATABASE_URL || path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// 导入模型
const Campaign = require('./Campaign')(sequelize, Sequelize.DataTypes);
const Customer = require('./Customer')(sequelize, Sequelize.DataTypes);
const Email = require('./Email')(sequelize, Sequelize.DataTypes);
const EmailTemplate = require('./EmailTemplate')(sequelize, Sequelize.DataTypes);
const SearchResult = require('./SearchResult')(sequelize, Sequelize.DataTypes);
const Setting = require('./Setting')(sequelize, Sequelize.DataTypes);
const Report = require('./Report')(sequelize, Sequelize.DataTypes);
const Task = require('./Task')(sequelize, Sequelize.DataTypes);

// 定义模型关联
const models = {
  Campaign,
  Customer,
  Email,
  EmailTemplate,
  SearchResult,
  Setting,
  Report,
  Task
};

// 设置模型关联
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// 导出
module.exports = {
  sequelize,
  Sequelize,
  ...models
}; 