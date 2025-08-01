const express = require('express');
const { Campaign, Customer, Email, EmailTemplate } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// 支持的搜索平台配置
const SUPPORTED_PLATFORMS = [
  {
    id: 'google',
    name: 'Google',
    description: '全球最大的搜索引擎，适合发现各类企业信息',
    icon: 'search',
    category: '搜索引擎'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: '专业商务社交平台，精准获取企业决策人信息',
    icon: 'business',
    category: '商务平台'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: '时尚品牌聚集地，适合发现潮流买手店',
    icon: 'photo_camera',
    category: '社交媒体'
  },
  {
    id: 'bing',
    name: 'Bing', 
    description: '微软搜索引擎，提供不同视角的搜索结果',
    icon: 'search',
    category: '搜索引擎'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    description: '注重隐私的搜索引擎，获取独特搜索结果',
    icon: 'privacy_tip',
    category: '搜索引擎'
  },
  {
    id: '1688',
    name: '1688',
    description: '阿里巴巴B2B平台，适合寻找制造商和供应商',
    icon: 'factory',
    category: 'B2B平台'
  },
  {
    id: 'alibaba',
    name: 'Alibaba.com',
    description: '全球领先的B2B贸易平台',
    icon: 'language',
    category: 'B2B平台'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: '全球最大社交平台，丰富的企业页面信息',
    icon: 'facebook',
    category: '社交媒体'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    description: '实时信息平台，获取企业最新动态',
    icon: 'alternate_email',
    category: '社交媒体'
  },
  {
    id: 'ai-search',
    name: 'AI智能搜索',
    description: '内置AI搜索引擎，智能分析和生成客户信息',
    icon: 'smart_toy',
    category: 'AI工具'
  }
];

// 获取支持的搜索平台列表
router.get('/platforms', async (req, res) => {
  try {
    res.json({
      success: true,
      data: SUPPORTED_PLATFORMS,
      message: '获取支持的搜索平台成功'
    });
  } catch (error) {
    console.error('获取搜索平台失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取搜索平台失败' }
    });
  }
});

// 获取所有活动
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    
    const campaigns = await Campaign.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: EmailTemplate,
          as: 'email_template',
          attributes: ['id', 'name', 'subject']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    res.json({
      success: true,
      data: campaigns.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(campaigns.count / limit),
        total_items: campaigns.count,
        per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error('获取活动列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取活动列表失败'
    });
  }
});

// 获取单个活动详情
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          as: 'customers',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: Email,
          as: 'emails',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: EmailTemplate,
          as: 'email_template'
        }
      ]
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
    
  } catch (error) {
    logger.error('获取活动详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取活动详情失败'
    });
  }
});

// 创建新活动
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      search_platforms,
      search_keywords,
      search_filters,
      email_template_id,
      send_strategy,
      start_date,
      end_date,
      settings,
      email_config,
      automation_config
    } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '活动名称不能为空'
      });
    }
    
    const campaign = await Campaign.create({
      name,
      description: description || '',
      search_platforms: search_platforms || [],
      search_keywords: search_keywords || [],
      search_filters: search_filters || {},
      email_config: email_config || {},
      automation_config: automation_config || {},
      status: 'draft'
    });
    
    logger.info(`创建新活动: ${name}`, { campaign_id: campaign.id });
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: '活动创建成功'
    });
    
  } catch (error) {
    logger.error('创建活动失败:', error);
    res.status(500).json({
      success: false,
      error: '创建活动失败'
    });
  }
});

// 更新活动
router.put('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    const {
      name,
      description,
      status,
      search_platforms,
      search_keywords,
      search_filters,
      email_template_id,
      send_strategy,
      start_date,
      end_date,
      settings
    } = req.body;
    
    await campaign.update({
      name,
      description,
      status,
      search_platforms,
      search_keywords,
      search_filters,
      email_template_id,
      send_strategy,
      start_date,
      end_date,
      settings
    });
    
    logger.info(`更新活动: ${campaign.name}`, { campaign_id: campaign.id });
    
    res.json({
      success: true,
      data: campaign,
      message: '活动更新成功'
    });
    
  } catch (error) {
    logger.error('更新活动失败:', error);
    res.status(500).json({
      success: false,
      error: '更新活动失败'
    });
  }
});

