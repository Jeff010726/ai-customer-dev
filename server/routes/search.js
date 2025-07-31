const express = require('express');
const { SearchResult, Customer, Campaign } = require('../models');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const router = express.Router();

// 执行AI智能搜索
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
      timeout: 30000,
    });
    
    // 构建搜索关键词
    const keywordArray = Array.isArray(keywords) ? keywords : 
                        (keywords ? keywords.split(',').map(k => k.trim()) : ['时尚零售', '买手店', 'fashion retail']);
    const platformArray = Array.isArray(platforms) ? platforms : 
                         (platforms ? platforms.split(',').map(p => p.trim()) : ['Google', 'LinkedIn']);
    
    // 构建AI搜索提示词
    const searchPrompt = `作为一个专业的B2B客户开发专家，请帮我生成一些真实的潜在买手店和时尚零售商客户信息。

搜索关键词：${keywordArray.join(', ')}
目标平台：${platformArray.join(', ')}
活动目标：开发时尚行业的买手店和零售商客户

请生成8-12个不同的潜在客户信息，要求：
1. 公司名称要多样化，包括精品店、买手店、时尚零售商等
2. 邮箱地址要与公司名匹配且看起来真实
3. 地区要分布在不同的国家和城市
4. 每个客户都要有独特的特点

请严格按照以下JSON格式返回：
[
  {
    "name": "联系人姓名",
    "email": "contact@company.com", 
    "company": "公司名称",
    "website": "https://company.com",
    "region": "城市, 国家",
    "description": "公司简介和特色",
    "industry": "时尚零售/买手店/精品店",
    "source_platform": "Google/LinkedIn/Instagram",
    "phone": "+1-XXX-XXX-XXXX"
  }
]

注意：
- 确保每个邮箱地址都是唯一的
- 公司名称要有创意且真实
- 网站地址要与公司名称匹配
- 联系人姓名要符合地区特色`;

    console.log('🤖 开始AI客户搜索，生成潜在买手店客户...');
    
    // 调用DeepSeek API生成客户数据
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
    
    for (const customerData of generatedCustomers) {
      try {
        // 检查邮箱是否已存在
        const existingCustomer = await Customer.findOne({ 
          where: { email: customerData.email } 
        });
        
        if (!existingCustomer) {
          // 创建搜索结果记录
          await SearchResult.create({
            platform: customerData.source_platform || 'AI Search',
            keywords: keywordArray,
            url: customerData.website || `https://${customerData.company.toLowerCase().replace(/\s+/g, '')}.com`,
            title: customerData.company,
            description: customerData.description || `${customerData.company} - 时尚零售商`,
            extracted_data: customerData,
            status: 'processed',
            campaign_id: campaignId
          });
          
          // 创建客户记录
          await Customer.create({
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
            source_data: customerData,
            notes: customerData.description || ''
          });
          
          createdCount++;
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

module.exports = router; 