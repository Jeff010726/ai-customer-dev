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
    
    // 获取客户信息和活动配置
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'description', 'email_config', 'search_keywords']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { message: '客户不存在' }
      });
    }
    
    // 获取活动的邮件配置
    const campaign = customer.campaign || await Campaign.findByPk(campaignId);
    const emailConfig = campaign?.email_config || {};
    
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
    
    // 构建详细的客户信息和发件人信息
    const customerInfo = {
      name: customer.name || '尊敬的客户',
      company: customer.company || '',
      industry: customer.industry || '',
      website: customer.website || '',
      source_platform: customer.source_platform || '',
      email: customer.email || '',
      description: customer.notes || customer.description || '',
      region: customer.address || customer.region || ''
    };
    
    // 构建发件人和公司信息
    const senderInfo = {
      name: emailConfig.sender_name || '商务拓展经理',
      title: emailConfig.sender_title || '业务发展部',
      company_info: emailConfig.company_info || '',
      product_desc: emailConfig.product_description || '',
      service_desc: emailConfig.service_description || '',
      writing_style: emailConfig.writing_style || 'professional',
      tone: emailConfig.tone || 'friendly',
      call_to_action: emailConfig.call_to_action || '希望有机会进一步交流'
    };
    
    // 根据不同的平台来源调整策略
    const platformStrategy = {
      'LinkedIn': '我在LinkedIn上看到贵公司的业务介绍',
      'Instagram': '在Instagram上关注到贵品牌的精彩内容',
      'Google': '通过搜索了解到贵公司',
      'AI Search': '了解到贵公司在行业内的优秀表现',
      'Facebook': '在Facebook上看到贵公司的动态',
      '1688': '在1688平台上看到贵公司的产品',
      'Alibaba': '在Alibaba上了解到贵公司的业务'
    };
    
    const openingLine = platformStrategy[customerInfo.source_platform] || '了解到贵公司的业务';
    
    // 构建更个性化的提示词
    const prompt = `请以${senderInfo.name}（${senderInfo.title}）的身份，为我们公司写一封个性化的商务开发信。

发件人信息：
- 姓名职位: ${senderInfo.name} - ${senderInfo.title}
- 公司介绍: ${senderInfo.company_info}
- 产品优势: ${senderInfo.product_desc}
- 服务特色: ${senderInfo.service_desc}

目标客户信息：
- 联系人: ${customerInfo.name}
- 公司名称: ${customerInfo.company}
- 所在行业: ${customerInfo.industry}
- 公司网站: ${customerInfo.website}
- 所在地区: ${customerInfo.region}
- 业务特点: ${customerInfo.description}
- 发现渠道: ${openingLine}

写作要求：
1. 写作风格: ${senderInfo.writing_style}（professional专业/casual轻松/enthusiastic热情/direct直接/formal正式）
2. 语气基调: ${senderInfo.tone}（friendly友好/persuasive说服力强/informative信息丰富/humorous幽默/empathetic有同理心）
3. 开头要提到从哪里了解到客户（${openingLine}）
4. 根据客户的行业特点和业务描述，找到契合点
5. 突出我们的产品/服务如何帮助客户解决问题或提升业务
6. 邮件要像真人写的，自然流畅，避免模板化
7. 根据客户所在地区调整用语习惯
8. 结尾包含明确的行动号召: ${senderInfo.call_to_action}
9. 整体长度控制在150-200字左右

${emailConfig.custom_prompt ? `额外要求: ${emailConfig.custom_prompt}` : ''}

请生成一封看起来完全像真人写的个性化邮件。格式如下：
主题：[简洁有吸引力的邮件主题，包含客户公司名或行业关键词]
正文：[自然、个性化的邮件正文]`;
    
    // 调用AI生成内容
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `你是一个经验丰富的商务拓展专家，擅长撰写高度个性化的客户开发邮件。
你的邮件特点是：
1. 像真人写的，每封邮件都不一样
2. 会根据客户的具体情况调整内容和语气
3. 善于找到与客户的共鸣点
4. 语言自然流畅，不使用模板化的词句
5. 懂得不同地区的商务礼仪和表达习惯`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      max_tokens: 800,
      temperature: 0.8  // 提高温度以增加创造性
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
      from_email: emailConfig.sender_email || process.env.FROM_EMAIL || process.env.SMTP_USER || 'jeff@aimorelogy.com',
      from_name: senderInfo.name || process.env.FROM_NAME || 'AI客户开发系统',
      to_email: customer.email,
      to_name: customer.name,
      status: 'draft',
      campaign_id: campaignId || customer.campaign_id,
      customer_id: customerId,
      variables: {
        customer_name: customerInfo.name,
        company_name: customerInfo.company,
        industry: customerInfo.industry,
        source_platform: customerInfo.source_platform,
        region: customerInfo.region,
        writing_style: senderInfo.writing_style,
        tone: senderInfo.tone
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