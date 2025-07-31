const express = require('express');
const { Customer, Campaign } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// 获取所有客户
router.get('/', async (req, res) => {
  try {
    const { campaign_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (campaign_id) whereClause.campaign_id = campaign_id;
    if (status) whereClause.status = status;
    
    const customers = await Customer.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    res.json({
      success: true,
      data: customers.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(customers.count / limit),
        total_items: customers.count,
        per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error('获取客户列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户列表失败'
    });
  }
});

// 获取客户详情
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
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
        error: '客户不存在'
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
    
  } catch (error) {
    logger.error('获取客户详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户详情失败'
    });
  }
});

// 创建客户
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    
    res.status(201).json({
      success: true,
      data: customer,
      message: '客户创建成功'
    });
    
  } catch (error) {
    logger.error('创建客户失败:', error);
    res.status(500).json({
      success: false,
      error: '创建客户失败'
    });
  }
});

// 更新客户
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: '客户不存在'
      });
    }
    
    await customer.update(req.body);
    
    res.json({
      success: true,
      data: customer,
      message: '客户更新成功'
    });
    
  } catch (error) {
    logger.error('更新客户失败:', error);
    res.status(500).json({
      success: false,
      error: '更新客户失败'
    });
  }
});

// 获取客户统计
router.get('/stats/overview', async (req, res) => {
  try {
    const { campaign_id } = req.query;
    const stats = await Customer.getStatusStats(campaign_id);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('获取客户统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户统计失败'
    });
  }
});

module.exports = router; 