// 删除活动
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    await campaign.destroy();
    
    logger.info(`删除活动: ${campaign.name}`, { campaign_id: campaign.id });
    
    res.json({
      success: true,
      message: '活动删除成功'
    });
    
  } catch (error) {
    logger.error('删除活动失败:', error);
    res.status(500).json({
      success: false,
      error: '删除活动失败'
    });
  }
});

// 启动活动
router.post('/:id/start', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    // 检查活动是否可以启动
    if (campaign.status === 'active') {
      return res.status(400).json({
        success: false,
        error: '活动已在运行中'
      });
    }
    
    await campaign.update({ 
      status: 'active',
      start_date: campaign.start_date || new Date()
    });
    
    logger.info(`🚀 启动活动: ${campaign.name}，开始AI客户搜索...`, { campaign_id: campaign.id });
    
    // 异步触发AI搜索（不等待结果，避免阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`🤖 活动 ${campaign.name} 已启动，正在进行AI客户搜索...`);
        
        // 准备搜索参数
        const searchKeywords = campaign.search_keywords || ['时尚零售', '买手店', 'fashion retail'];
        const searchPlatforms = campaign.search_platforms || ['Google', 'LinkedIn'];
        
        // 调用内部搜索逻辑
        const searchParams = {
          campaignId: campaign.id,
          keywords: searchKeywords,
          platforms: searchPlatforms
        };
        
        // 模拟调用搜索API
        const axios = require('axios');
        const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
        const searchUrl = `${baseUrl}/api/search`;
        
        const searchResponse = await axios.post(searchUrl, searchParams);
        
        if (searchResponse.data.success) {
          console.log(`✅ 活动 ${campaign.name} AI搜索完成：${searchResponse.data.message}`);
        } else {
          console.error(`❌ 活动 ${campaign.name} AI搜索失败：${searchResponse.data.error?.message}`);
        }
      } catch (searchError) {
        console.error(`活动 ${campaign.id} 自动搜索失败:`, searchError.message);
      }
    });
    
    res.json({
      success: true,
      data: campaign,
      message: '活动启动成功，AI客户搜索已开始运行'
    });
    
  } catch (error) {
    logger.error('启动活动失败:', error);
    res.status(500).json({
      success: false,
      error: '启动活动失败'
    });
  }
});

// 暂停活动
router.post('/:id/pause', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    await campaign.update({ status: 'paused' });
    
    logger.info(`暂停活动: ${campaign.name}`, { campaign_id: campaign.id });
    
    res.json({
      success: true,
      data: campaign,
      message: '活动暂停成功'
    });
    
  } catch (error) {
    logger.error('暂停活动失败:', error);
    res.status(500).json({
      success: false,
      error: '暂停活动失败'
    });
  }
});

// 获取活动统计
router.get('/:id/stats', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: '活动不存在'
      });
    }
    
    // 获取客户统计
    const customerStats = await Customer.getStatusStats(campaign.id);
    
    // 获取邮件统计
    const emailStats = await Email.findAll({
      where: { campaign_id: campaign.id },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    const emailStatsObj = {};
    emailStats.forEach(stat => {
      emailStatsObj[stat.status] = parseInt(stat.count);
    });
    
    res.json({
      success: true,
      data: {
        campaign_info: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          created_at: campaign.created_at
        },
        customers: customerStats,
        emails: emailStatsObj,
        success_rate: campaign.getSuccessRate()
      }
    });
    
  } catch (error) {
    logger.error('获取活动统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取活动统计失败'
    });
  }
});

module.exports = router; 