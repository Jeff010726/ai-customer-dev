const express = require('express');
const { Task, Campaign, Customer, Email, sequelize } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// 获取任务列表
router.get('/', async (req, res) => {
  try {
    const { 
      campaignId, 
      status, 
      type, 
      page = 1, 
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = {};
    
    if (campaignId) where.campaign_id = campaignId;
    if (status) where.status = status;
    if (type) where.type = type;
    
    const tasks = await Task.findAndCountAll({
      where,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'company']
        },
        {
          model: Email,
          as: 'email',
          attributes: ['id', 'subject', 'content', 'status', 'from_email', 'to_email', 'created_at']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });
    
    res.json({
      success: true,
      tasks: tasks.rows,
      total: tasks.count,
      page: parseInt(page),
      totalPages: Math.ceil(tasks.count / limit)
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取任务列表失败' }
    });
  }
});

// 获取任务统计
router.get('/stats', async (req, res) => {
  try {
    const { campaignId } = req.query;
    const where = campaignId ? { campaign_id: campaignId } : {};
    
    const stats = await Task.findAll({
      where,
      attributes: [
        'status',
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'type'],
      raw: true
    });
    
    // 格式化统计数据
    const formattedStats = {
      byStatus: {},
      byType: {},
      total: 0
    };
    
    stats.forEach(stat => {
      const { status, type, count } = stat;
      
      if (!formattedStats.byStatus[status]) {
        formattedStats.byStatus[status] = 0;
      }
      if (!formattedStats.byType[type]) {
        formattedStats.byType[type] = 0;
      }
      
      formattedStats.byStatus[status] += parseInt(count);
      formattedStats.byType[type] += parseInt(count);
      formattedStats.total += parseInt(count);
    });
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('获取任务统计失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取任务统计失败' }
    });
  }
});

// 创建任务
router.post('/', async (req, res) => {
  try {
    const {
      type,
      campaign_id,
      customer_id,
      priority = 0,
      scheduled_at,
      task_data = {},
      metadata = {}
    } = req.body;
    
    if (!type || !campaign_id) {
      return res.status(400).json({
        success: false,
        error: { message: '任务类型和活动ID不能为空' }
      });
    }
    
    // 验证活动存在
    const campaign = await Campaign.findByPk(campaign_id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: '活动不存在' }
      });
    }
    
    // 如果指定了客户，验证客户存在
    if (customer_id) {
      const customer = await Customer.findByPk(customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: { message: '客户不存在' }
        });
      }
    }
    
    // 创建任务
    const task = await Task.create({
      type,
      campaign_id,
      customer_id,
      priority,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : new Date(),
      task_data,
      metadata
    });
    
    res.json({
      success: true,
      data: task,
      message: '任务创建成功'
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '创建任务失败' }
    });
  }
});

// 批量创建邮件发送任务
router.post('/batch/email-send', async (req, res) => {
  try {
    const { campaign_id, customer_ids, priority = 0 } = req.body;
    
    if (!campaign_id || !customer_ids || !Array.isArray(customer_ids)) {
      return res.status(400).json({
        success: false,
        error: { message: '活动ID和客户ID列表不能为空' }
      });
    }
    
    // 验证活动存在
    const campaign = await Campaign.findByPk(campaign_id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: '活动不存在' }
      });
    }
    
    // 批量创建任务
    const tasks = [];
    for (const customer_id of customer_ids) {
      // 检查是否已存在相同的待处理任务
      const existingTask = await Task.findOne({
        where: {
          type: 'email_send',
          campaign_id,
          customer_id,
          status: { [Op.in]: ['pending', 'processing'] }
        }
      });
      
      if (!existingTask) {
        tasks.push({
          type: 'email_send',
          campaign_id,
          customer_id,
          priority,
          scheduled_at: new Date(),
          task_data: {},
          metadata: { created_by_batch: true }
        });
      }
    }
    
    const createdTasks = await Task.bulkCreate(tasks);
    
    res.json({
      success: true,
      data: {
        created_count: createdTasks.length,
        skipped_count: customer_ids.length - createdTasks.length,
        tasks: createdTasks
      },
      message: `批量创建任务完成，创建 ${createdTasks.length} 个任务`
    });
  } catch (error) {
    console.error('批量创建任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '批量创建任务失败' }
    });
  }
});

