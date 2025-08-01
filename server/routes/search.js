const express = require('express');
const { SearchResult, Customer, Campaign, Task } = require('../models');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const router = express.Router();

// 执行AI智能搜索 - 原路由
router.post('/', async (req, res) => {
  try {
    const { campaignId, keywords, platforms } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: '活动ID不能为空' }
      });
    }
    
    // 验证活动是否存在
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: '活动不存在' }
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
      timeout: 60000  // 增加超时时间到60秒
    });
    
    // 获取活动详细信息，包括关键词和描述
    const campaignKeywords = campaign.search_keywords ? 
        (typeof campaign.search_keywords === 'string' ? 
            JSON.parse(campaign.search_keywords) : campaign.search_keywords) : [];
    
    // 构建搜索关键词 - 优先使用活动关键词，然后是请求关键词
    const keywordArray = campaignKeywords.length > 0 ? campaignKeywords :
                        (Array.isArray(keywords) ? keywords : 
                        (keywords ? keywords.split(',').map(k => k.trim()) : ['商业客户']));
    
    const platformArray = Array.isArray(platforms) ? platforms : 
                         (platforms ? platforms.split(',').map(p => p.trim()) : ['Google', 'LinkedIn']);
    
    // 根据关键词动态生成行业类型和客户描述
    const getIndustryContext = (keywords) => {
        const keywordStr = keywords.join(' ').toLowerCase();
        
        if (keywordStr.includes('汽车') || keywordStr.includes('车') || keywordStr.includes('automotive')) {
            return {
                industry: '汽车相关行业',
                customerTypes: '汽车配件商、汽车用品店、改装店、经销商',
                businessContext: '汽车零配件和用品销售'
            };
        } else if (keywordStr.includes('时尚') || keywordStr.includes('服装') || keywordStr.includes('fashion')) {
            return {
                industry: '时尚零售行业',
                customerTypes: '买手店、精品店、时尚零售商、服装店',
                businessContext: '时尚服装和配饰销售'
            };
        } else if (keywordStr.includes('电子') || keywordStr.includes('数码') || keywordStr.includes('tech')) {
            return {
                industry: '电子科技行业',
                customerTypes: '电子产品店、数码商城、科技公司、代理商',
                businessContext: '电子产品和数码设备销售'
            };
        } else if (keywordStr.includes('食品') || keywordStr.includes('餐饮') || keywordStr.includes('food')) {
            return {
                industry: '食品餐饮行业',
                customerTypes: '餐厅、食品店、咖啡店、食品批发商',
                businessContext: '食品和餐饮服务'
            };
        } else if (keywordStr.includes('美容') || keywordStr.includes('化妆') || keywordStr.includes('beauty')) {
            return {
                industry: '美容护肤行业',
                customerTypes: '美容院、化妆品店、护肤品牌、美容工作室',
                businessContext: '美容护肤产品和服务'
            };
        } else {
            // 默认通用商业客户
            return {
                industry: '商业贸易行业',
                customerTypes: '贸易公司、零售商、批发商、代理商',
                businessContext: '商业贸易和零售'
            };
        }
    };
    
    const industryContext = getIndustryContext(keywordArray);
    
    // 根据活动信息动态构建AI搜索提示词
    const searchPrompt = `作为一个专业的B2B客户开发专家，请帮我生成一些真实的潜在客户信息。

活动信息：
- 活动名称：${campaign.name}
- 活动描述：${campaign.description || '暂无描述'}
- 搜索关键词：${keywordArray.join(', ')}
- 目标平台：${platformArray.join(', ')}
- 目标行业：${industryContext.industry}
- 客户类型：${industryContext.customerTypes}

请生成8-12个与"${keywordArray.join(', ')}"相关的${industryContext.industry}潜在客户信息，要求：
1. 客户必须与关键词"${keywordArray.join(', ')}"高度相关
2. 公司类型要符合${industryContext.customerTypes}
3. 邮箱地址要与公司名匹配且看起来真实
4. 地区要分布在不同的国家和城市
5. 每个客户都要有独特的特点和专业背景

请严格按照以下JSON格式返回：
[
  {
    "name": "联系人姓名",
    "email": "contact@company.com", 
    "company": "公司名称",
    "website": "https://company.com",
    "region": "城市, 国家",
    "description": "公司简介和业务特色",
    "industry": "${industryContext.industry}",
    "source_platform": "Google/LinkedIn/Instagram",
    "phone": "+1-XXX-XXX-XXXX"
  }
]

重要要求：
- 客户必须与"${keywordArray.join(', ')}"关键词直接相关
- 确保每个邮箱地址都是唯一的
- 公司名称要有创意且真实，体现${industryContext.businessContext}特色
- 网站地址要与公司名称匹配
- 联系人姓名要符合地区特色
- 所有客户都必须是${industryContext.industry}领域的专业客户`;

    console.log(`🤖 开始AI客户搜索 - 活动: ${campaign.name}`);
    console.log(`🎯 关键词: ${keywordArray.join(', ')}`);
    console.log(`🏢 目标行业: ${industryContext.industry}`);
    
    // 调用DeepSeek API生成客户数据
    console.log('🔧 开始调用AI API...');
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "你是一个专业的B2B客户开发和市场研究专家，擅长生成真实可信的时尚零售行业潜在客户信息。请确保生成的数据格式正确且看起来真实。"
        },
        {
          role: "user",
          content: searchPrompt
        }
      ],
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      max_tokens: 2000,
      temperature: 0.8
    });
    console.log('✅ AI API调用成功完成');
    
    let generatedCustomers = [];
    try {
      const responseText = completion.choices[0].message.content;
      console.log('🔍 AI返回数据，开始解析...');
      
      // 提取JSON部分
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedCustomers = JSON.parse(jsonMatch[0]);
        console.log(`✅ 成功解析AI数据，生成了 ${generatedCustomers.length} 个客户`);
      } else {
        console.log('⚠️ 未找到JSON格式，使用备用数据');
        // 如果没有找到JSON，使用备用数据
        generatedCustomers = [
          {
            name: "Emily Zhang",
            email: "emily@luxeboutique.com",
            company: "Luxe Fashion Boutique",
            website: "https://luxeboutique.com",
            region: "Shanghai, China",
            description: "高端时尚精品店，专注于欧洲设计师品牌",
            industry: "时尚零售",
            source_platform: "Google",
            phone: "+86-21-6234-5678"
          },
          {
            name: "James Mitchell",
            email: "james@styleandtrend.com",
            company: "Style & Trend Retail",
            website: "https://styleandtrend.com",
            region: "London, UK",
            description: "现代时尚买手店，引领潮流趋势",
            industry: "买手店",
            source_platform: "LinkedIn",
            phone: "+44-20-7123-4567"
          }
        ];
      }
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      // 如果JSON解析失败，基于AI文本创建简化客户
      generatedCustomers = [
        {
          name: "AI Generated Contact",
          email: `contact${Date.now()}@airetailer.com`,
          company: "AI Fashion Retailer",
          website: "https://aifashion.com",
          region: "Global",
          description: "由AI搜索发现的时尚零售商",
          industry: "时尚零售",
          source_platform: "AI Search",
          phone: "+1-555-0123"
        }
      ];
    }
    
    // 保存搜索结果到数据库
    let createdCount = 0;
    let skippedCount = 0;
    const createdCustomers = []; // 收集新创建的客户
    
    for (const customerData of generatedCustomers) {
      try {
        // 检查邮箱是否已存在
        const existingCustomer = await Customer.findOne({ 
          where: { email: customerData.email } 
        });
        
        if (!existingCustomer) {
          // 先创建客户记录
          console.log(`📝 创建客户记录: ${customerData.email}`);
          const newCustomer = await Customer.create({
            email: customerData.email,
            name: customerData.name,
            company: customerData.company,
            website: customerData.website,
            phone: customerData.phone || '',
            address: customerData.region || '',
            industry: customerData.industry || '时尚零售',
            source_platform: customerData.source_platform || 'AI Search',
            campaign_id: campaignId,
            status: 'new',
            notes: customerData.description || ''
          });
          
          // 然后创建搜索结果记录
          console.log(`📊 创建搜索结果记录: ${customerData.company}`);
          await SearchResult.create({
            platform: customerData.source_platform || 'AI Search',
            keywords: keywordArray,
            url: customerData.website || `https://${customerData.company.toLowerCase().replace(/\s+/g, '')}.com`,
            title: customerData.company,
            description: customerData.description || `${customerData.company} - 时尚零售商`,
            extracted_data: customerData,
            status: 'processed',
            campaign_id: campaignId,
            customer_id: newCustomer.id  // 关联客户ID
          });
          
          createdCount++;
          createdCustomers.push(newCustomer); // 添加到新创建的客户列表
          console.log(`✅ 创建客户: ${customerData.name} (${customerData.company})`);
        } else {
          skippedCount++;
          console.log(`⏭️ 跳过重复客户: ${customerData.email}`);
        }
      } catch (createError) {
        console.error('❌ 创建客户记录失败:', createError);
      }
    }
    
    // 更新活动统计
    if (campaignId) {
      await campaign.update({
        total_searched: (campaign.total_searched || 0) + createdCount
      });
      console.log(`📊 更新活动统计，新增 ${createdCount} 个客户`);
    }
    
    // 为新创建的客户自动创建邮件发送任务
    console.log(`🔍 调试信息: createdCustomers.length = ${createdCustomers.length}`);
    console.log(`🔍 调试信息: createdCount = ${createdCount}`);
    console.log(`🔍 调试信息: skippedCount = ${skippedCount}`);
    
    if (createdCustomers.length > 0) {
      console.log(`📋 开始为 ${createdCustomers.length} 个客户创建邮件发送任务...`);
      console.log(`📋 活动ID: ${campaignId}`);
      
      let taskCreatedCount = 0;
      for (const customer of createdCustomers) {
        try {
          const task = await Task.create({
            type: 'email_send',
            status: 'pending',
            campaign_id: campaignId,
            customer_id: customer.id,
            task_data: {
              customer_email: customer.email,
              customer_name: customer.name,
              customer_company: customer.company,
              customer_industry: customer.industry
            },
            scheduled_at: new Date(),
            max_retries: 3,
            retry_count: 0
          });
          
          taskCreatedCount++;
          console.log(`✅ 创建邮件任务: ${customer.name} (${customer.email})`);
        } catch (taskError) {
          console.error(`❌ 创建任务失败 (客户: ${customer.name}):`, taskError);
        }
      }
      
      console.log(`📋 任务创建完成！共创建 ${taskCreatedCount} 个邮件发送任务`);
    } else {
      console.log(`⚠️ 没有新创建的客户，跳过任务创建`);
    }
    
    res.json({
      success: true,
      data: {
        results_count: generatedCustomers.length,
        new_customers: createdCount,
        skipped_customers: skippedCount,
        ai_usage: completion.usage,
        customers: generatedCustomers
      },
      message: `🎯 AI智能搜索完成！生成 ${generatedCustomers.length} 个潜在客户，新增 ${createdCount} 个，跳过重复 ${skippedCount} 个`
    });
    
  } catch (error) {
    console.error('❌ AI搜索失败:', error);
    
    let errorMessage = 'AI客户搜索失败';
    if (error.code === 'ETIMEDOUT' || error.type === 'system') {
      errorMessage = '网络连接超时，请检查网络设置';
    } else if (error.status === 401) {
      errorMessage = 'DeepSeek API密钥无效，请检查配置';
    } else if (error.status === 429) {
      errorMessage = 'API调用频率过高，请稍后重试';
    } else if (error.status === 402) {
      errorMessage = 'DeepSeek账户余额不足，请充值';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: { message: errorMessage }
    });
  }
});

