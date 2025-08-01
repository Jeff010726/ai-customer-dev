const express = require('express');
const { Email, Customer, Campaign, EmailTemplate } = require('../models');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');

const router = express.Router();

// 获取所有邮件
router.get('/', async (req, res) => {
  try {
    const { campaignId, status, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (campaignId) where.campaign_id = campaignId;
    if (status) where.status = status;
    
    const emails = await Email.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: Campaign,
          as: 'campaign'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        emails: emails.rows,
        total: emails.count,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(emails.count / limit)
      }
    });
  } catch (error) {
    console.error('获取邮件列表失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取邮件列表失败' }
    });
  }
});

// 生成邮件内容
router.post('/generate', async (req, res) => {
  try {
    const { customerId, campaignId, templateType = 'introduction' } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: { message: '客户ID不能为空' }
      });
    }
    
    // 获取客户信息
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Campaign,
          as: 'campaign'
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { message: '客户不存在' }
      });
    }
    
    // 检查API配置
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
      return res.status(400).json({
        success: false,
        error: { message: 'AI API密钥未配置，请先在系统设置中配置DeepSeek API密钥' }
      });
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      timeout: 30000,
    });
    
    // 构建提示词
    const customerInfo = {
      name: customer.name || '尊敬的客户',
      company: customer.company || '',
      industry: customer.industry || '',
      website: customer.website || '',
      source_platform: customer.source_platform || ''
    };
    
    const prompt = `请帮我写一封专业的商务开发信，用于联系潜在的买手店客户。

客户信息：
- 客户姓名/公司: ${customerInfo.name}
- 公司名称: ${customerInfo.company}
- 行业: ${customerInfo.industry}
- 网站: ${customerInfo.website}
- 发现渠道: ${customerInfo.source_platform}

要求：
1. 语气要专业、友好、不卑不亢
2. 突出我们的产品优势和合作价值
3. 内容要个性化，体现对客户业务的了解
4. 邮件长度适中，不要太长
5. 包含清晰的合作邀请和下一步行动
6. 语言要自然，避免过于销售化

请生成邮件主题和正文内容。格式如下：
主题：[邮件主题]
正文：[邮件正文]`;
    
    // 调用AI生成内容
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "你是一个专业的商务开发专家，擅长写个性化的客户开发邮件。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      max_tokens: 800,
      temperature: 0.7
    });
    
    const generatedContent = completion.choices[0].message.content;
    
    // 解析生成的内容
    const lines = generatedContent.split('\n');
    let subject = '';
    let content = '';
    let isContent = false;
    
    for (const line of lines) {
      if (line.startsWith('主题：')) {
        subject = line.replace('主题：', '').trim();
      } else if (line.startsWith('正文：')) {
        isContent = true;
        content = line.replace('正文：', '').trim();
      } else if (isContent && line.trim()) {
        content += '\n' + line;
      }
    }
    
    // 如果解析失败，使用默认格式
    if (!subject) {
      subject = `关于合作机会 - ${customerInfo.company || customerInfo.name}`;
    }
    
    if (!content) {
      content = generatedContent;
    }
    
    // 创建邮件记录
    const email = await Email.create({
      subject: subject,
      content: content.trim(),
      from_email: process.env.FROM_EMAIL || process.env.SMTP_USER || 'jeff@aimorelogy.com',
      from_name: process.env.FROM_NAME || 'AI客户开发系统',
      to_email: customer.email,
      to_name: customer.name,
      status: 'draft',
      campaign_id: campaignId || customer.campaign_id,
      customer_id: customerId,
      variables: {
        customer_name: customerInfo.name,
        company_name: customerInfo.company,
        industry: customerInfo.industry
      }
    });
    
    res.json({
      success: true,
      data: {
        email,
        generatedContent: {
          subject,
          content: content.trim()
        },
        usage: completion.usage
      },
      message: 'AI邮件内容生成成功'
    });
    
  } catch (error) {
    console.error('生成邮件内容失败:', error);
    
    let errorMessage = '生成邮件内容失败';
    
    if (error.code === 'ETIMEDOUT' || error.type === 'system') {
      errorMessage = '网络连接超时，请检查网络或代理设置';
    } else if (error.status === 401) {
      errorMessage = 'API密钥无效，请检查您的DeepSeek密钥配置';
    } else if (error.status === 429) {
      errorMessage = 'API配额用完或请求过于频繁';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: { message: errorMessage }
    });
  }
});

// 发送邮件
router.post('/send', async (req, res) => {
  try {
    const { emailId } = req.body;
    
    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: { message: '邮件ID不能为空' }
      });
    }
    
    // 获取邮件信息
    const email = await Email.findByPk(emailId, {
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: Campaign,
          as: 'campaign'
        }
      ]
    });
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: { message: '邮件不存在' }
      });
    }
    
    if (email.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: { message: '邮件已经发送过了' }
      });
    }
    
    // 获取邮箱配置
    const { getEmailConfig, validateEmailConfig } = require('../utils/emailConfig');
    const emailConfig = await getEmailConfig();
    
    if (!validateEmailConfig(emailConfig)) {
      return res.status(400).json({
        success: false,
        error: { message: 'SMTP邮箱配置不完整，请先在系统设置中配置邮箱' }
      });
    }
    
    console.log('=== 邮件传输器配置调试 ===');
    console.log('使用的邮箱配置:', {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user,
      secure: emailConfig.secure
    });
    
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // 发送邮件
    const mailOptions = {
      from: `"${email.from_name || emailConfig.from_name}" <${emailConfig.from_email}>`,
      to: email.to_email,
      subject: email.subject,
      text: email.content,
      html: email.html_content || email.content.replace(/\n/g, '<br>')
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // 更新邮件状态
    await email.update({
      status: 'sent',
      sent_at: new Date(),
      provider_id: info.messageId
    });
    
    // 更新客户联系次数
    if (email.customer) {
      await email.customer.update({
        contact_count: (email.customer.contact_count || 0) + 1,
        last_contacted_at: new Date(),
        status: 'contacted'
      });
    }
    
    // 更新活动统计
    if (email.campaign) {
      await email.campaign.update({
        total_emails_sent: (email.campaign.total_emails_sent || 0) + 1
      });
    }
    
    res.json({
      success: true,
      data: {
        email,
        messageId: info.messageId
      },
      message: '邮件发送成功'
    });
    
  } catch (error) {
    console.error('发送邮件失败:', error);
    res.status(500).json({
      success: false,
      error: { message: `发送邮件失败: ${error.message}` }
    });
  }
});

// 批量生成邮件
router.post('/batch-generate', async (req, res) => {
  try {
    const { campaignId, customerIds } = req.body;
    
    if (!campaignId || !customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({
        success: false,
        error: { message: '参数不完整' }
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const customerId of customerIds) {
      try {
        // 调用生成邮件API
        const generateResponse = await fetch(`${req.protocol}://${req.get('host')}/api/emails/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId,
            campaignId
          })
        });
        
        const result = await generateResponse.json();
        results.push(result);
        
        // 添加延时避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errors.push({
          customerId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        generated: results.filter(r => r.success).length,
        total: customerIds.length,
        errors: errors.length,
        results,
        errorDetails: errors
      },
      message: `批量生成完成，成功 ${results.filter(r => r.success).length}/${customerIds.length} 封邮件`
    });
    
  } catch (error) {
    console.error('批量生成邮件失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '批量生成邮件失败' }
    });
  }
});

module.exports = router; 