// 更新任务状态
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error_message, result } = req.body;
    
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '任务不存在' }
      });
    }
    
    const updateData = { status };
    
    if (status === 'processing' && !task.started_at) {
      updateData.started_at = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date();
    }
    
    if (error_message) {
      updateData.error_message = error_message;
    }
    
    if (result) {
      updateData.result = result;
    }
    
    await task.update(updateData);
    
    res.json({
      success: true,
      data: task,
      message: '任务状态更新成功'
    });
  } catch (error) {
    console.error('更新任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '更新任务状态失败' }
    });
  }
});

// 重新执行任务
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '任务不存在' }
      });
    }
    
    if (task.retry_count >= task.max_retries) {
      return res.status(400).json({
        success: false,
        error: { message: '已达到最大重试次数' }
      });
    }
    
    await task.update({
      status: 'pending',
      retry_count: task.retry_count + 1,
      error_message: null,
      scheduled_at: new Date()
    });
    
    res.json({
      success: true,
      data: task,
      message: '任务重试设置成功'
    });
  } catch (error) {
    console.error('重试任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '重试任务失败' }
    });
  }
});

// 批量操作任务
router.post('/batch/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { task_ids } = req.body;
    
    if (!task_ids || !Array.isArray(task_ids)) {
      return res.status(400).json({
        success: false,
        error: { message: '任务ID列表不能为空' }
      });
    }
    
    let updateData = {};
    let message = '';
    
    switch (action) {
      case 'cancel':
        updateData = { status: 'cancelled', completed_at: new Date() };
        message = '批量取消任务成功';
        break;
      case 'retry':
        updateData = { status: 'pending', scheduled_at: new Date() };
        message = '批量重试任务成功';
        break;
      case 'reset':
        updateData = { 
          status: 'pending', 
          scheduled_at: new Date(),
          error_message: null,
          retry_count: 0,
          completed_at: null,
          started_at: null
        };
        message = '批量打回待处理成功';
        break;
      case 'delete':
        await Task.destroy({ where: { id: task_ids } });
        return res.json({
          success: true,
          message: '批量删除任务成功'
        });
      default:
        return res.status(400).json({
          success: false,
          error: { message: '不支持的操作' }
        });
    }
    
    const [updatedCount] = await Task.update(updateData, {
      where: { id: task_ids }
    });
    
    res.json({
      success: true,
      data: { updated_count: updatedCount },
      message
    });
  } catch (error) {
    console.error('批量操作任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '批量操作任务失败' }
    });
  }
});