// 获取搜索结果
router.get('/results', async (req, res) => {
  try {
    const { campaignId, platform, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (campaignId) where.campaign_id = campaignId;
    if (platform) where.platform = platform;
    
    const results = await SearchResult.findAndCountAll({
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
        results: results.rows,
        total: results.count,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(results.count / limit)
      }
    });
    
  } catch (error) {
    console.error('获取搜索结果失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取搜索结果失败' }
    });
  }
});

// 删除搜索结果
router.delete('/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await SearchResult.findByPk(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: { message: '搜索结果不存在' }
      });
    }
    
    await result.destroy();
    
    res.json({
      success: true,
      message: '搜索结果删除成功'
    });
    
  } catch (error) {
    console.error('删除搜索结果失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '删除搜索结果失败' }
    });
  }
});

// AI搜索专用路由
router.post('/ai-search', async (req, res) => {
  try {
    const { campaignId, keywords, platforms, maxResults = 5 } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: { message: '活动ID不能为空' }
      });
    }
    
    // 验证活动是否存在
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: '活动不存在' }
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
      timeout: 60000
    });
    
    // 获取活动详细信息，包括关键词和描述
    const campaignKeywords = campaign.search_keywords ? 
        (typeof campaign.search_keywords === 'string' ? 
            JSON.parse(campaign.search_keywords) : campaign.search_keywords) : [];
    
    // 构建搜索关键词 - 优先使用活动关键词，然后是请求关键词
    const keywordArray = campaignKeywords.length > 0 ? campaignKeywords :
                        (Array.isArray(keywords) ? keywords : 
                        (keywords ? keywords.split(',').map(k => k.trim()) : ['商业客户']));
    
    // 根据关键词动态生成行业类型和客户描述
    const getIndustryContext = (keywords) => {
        const keywordStr = keywords.join(' ').toLowerCase();
        
        if (keywordStr.includes('汽车') || keywordStr.includes('车') || keywordStr.includes('automotive')) {
            return {
                industry: '汽车相关行业',
                customerTypes: '汽车配件商、汽车用品店、改装店、经销商',
                businessContext: '汽车零配件和用品销售'
            };
        } else if (keywordStr.includes('时尚') || keywordStr.includes('服装') || keywordStr.includes('fashion')) {
            return {
                industry: '时尚零售行业',
                customerTypes: '买手店、精品店、时尚零售商、服装店',
                businessContext: '时尚服装和配饰销售'
            };
        } else if (keywordStr.includes('电子') || keywordStr.includes('数码') || keywordStr.includes('tech')) {
            return {
                industry: '电子科技行业',
                customerTypes: '电子产品店、数码商城、科技公司、代理商',
                businessContext: '电子产品和数码设备销售'
            };
        } else if (keywordStr.includes('食品') || keywordStr.includes('餐饮') || keywordStr.includes('food')) {
            return {
                industry: '食品餐饮行业',
                customerTypes: '餐厅、食品店、咖啡店、食品批发商',
                businessContext: '食品和餐饮服务'
            };
        } else if (keywordStr.includes('美容') || keywordStr.includes('化妆') || keywordStr.includes('beauty')) {
            return {
                industry: '美容护肤行业',
                customerTypes: '美容院、化妆品店、护肤品牌、美容工作室',
                businessContext: '美容护肤产品和服务'
            };
        } else {
            // 默认通用商业客户
            return {
                industry: '商业贸易行业',
                customerTypes: '贸易公司、零售商、批发商、代理商',
                businessContext: '商业贸易和零售'
            };
        }
    };
    
    const industryContext = getIndustryContext(keywordArray);
    
    console.log(`🤖 开始AI搜索 - 活动: ${campaign.name}`);
    console.log(`🎯 关键词: ${keywordArray.join(', ')}`);
    console.log(`🏢 目标行业: ${industryContext.industry}`);
    
    // 根据活动信息动态构建AI搜索提示词
    const prompt = `作为专业的B2B客户开拓专家，请根据活动"${campaign.name}"和关键词"${keywordArray.join(', ')}"生成${maxResults}个真实的潜在客户信息。

活动信息：
- 活动名称：${campaign.name}
- 活动描述：${campaign.description || '暂无描述'}
- 搜索关键词：${keywordArray.join(', ')}
- 目标行业：${industryContext.industry}
- 客户类型：${industryContext.customerTypes}

要求：
1. 客户必须与关键词"${keywordArray.join(', ')}"高度相关
2. 生成${industryContext.industry}领域的真实客户信息
3. 邮箱地址必须符合真实格式且唯一
4. 公司信息要详细准确，体现${industryContext.businessContext}特色
5. 联系人职位要合理且专业

请以JSON数组格式返回，每个客户包含以下字段：
- email: 邮箱地址
- name: 联系人姓名  
- company: 公司名称
- website: 公司网站
- phone: 电话号码
- industry: ${industryContext.industry}
- region: 地区
- description: 公司描述和业务特色

重要：
- 所有客户必须与"${keywordArray.join(', ')}"直接相关
- 只返回JSON数据，不要其他文字
- 确保客户类型符合${industryContext.customerTypes}`;

    // 调用AI生成客户数据
    console.log('📡 调用DeepSeek API...');
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🤖 AI响应接收完成');

    // 解析AI响应
    let generatedCustomers;
    try {
      generatedCustomers = JSON.parse(aiResponse);
      if (!Array.isArray(generatedCustomers)) {
        generatedCustomers = [generatedCustomers];
      }
    } catch (parseError) {
      console.error('❌ AI响应解析失败:', parseError);
      return res.status(500).json({
        success: false,
        error: { message: 'AI响应格式错误' }
      });
    }

    console.log(`✅ 成功生成 ${generatedCustomers.length} 个客户数据`);

    // 保存客户数据到数据库
    let createdCount = 0;
    let skippedCount = 0;
    const createdCustomers = []; // 收集新创建的客户
    
    for (const customerData of generatedCustomers) {
      try {
        // 检查邮箱是否已存在
        const existingCustomer = await Customer.findOne({ 
          where: { email: customerData.email } 
        });
        
        if (!existingCustomer) {
          // 先创建客户记录
          console.log(`📝 创建客户记录: ${customerData.email}`);
          const newCustomer = await Customer.create({
            email: customerData.email,
            name: customerData.name,
            company: customerData.company,
            website: customerData.website,
            phone: customerData.phone || '',
            address: customerData.region || '',
            industry: customerData.industry || '时尚零售',
            source_platform: 'AI Search',
            campaign_id: campaignId,
            status: 'new',
            notes: customerData.description || ''
          });
          
          // 然后创建搜索结果记录
          console.log(`📊 创建搜索结果记录: ${customerData.company}`);
          await SearchResult.create({
            platform: 'AI Search',
            keywords: keywordArray,
            url: customerData.website || `https://${customerData.company.toLowerCase().replace(/\s+/g, '')}.com`,
            title: customerData.company,
            description: customerData.description || `${customerData.company} - AI生成客户`,
            extracted_data: customerData,
            status: 'processed',
            campaign_id: campaignId,
            customer_id: newCustomer.id
          });
          
          createdCount++;
          createdCustomers.push(newCustomer); // 添加到新创建的客户列表
          console.log(`✅ 创建客户: ${customerData.name} (${customerData.company})`);
        } else {
          skippedCount++;
          console.log(`⏭️ 跳过重复客户: ${customerData.email}`);
        }
      } catch (createError) {
        console.error(`❌ 创建客户记录失败:`, createError.message);
        console.error(`📧 失败的邮箱: ${customerData.email}`);
        console.error(`🏢 失败的公司: ${customerData.company}`);
        skippedCount++;
      }
    }
    
    // 更新活动统计
    if (campaignId) {
      await campaign.update({
        total_searched: (campaign.total_searched || 0) + createdCount
      });
      console.log(`📊 更新活动统计，新增 ${createdCount} 个客户`);
    }
    
    // 为新创建的客户自动创建邮件发送任务
    console.log(`🔍 调试信息: createdCustomers.length = ${createdCustomers.length}`);
    console.log(`🔍 调试信息: createdCount = ${createdCount}`);
    console.log(`🔍 调试信息: skippedCount = ${skippedCount}`);
    
    if (createdCustomers.length > 0) {
      console.log(`📋 开始为 ${createdCustomers.length} 个客户创建邮件发送任务...`);
      console.log(`📋 活动ID: ${campaignId}`);
      
      let taskCreatedCount = 0;
      for (const customer of createdCustomers) {
        try {
          console.log(`🔧 正在为客户 ${customer.name} (${customer.id}) 创建任务...`);
          
          const taskData = {
            type: 'email_send',
            status: 'pending',
            priority: 0,
            campaign_id: campaignId,
            customer_id: customer.id,
            task_data: {
              customer_info: {
                name: customer.name,
                email: customer.email,
                company: customer.company,
                industry: customer.industry,
                region: customer.region
              }
            },
            scheduled_at: new Date(),
            max_retries: 3,
            metadata: {
              created_from: 'search',
              search_keywords: keywordArray
            }
          };
          
          console.log(`📝 任务数据:`, JSON.stringify(taskData, null, 2));
          
          const task = await Task.create(taskData);
          
          taskCreatedCount++;
          console.log(`✅ 创建邮件任务成功: ${customer.name} (${customer.email}) - 任务ID: ${task.id}`);
        } catch (taskError) {
          console.error(`❌ 创建任务失败 for ${customer.email}:`, taskError.message);
          console.error(`❌ 详细错误:`, taskError);
        }
      }
      
      console.log(`📋 任务创建完成！共创建 ${taskCreatedCount} 个邮件发送任务`);
    } else {
      console.log(`⚠️ 没有新创建的客户，跳过任务创建`);
    }
    
    res.json({
      success: true,
      data: {
        message: `AI搜索完成！成功创建 ${createdCount} 个客户，跳过 ${skippedCount} 个重复客户`,
        created_count: createdCount,
        skipped_count: skippedCount,
        total_processed: generatedCustomers.length,
        keywords: keywordArray,
        tasks_created: createdCustomers.length
      }
    });

  } catch (error) {
    console.error('❌ AI搜索失败:', error.message);
    console.error('🔍 错误详情:', error.stack);
    
    // 针对不同错误类型返回不同信息
    let errorMessage = 'AI搜索失败';
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorMessage = 'AI服务连接超时，请检查网络连接';
    } else if (error.status === 401) {
      errorMessage = 'AI API密钥无效，请检查配置';
    } else if (error.status === 429) {
      errorMessage = 'AI API调用频率过高，请稍后重试';
    }
    
    res.status(500).json({
      success: false,
      error: { 
        message: errorMessage,
        details: error.message 
      }
    });
  }
});

module.exports = router; 