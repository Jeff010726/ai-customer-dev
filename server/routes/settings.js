const express = require('express');
const { Setting } = require('../models');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');

const router = express.Router();

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    
    res.json({ 
      success: true, 
      data: settingsMap,
      message: '设置获取成功' 
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: '获取设置失败' }
    });
  }
});

// 更新单个设置
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const [setting, created] = await Setting.findOrCreate({
      where: { key },
      defaults: { 
        key, 
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        type: typeof value,
        category: 'general'
      }
    });
    
    if (!created) {
      setting.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
      setting.type = typeof value;
      await setting.save();
    }
    
    res.json({ 
      success: true, 
      data: setting,
      message: '设置更新成功' 
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: '更新设置失败' }
    });
  }
});

// 测试邮箱配置
router.post('/test-email', async (req, res) => {
  try {
    const { host, port, user, pass } = req.body;
    
    if (!host || !port || !user || !pass) {
      return res.status(400).json({
        success: false,
        error: { message: '邮箱配置信息不完整' }
      });
    }
    
    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: false,
      auth: {
        user: user,
        pass: pass
      }
    });
    
    // 验证连接
    await transporter.verify();
    
    // 发送测试邮件
    await transporter.sendMail({
      from: `"AI客户开发系统" <${user}>`,
      to: user,
      subject: '邮箱配置测试成功',
      text: '恭喜！您的邮箱SMTP配置已经成功。AI客户开发系统可以正常发送邮件了。',
      html: `
        <h2>🎉 邮箱配置测试成功</h2>
        <p>恭喜！您的邮箱SMTP配置已经成功。</p>
        <p><strong>AI客户开发系统</strong>可以正常发送邮件了。</p>
        <hr>
        <small>此邮件由AI客户开发系统自动发送</small>
      `
    });
    
    res.json({ 
      success: true, 
      message: '邮箱配置测试成功！测试邮件已发送' 
    });
  } catch (error) {
    console.error('邮箱测试失败:', error);
    res.status(400).json({ 
      success: false, 
      error: { message: `邮箱测试失败: ${error.message}` }
    });
  }
});

// 测试AI配置
router.post('/test-ai', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(400).json({
        success: false,
        error: { message: 'AI API密钥未配置或无效' }
      });
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      timeout: 60000, // 30秒超时
    });
    
    // 测试API调用
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "请回复'AI连接成功！'" }],
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      max_tokens: 20,
      temperature: 0
    });
    
    res.json({ 
      success: true, 
      data: {
        response: completion.choices[0].message.content,
        model: completion.model,
        usage: completion.usage
      },
      message: 'AI API连接测试成功' 
    });
  } catch (error) {
    console.error('OpenAI测试失败:', error);
    
    let errorMessage = 'AI API连接失败';
    
    if (error.code === 'ETIMEDOUT' || error.type === 'system') {
      errorMessage = '网络连接超时，请检查网络或代理设置';
    } else if (error.status === 401) {
      errorMessage = 'API密钥无效，请检查您的DeepSeek密钥';
    } else if (error.status === 429) {
      errorMessage = 'API配额用完或请求过于频繁';
    } else if (error.status === 403) {
      errorMessage = 'API访问被拒绝，请检查您的账户状态';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(400).json({ 
      success: false, 
      error: { message: errorMessage }
    });
  }
});

// 批量更新设置
router.post('/batch', async (req, res) => {
  try {
    const settings = req.body;
    const results = [];
    
    for (const [key, value] of Object.entries(settings)) {
      const [setting, created] = await Setting.findOrCreate({
        where: { key },
        defaults: { 
          key, 
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          type: typeof value,
          category: 'general'
        }
      });
      
      if (!created) {
        setting.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
        setting.type = typeof value;
        await setting.save();
      }
      
      results.push(setting);
    }
    
    res.json({ 
      success: true, 
      data: results,
      message: '批量设置更新成功' 
    });
  } catch (error) {
    console.error('批量更新设置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: '批量更新设置失败' }
    });
  }
});

module.exports = router; 