// 生成邮件内容
router.post('/:id/generate-email', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      where: { id },
      include: [
        { model: Campaign, as: 'campaign' },
        { model: Customer, as: 'customer' }
      ]
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '任务不存在' }
      });
    }
    
    if (task.type !== 'email_send') {
      return res.status(400).json({
        success: false,
        error: { message: '此任务类型不支持生成邮件' }
      });
    }
    
    // 使用AI生成邮件内容
    const emailConfig = task.campaign.email_config || {};
    
    // 临时测试配置
    const testConfig = {
      product_description: "高品质的进出口贸易产品和解决方案",
      service_description: "我们提供专业的国际贸易服务，包括产品采购、质量控制、物流配送等一站式服务",
      writing_style: "professional",
      tone: "friendly", 
      sender_name: "张明",
      sender_title: "业务发展经理",
      company_info: "环球贸易有限公司",
      call_to_action: "安排一次15分钟的在线会议",
      custom_prompt: "请突出我们在质量控制和快速交付方面的优势"
    };
    
    // 合并配置，测试配置优先
    const finalConfig = { ...emailConfig, ...testConfig };
    let generatedEmail;

    // 尝试使用AI生成邮件
    if (process.env.OPENAI_API_KEY) {
      try {
        const axios = require('axios');
        // 获取客户的详细信息
        const customerName = task.customer?.name || task.task_data?.customer_name || '尊敬的客户';
        const customerCompany = task.customer?.company || task.task_data?.customer_company || '';
        const customerIndustry = task.customer?.industry || task.task_data?.customer_industry || '';
        const customerPosition = task.customer?.position || '负责人';
        const customerEmail = task.customer?.email || task.task_data?.customer_email || '';
        
        // 分析客户公司名称，提取可能的业务信息
        let businessType = '';
        if (customerCompany) {
          if (customerCompany.toLowerCase().includes('trading') || customerCompany.toLowerCase().includes('trade')) {
            businessType = 'Trading';
          } else if (customerCompany.toLowerCase().includes('import') || customerCompany.toLowerCase().includes('export')) {
            businessType = 'Import/Export';
          } else if (customerCompany.toLowerCase().includes('manufacturing') || customerCompany.toLowerCase().includes('factory')) {
            businessType = 'Manufacturing';
          } else if (customerCompany.toLowerCase().includes('wholesale') || customerCompany.toLowerCase().includes('retail')) {
            businessType = 'Wholesale/Retail';
          }
        }

        const prompt = `
As a professional international business development specialist, please generate a highly personalized business outreach email in American English based on the following detailed information:

Customer Details:
- Customer Name: ${customerName}
- Company Name: ${customerCompany}
- Position: ${customerPosition}
- Email: ${customerEmail}
- Industry: ${customerIndustry}
- Business Type: ${businessType}

Our Company Information:
- Product/Service: ${finalConfig.product_description || 'High-quality international trade products and solutions'}
- Service Advantages: ${finalConfig.service_description || 'Professional international trade services including product sourcing, quality control, logistics, and end-to-end solutions'}
- Company Name: ${finalConfig.company_info || 'Global Trade Solutions Inc.'}
- Sender Name: ${finalConfig.sender_name || 'Michael Johnson'}
- Sender Title: ${finalConfig.sender_title || 'Business Development Manager'}

Writing Requirements:
- Language: American English
- Writing Style: ${finalConfig.writing_style || 'Professional Business'}
- Tone: ${finalConfig.tone || 'Friendly and Professional'}
- Call to Action: ${finalConfig.call_to_action || 'Schedule a brief 15-minute online meeting'}

Personalization Requirements:
1. Analyze the customer's company name and industry to infer potential business needs
2. Highlight our relevant service advantages based on their business type
3. Use professional yet approachable American business English
4. Demonstrate understanding and respect for the customer's business
5. Provide specific value propositions for collaboration

Email Structure Requirements:
1. Personalized greeting (using customer name and company)
2. Brief self-introduction and company introduction
3. Value proposition tailored to customer's business
4. Specific collaboration suggestions or solutions
5. Clear next-step action recommendations
6. Professional closing and contact information

${finalConfig.custom_prompt ? `Special Requirements: ${finalConfig.custom_prompt}` : ''}

Please return in JSON format: {"subject": "Email Subject", "body": "Email Body"}

Note: The email subject should be compelling and professional, and the body should demonstrate deep understanding of the customer's business.
`;

        const response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是一位专业的销售邮件撰写专家。' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        let content = response.data.choices[0].message.content;
        
        // 清理内容，移除可能的代码块标记
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          // 尝试解析JSON响应
          const parsed = JSON.parse(content);
          generatedEmail = {
            subject: parsed.subject || `探索新的合作机会 - ${task.customer?.name || task.task_data?.customer_name}`,
            body: parsed.body || content
          };
        } catch (e) {
          // 如果不是JSON，使用默认格式
          generatedEmail = {
            subject: `探索新的合作机会 - ${task.customer?.name || task.task_data?.customer_name}`,
            body: content
          };
        }
      } catch (error) {
        console.error('AI生成邮件失败，使用模板:', error.message);
        // 如果AI生成失败，使用模板
        generatedEmail = null;
      }
    }

    // 如果AI生成失败或没有配置API密钥，使用模板生成邮件
    if (!generatedEmail) {
      const customerName = task.customer?.name || task.task_data?.customer_name || '尊敬的客户';
      const customerCompany = task.customer?.company || task.task_data?.customer_company || '贵公司';
      const customerIndustry = task.customer?.industry || task.task_data?.customer_industry || '行业';
      const senderName = finalConfig?.sender_name || '销售代表';
      const companyInfo = finalConfig?.company_info || '我们公司';
      const productDescription = finalConfig?.product_description || '高品质产品';
      const serviceDescription = finalConfig?.service_description || '我们提供专业的服务，致力于帮助客户实现业务目标。';
      const callToAction = finalConfig?.call_to_action || '进一步交流';
      const senderTitle = finalConfig?.sender_title || '';

      generatedEmail = {
        subject: `${customerName}，探索新的合作机会`,
        body: `尊敬的${customerName}，

希望这封邮件能够为您带来价值。我是${senderName}，来自${companyInfo}。

了解到${customerCompany}在${customerIndustry}领域的卓越表现，我相信我们的${productDescription}能够为您的业务发展提供有力支持。

${serviceDescription}

期待有机会与您${callToAction}。

祝好，
${senderName}
${senderTitle}`
      };
    }
    
    // 更新任务数据
    await task.update({
      task_data: {
        ...task.task_data,
        generated_email: generatedEmail
      }
    });
    
    res.json({
      success: true,
      data: generatedEmail,
      message: '邮件内容生成成功'
    });
  } catch (error) {
    console.error('生成邮件失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '生成邮件失败' }
    });
  }
});

