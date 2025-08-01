const { Task, Campaign, Customer, Email } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class TaskScheduler {
  constructor() {
    this.isRunning = false;
    this.processInterval = null;
    this.emailsPerHour = 10; // 默认每小时10封
    this.lastEmailSentAt = null;
    this.isProcessingTask = false; // 防止并发处理
    this.currentTaskId = null; // 当前正在处理的任务ID
  }

  start() {
    if (this.isRunning) {
      logger.info('📅 任务调度器已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 启动任务调度器...');

    // 每30秒检查一次任务
    this.processInterval = setInterval(() => {
      this.processTasks();
    }, 30 * 1000); // 30秒

    // 立即执行一次
    this.processTasks();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    logger.info('⏹️ 任务调度器已停止');
  }

  async processTasks() {
    // 如果正在处理任务，跳过这次执行
    if (this.isProcessingTask) {
      logger.debug('⏳ 任务调度器正在处理任务，跳过本次检查');
      return;
    }

    try {
      this.isProcessingTask = true;
      logger.debug('🔍 开始检查待处理任务...');

      // 首先处理所有待处理的任务（按优先级和时间排序）
      const nextTask = await this.getNextTask();
      
      if (nextTask) {
        await this.processTask(nextTask);
      } else {
        // 如果没有待处理任务，检查是否需要创建新任务
        await this.checkAndCreateNewTasks();
      }

    } catch (error) {
      logger.error('❌ 处理任务时出错:', error);
    } finally {
      this.isProcessingTask = false;
      this.currentTaskId = null;
    }
  }

  // 获取下一个待处理的任务
  async getNextTask() {
    try {
      const task = await Task.findOne({
        where: {
          status: 'pending',
          scheduled_at: { [Op.lte]: new Date() }
        },
        include: [
          {
            model: Campaign,
            as: 'campaign',
            attributes: ['id', 'name', 'status', 'email_config', 'automation_config']
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'company']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['scheduled_at', 'ASC'],
          ['created_at', 'ASC']
        ]
      });

      return task;
    } catch (error) {
      logger.error('❌ 获取下一个任务失败:', error);
      return null;
    }
  }

  // 处理单个任务
  async processTask(task) {
    try {
      this.currentTaskId = task.id;
      logger.info(`🎯 开始处理任务 (ID: ${task.id}, 类型: ${task.type})`);

      // 更新任务状态为处理中
      await task.update({
        status: 'processing',
        started_at: new Date()
      });

      // 根据任务类型分发处理
      switch (task.type) {
        case 'customer_search':
          await this.processSearchTask(task);
          break;
        case 'email_send':
          await this.processEmailTask(task);
          break;
        case 'email_generate':
          await this.processEmailGenerateTask(task);
          break;
        default:
          throw new Error(`未知的任务类型: ${task.type}`);
      }

      logger.info(`✅ 任务处理完成 (ID: ${task.id})`);
    } catch (error) {
      logger.error(`❌ 处理任务失败 (ID: ${task.id}):`, error);
      
      // 更新任务失败状态
      await task.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      });

      // 检查是否需要重试
      if (task.retry_count < task.max_retries) {
        const retryDelay = this.getRetryDelay(task.type, task.retry_count);
        await task.update({
          status: 'pending',
          retry_count: task.retry_count + 1,
          scheduled_at: new Date(Date.now() + retryDelay),
          error_message: null
        });
        logger.info(`🔄 任务将在 ${Math.round(retryDelay / 60000)} 分钟后重试 (ID: ${task.id})`);
      }
    }
  }

  // 获取重试延迟时间
  getRetryDelay(taskType, retryCount) {
    const baseDelays = {
      'customer_search': 30 * 60 * 1000, // 30分钟
      'email_send': 15 * 60 * 1000,      // 15分钟
      'email_generate': 5 * 60 * 1000    // 5分钟
    };
    
    const baseDelay = baseDelays[taskType] || 15 * 60 * 1000;
    // 指数退避：每次重试延迟时间翻倍
    return baseDelay * Math.pow(2, retryCount);
  }

  // 检查并创建新任务
  async checkAndCreateNewTasks() {
    try {
      // 获取活跃的活动
      const activeCampaigns = await Campaign.findAll({
        where: { status: 'active' }
      });

      for (const campaign of activeCampaigns) {
        // 检查是否需要搜索新客户
        if (campaign.automation_config?.auto_search) {
          await this.checkAndCreateSearchTask(campaign);
        }

        // 检查是否所有任务完成，需要开始下一轮搜索
        if (campaign.automation_config?.auto_search) {
          await this.checkForNextRoundSearch(campaign);
        }
      }
    } catch (error) {
      logger.error('❌ 检查和创建新任务失败:', error);
    }
  }

  async checkAndCreateSearchTask(campaign) {
    try {
      // 检查最后一次搜索时间
      const lastSearchTask = await Task.findOne({
        where: {
          campaign_id: campaign.id,
          type: 'customer_search',
          status: { [Op.in]: ['completed', 'processing'] }
        },
        order: [['created_at', 'DESC']]
      });

      const searchInterval = campaign.automation_config?.search_interval_hours || 24;
      const intervalMs = searchInterval * 60 * 60 * 1000;

      if (!lastSearchTask || 
          (new Date() - new Date(lastSearchTask.created_at)) > intervalMs) {
        // 创建新的搜索任务
        await Task.create({
          type: 'customer_search',
          campaign_id: campaign.id,
          status: 'pending',
          priority: 1,
          scheduled_at: new Date(),
          task_data: {
            keywords: campaign.search_keywords,
            platforms: campaign.search_platforms
          }
        });
        logger.info(`🔍 为活动 ${campaign.name} 创建了新的搜索任务`);
      }
    } catch (error) {
      logger.error('❌ 创建搜索任务失败:', error);
    }
  }

  async processSearchTasks(campaign) {
    try {
      // 获取待处理的搜索任务
      const pendingSearchTask = await Task.findOne({
        where: {
          campaign_id: campaign.id,
          type: 'customer_search',
          status: 'pending',
          scheduled_at: { [Op.lte]: new Date() }
        },
        order: [['scheduled_at', 'ASC']]
      });

      if (pendingSearchTask) {
        await this.processSearchTask(pendingSearchTask);
      }
    } catch (error) {
      logger.error('❌ 处理搜索任务失败:', error);
    }
  }

  async processSearchTask(task) {
    try {
      // 更新任务状态为处理中
      await task.update({
        status: 'processing',
        started_at: new Date()
      });

      logger.info(`🔍 开始处理搜索任务 (ID: ${task.id})`);

      // 调用搜索API
      const axios = require('axios');
      const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
      const searchUrl = `${baseUrl}/api/search`;
      
      const searchParams = {
        campaignId: task.campaign_id,
        keywords: task.task_data?.keywords || ['商业客户'],
        platforms: task.task_data?.platforms || ['Google', 'LinkedIn']
      };

      const searchResponse = await axios.post(searchUrl, searchParams);

      if (searchResponse.data.success) {
        // 更新任务状态为完成
        await task.update({
          status: 'completed',
          completed_at: new Date(),
          result: searchResponse.data.data
        });

        logger.info(`✅ 搜索任务完成 (ID: ${task.id}): ${searchResponse.data.message}`);
      } else {
        throw new Error(searchResponse.data.error?.message || '搜索失败');
      }
    } catch (error) {
      logger.error(`❌ 处理搜索任务失败 (ID: ${task.id}):`, error);
      
      // 更新任务失败状态
      await task.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      });

      // 检查是否需要重试
      if (task.retry_count < task.max_retries) {
        await task.update({
          status: 'pending',
          retry_count: task.retry_count + 1,
          scheduled_at: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后重试
        });
        logger.info(`🔄 搜索任务将在30分钟后重试 (ID: ${task.id})`);
      }
    }
  }

  async processEmailTask(task) {
    try {
      // 检查邮件发送频率限制
      const emailsPerHour = task.campaign.automation_config?.emails_per_hour || this.emailsPerHour;
      const minInterval = (60 * 60 * 1000) / emailsPerHour; // 毫秒

      if (this.lastEmailSentAt && (new Date() - this.lastEmailSentAt) < minInterval) {
        // 如果还没到发送时间，重新调度任务
        const nextSendTime = new Date(this.lastEmailSentAt.getTime() + minInterval);
        await task.update({
          status: 'pending',
          scheduled_at: nextSendTime
        });
        logger.info(`⏰ 邮件发送频率限制，任务重新调度到 ${nextSendTime.toLocaleString()}`);
        return;
      }

      logger.info(`📧 开始处理邮件发送任务 - 收件人: ${task.customer.email}`);

      // 生成邮件内容
      const emailContent = await this.generateEmail(task);
      
      // 获取邮箱配置
      const { getEmailConfig } = require('../utils/emailConfig');
      const emailConfig = await getEmailConfig();
      
      // 创建邮件记录
      const email = await Email.create({
        campaign_id: task.campaign_id,
        customer_id: task.customer_id,
        subject: emailContent.subject,
        content: emailContent.body,
        from_email: emailConfig.from_email,
        from_name: task.campaign.email_config?.sender_name || emailConfig.from_name,
        to_email: task.customer.email,
        to_name: task.customer.name,
        status: 'pending'
      });

      // 发送邮件
      await this.sendEmail(email, task);

      // 更新任务状态
      await task.update({
        status: 'completed',
        completed_at: new Date(),
        email_id: email.id
      });

      // 更新最后发送时间
      this.lastEmailSentAt = new Date();

      logger.info(`✅ 成功发送邮件给 ${task.customer.email}`);
    } catch (error) {
      logger.error(`❌ 处理邮件任务失败 (ID: ${task.id}):`, error);
      
      // 更新任务失败状态
      await task.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      });

      // 检查是否需要重试
      if (task.retry_count < task.max_retries) {
        await task.update({
          status: 'pending',
          retry_count: task.retry_count + 1,
          scheduled_at: new Date(Date.now() + 15 * 60 * 1000) // 15分钟后重试
        });
      }
    }
  }

  // 处理邮件生成任务
  async processEmailGenerateTask(task) {
    try {
      logger.info(`📝 开始处理邮件生成任务 - 客户: ${task.customer?.name || task.task_data?.customer_name}`);

      // 生成邮件内容
      const emailContent = await this.generateEmail(task);
      
      // 创建邮件记录
      const email = await Email.create({
        campaign_id: task.campaign_id,
        customer_id: task.customer_id,
        subject: emailContent.subject,
        content: emailContent.body,
        from_email: process.env.FROM_EMAIL || process.env.SMTP_USER,
        from_name: task.campaign.email_config?.sender_name || process.env.FROM_NAME,
        to_email: task.customer?.email || task.task_data?.customer_email,
        to_name: task.customer?.name || task.task_data?.customer_name,
        status: 'draft' // 生成的邮件为草稿状态
      });

      // 更新任务状态
      await task.update({
        status: 'completed',
        completed_at: new Date(),
        email_id: email.id,
        result: {
          email_id: email.id,
          subject: emailContent.subject,
          preview: emailContent.body.substring(0, 200) + '...'
        }
      });

      logger.info(`✅ 成功生成邮件内容 - 邮件ID: ${email.id}`);
    } catch (error) {
      logger.error(`❌ 处理邮件生成任务失败 (ID: ${task.id}):`, error);
      throw error; // 重新抛出错误，让上层处理重试逻辑
    }
  }

  async generateEmail(task) {
    const emailConfig = task.campaign.email_config || {};
    
    // 使用AI生成邮件
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `
作为一位专业的销售人员，请根据以下信息生成一封个性化的开发信：

客户信息：
- 名称：${task.customer.name}
- 公司：${task.customer.company}
- 职位：${task.customer.position || '负责人'}
- 邮箱：${task.customer.email}
- 行业：${task.customer.industry || ''}

产品/服务信息：
- 产品描述：${emailConfig.product_description || '高品质产品'}
- 服务描述：${emailConfig.service_description || '专业服务'}
- 公司信息：${emailConfig.company_info || ''}
- 发件人：${emailConfig.sender_name || ''} ${emailConfig.sender_title || ''}

写作要求：
- 写作风格：${emailConfig.writing_style || 'professional'}
- 语气：${emailConfig.tone || 'friendly'}
- 行动号召：${emailConfig.call_to_action || '安排一次简短的在线会议'}

请生成一封简洁、专业的开发信，包括：
1. 个性化的问候
2. 简短的价值主张
3. 具体的合作建议
4. 明确的行动号召

${emailConfig.custom_prompt ? `额外要求：${emailConfig.custom_prompt}` : ''}

请返回JSON格式：{"subject": "邮件主题", "body": "邮件正文"}
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

        const content = response.data.choices[0].message.content;
        try {
          // 尝试解析JSON响应
          const parsed = JSON.parse(content);
          return {
            subject: parsed.subject || `探索新的合作机会 - ${task.customer.name}`,
            body: parsed.body || content
          };
        } catch (e) {
          // 如果不是JSON，使用默认格式
          return {
            subject: `探索新的合作机会 - ${task.customer.name}`,
            body: content
          };
        }
      } catch (error) {
        logger.error('AI生成邮件失败，使用模板:', error.message);
      }
    }

    // 使用模板生成邮件
    const customerName = task.customer?.name || task.task_data?.customer_name || '尊敬的客户';
    const customerCompany = task.customer?.company || task.task_data?.customer_company || '贵公司';
    const customerIndustry = task.customer?.industry || task.task_data?.customer_industry || '行业';
    const senderName = emailConfig?.sender_name || '销售代表';
    const companyInfo = emailConfig?.company_info || '我们公司';
    const productDescription = emailConfig?.product_description || '高品质产品';
    const serviceDescription = emailConfig?.service_description || '我们提供专业的服务，致力于帮助客户实现业务目标。';
    const callToAction = emailConfig?.call_to_action || '进一步交流';
    const senderTitle = emailConfig?.sender_title || '';

    return {
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

  async sendEmail(email, task) {
    const { getEmailConfig, validateEmailConfig } = require('../utils/emailConfig');
    const emailConfig = await getEmailConfig();
    
    if (!validateEmailConfig(emailConfig)) {
      throw new Error('邮箱配置不完整，请在系统设置中配置SMTP邮箱');
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
      const emailContent = email.content || '';
      await transporter.sendMail({
        from: `"${email.from_name}" <${email.from_email}>`,
        to: email.to_email,
        subject: email.subject,
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>')
      });

      await email.update({ 
        status: 'sent',
        sent_at: new Date()
      });
    } catch (error) {
      await email.update({ 
        status: 'failed',
        error_message: error.message
      });
      throw error;
    }
  }

  async checkForNextRoundSearch(campaign) {
    try {
      // 检查是否有待处理或正在处理的邮件任务
      const pendingEmailTasks = await Task.count({
        where: {
          campaign_id: campaign.id,
          type: 'email_send',
          status: { [Op.in]: ['pending', 'processing'] }
        }
      });

      // 如果没有待处理的邮件任务，检查是否需要开始下一轮搜索
      if (pendingEmailTasks === 0) {
        // 检查最后一次搜索时间
        const lastSearchTask = await Task.findOne({
          where: {
            campaign_id: campaign.id,
            type: 'customer_search',
            status: 'completed'
          },
          order: [['completed_at', 'DESC']]
        });

        // 如果有已完成的搜索任务，且距离完成时间超过搜索间隔，则开始下一轮
        if (lastSearchTask) {
          const searchInterval = campaign.automation_config?.search_interval_hours || 24;
          const intervalMs = searchInterval * 60 * 60 * 1000;
          const timeSinceLastSearch = new Date() - new Date(lastSearchTask.completed_at);

          if (timeSinceLastSearch >= intervalMs) {
            logger.info(`🔄 活动 ${campaign.name} 所有任务已完成，开始下一轮搜索...`);
            
            // 直接调用搜索API
            const axios = require('axios');
            const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
            const searchUrl = `${baseUrl}/api/search`;
            
            const searchParams = {
              campaignId: campaign.id,
              keywords: campaign.search_keywords || ['商业客户'],
              platforms: campaign.search_platforms || ['Google', 'LinkedIn']
            };

            try {
              const searchResponse = await axios.post(searchUrl, searchParams);
              if (searchResponse.data.success) {
                logger.info(`✅ 活动 ${campaign.name} 下一轮搜索完成：${searchResponse.data.message}`);
              }
            } catch (searchError) {
              logger.error(`❌ 活动 ${campaign.name} 下一轮搜索失败:`, searchError.message);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`❌ 检查下一轮搜索失败 (活动: ${campaign.name}):`, error);
    }
  }
}

module.exports = new TaskScheduler();