const { Setting } = require('../models');

/**
 * 从数据库获取邮箱配置
 * @returns {Promise<Object>} 邮箱配置对象
 */
async function getEmailConfig() {
  try {
    const settings = await Setting.findAll({
      where: {
        key: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'from_name']
      }
    });
    
    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });
    
    // 如果数据库中没有配置，返回默认配置（环境变量）
    return {
      host: config.smtp_host || process.env.SMTP_HOST,
      port: parseInt(config.smtp_port || process.env.SMTP_PORT || '465'),
      secure: config.smtp_secure === 'true' || config.smtp_secure === true || parseInt(config.smtp_port || process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: config.smtp_user || process.env.SMTP_USER,
        pass: config.smtp_pass || process.env.SMTP_PASS
      },
      from_name: config.from_name || process.env.FROM_NAME || 'AI客户开发系统',
      from_email: config.smtp_user || process.env.SMTP_USER
    };
  } catch (error) {
    console.error('获取邮箱配置失败:', error);
    // 返回环境变量配置作为后备
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from_name: process.env.FROM_NAME || 'AI客户开发系统',
      from_email: process.env.SMTP_USER
    };
  }
}

/**
 * 验证邮箱配置是否完整
 * @param {Object} config 邮箱配置
 * @returns {boolean} 是否有效
 */
function validateEmailConfig(config) {
  return !!(config.host && config.port && config.auth.user && config.auth.pass);
}

module.exports = {
  getEmailConfig,
  validateEmailConfig
};