// 发送邮件
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      where: { id },
      include: [
        { model: Campaign, as: 'campaign' },
        { model: Customer, as: 'customer' }
      ]
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '任务不存在' }
      });
    }
    
    if (!task.task_data?.generated_email) {
      return res.status(400).json({
        success: false,
        error: { message: '请先生成邮件内容' }
      });
    }
    
    // 获取邮箱配置
    const { getEmailConfig } = require('../utils/emailConfig');
    const emailConfig = await getEmailConfig();
    
    // 创建邮件记录
    const email = await Email.create({
      campaign_id: task.campaign_id,
      customer_id: task.customer_id,
      subject: task.task_data.generated_email.subject,
      body: task.task_data.generated_email.body,
      from_email: emailConfig.from_email,
      from_name: task.campaign.email_config?.sender_name || emailConfig.from_name,
      to_email: task.customer.email,
      to_name: task.customer.name,
      status: 'pending'
    });
    
    // 调用邮件发送服务
    const nodemailer = require('nodemailer');
    const { validateEmailConfig } = require('../utils/emailConfig');
    
    if (!validateEmailConfig(emailConfig)) {
      return res.status(400).json({
        success: false,
        error: { message: 'SMTP邮箱配置不完整，请先在系统设置中配置邮箱' }
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    try {
      await transporter.sendMail({
        from: `"${email.from_name}" <${email.from_email}>`,
        to: email.to_email,
        subject: email.subject,
        text: email.body,
        html: email.body.replace(/\n/g, '<br>')
      });
      
      await email.update({ 
        status: 'sent',
        sent_at: new Date()
      });
      
      await task.update({
        status: 'completed',
        completed_at: new Date(),
        email_id: email.id
      });
      
      res.json({
        success: true,
        data: email,
        message: '邮件发送成功'
      });
    } catch (sendError) {
      await email.update({ 
        status: 'failed',
        error_message: sendError.message
      });
      
      await task.update({
        status: 'failed',
        error_message: sendError.message,
        completed_at: new Date()
      });
      
      throw sendError;
    }
  } catch (error) {
    console.error('发送邮件失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '发送邮件失败' }
    });
  }
});

// 获取下一个待处理的任务
router.get('/next', async (req, res) => {
  try {
    const { type, campaign_id } = req.query;
    
    const where = {
      status: 'pending',
      scheduled_at: { [Op.lte]: new Date() }
    };
    
    if (type) where.type = type;
    if (campaign_id) where.campaign_id = campaign_id;
    
    const task = await Task.findOne({
      where,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status', 'email_config', 'automation_config']
        },
        {
          model: Customer,
          as: 'customer'
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['scheduled_at', 'ASC']
      ]
    });
    
    if (task) {
      // 更新任务状态为处理中
      await task.update({
        status: 'processing',
        started_at: new Date()
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取下一个任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取下一个任务失败' }
    });
  }
});

module.exports = router;