const express = require('express');
const { Report, Campaign, Customer, Email } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// 获取报告列表
router.get('/', async (req, res) => {
  try {
    const { type, campaignId, limit = 20, offset = 0 } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (campaignId) where.campaign_id = campaignId;
    
    const reports = await Report.findAndCountAll({
      where,
      include: [
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
        reports: reports.rows,
        total: reports.count,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(reports.count / limit)
      }
    });
  } catch (error) {
    console.error('获取报告失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '获取报告失败' }
    });
  }
});

// 生成报告
router.post('/generate', async (req, res) => {
  try {
    const { type, campaignId, period_start, period_end, title } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: { message: '报告类型不能为空' }
      });
    }
    
    let reportData = {};
    let reportTitle = title || `${type}报告`;
    
    const startDate = period_start ? new Date(period_start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = period_end ? new Date(period_end) : new Date();
    
    switch (type) {
      case 'campaign_summary':
        reportData = await generateCampaignSummaryReport(campaignId, startDate, endDate);
        reportTitle = `活动总结报告${campaignId ? ` - ${reportData.campaignName || ''}` : ''}`;
        break;
        
      case 'email_performance':
        reportData = await generateEmailPerformanceReport(campaignId, startDate, endDate);
        reportTitle = `邮件发送效果报告${campaignId ? ` - ${reportData.campaignName || ''}` : ''}`;
        break;
        
      case 'customer_analysis':
        reportData = await generateCustomerAnalysisReport(campaignId, startDate, endDate);
        reportTitle = `客户分析报告${campaignId ? ` - ${reportData.campaignName || ''}` : ''}`;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: { message: '不支持的报告类型' }
        });
    }
    
    const report = await Report.create({
      type,
      title: reportTitle,
      data: reportData,
      period_start: startDate,
      period_end: endDate,
      campaign_id: campaignId
    });
    
    res.json({
      success: true,
      data: report,
      message: '报告生成成功'
    });
    
  } catch (error) {
    console.error('生成报告失败:', error);
    res.status(500).json({
      success: false,
      error: { message: '生成报告失败' }
    });
  }
});

// 生成活动总结报告
async function generateCampaignSummaryReport(campaignId, startDate, endDate) {
  const where = {
    created_at: {
      [Op.between]: [startDate, endDate]
    }
  };
  
  if (campaignId) {
    where.campaign_id = campaignId;
  }
  
  const campaigns = await Campaign.findAll({
    where: campaignId ? { id: campaignId } : {},
    include: [
      {
        model: Customer,
        as: 'customers',
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false
      },
      {
        model: Email,
        as: 'emails',
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false
      }
    ]
  });
  
  const summary = {
    totalCampaigns: campaigns.length,
    totalCustomers: 0,
    totalEmails: 0,
    totalReplies: 0,
    campaignDetails: []
  };
  
  campaigns.forEach(campaign => {
    const customerCount = campaign.customers ? campaign.customers.length : 0;
    const emailCount = campaign.emails ? campaign.emails.length : 0;
    const replyCount = campaign.emails ? campaign.emails.filter(e => e.replied_at).length : 0;
    
    summary.totalCustomers += customerCount;
    summary.totalEmails += emailCount;
    summary.totalReplies += replyCount;
    
    summary.campaignDetails.push({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      customers: customerCount,
      emails: emailCount,
      replies: replyCount,
      replyRate: emailCount > 0 ? (replyCount / emailCount * 100).toFixed(2) : 0
    });
  });
  
  summary.overallReplyRate = summary.totalEmails > 0 ? 
    (summary.totalReplies / summary.totalEmails * 100).toFixed(2) : 0;
  
  return summary;
}

// 生成邮件效果报告
async function generateEmailPerformanceReport(campaignId, startDate, endDate) {
  const where = {
    created_at: {
      [Op.between]: [startDate, endDate]
    }
  };
  
  if (campaignId) {
    where.campaign_id = campaignId;
  }
  
  const emails = await Email.findAll({
    where,
    include: [
      {
        model: Campaign,
        as: 'campaign'
      }
    ]
  });
  
  const performance = {
    totalSent: emails.length,
    delivered: emails.filter(e => e.delivered_at).length,
    opened: emails.filter(e => e.opened_at).length,
    replied: emails.filter(e => e.replied_at).length,
    bounced: emails.filter(e => e.bounce_type).length,
    clickThroughs: emails.reduce((sum, e) => sum + (e.click_count || 0), 0),
    byStatus: {},
    dailyStats: {}
  };
  
  // 按状态统计
  emails.forEach(email => {
    performance.byStatus[email.status] = (performance.byStatus[email.status] || 0) + 1;
  });
  
  // 按日期统计
  emails.forEach(email => {
    const date = email.created_at.toISOString().split('T')[0];
    if (!performance.dailyStats[date]) {
      performance.dailyStats[date] = { sent: 0, delivered: 0, opened: 0, replied: 0 };
    }
    performance.dailyStats[date].sent++;
    if (email.delivered_at) performance.dailyStats[date].delivered++;
    if (email.opened_at) performance.dailyStats[date].opened++;
    if (email.replied_at) performance.dailyStats[date].replied++;
  });
  
  // 计算比率
  performance.deliveryRate = performance.totalSent > 0 ? 
    (performance.delivered / performance.totalSent * 100).toFixed(2) : 0;
  performance.openRate = performance.delivered > 0 ? 
    (performance.opened / performance.delivered * 100).toFixed(2) : 0;
  performance.replyRate = performance.delivered > 0 ? 
    (performance.replied / performance.delivered * 100).toFixed(2) : 0;
  performance.bounceRate = performance.totalSent > 0 ? 
    (performance.bounced / performance.totalSent * 100).toFixed(2) : 0;
  
  return performance;
}

// 生成客户分析报告
async function generateCustomerAnalysisReport(campaignId, startDate, endDate) {
  const where = {
    created_at: {
      [Op.between]: [startDate, endDate]
    }
  };
  
  if (campaignId) {
    where.campaign_id = campaignId;
  }
  
  const customers = await Customer.findAll({
    where,
    include: [
      {
        model: Campaign,
        as: 'campaign'
      }
    ]
  });
  
  const analysis = {
    totalCustomers: customers.length,
    byStatus: {},
    byIndustry: {},
    byCountry: {},
    bySource: {},
    contactedCount: customers.filter(c => c.contact_count > 0).length,
    repliedCount: customers.filter(c => c.last_replied_at).length,
    averageScore: 0,
    topCountries: [],
    topIndustries: [],
    topSources: []
  };
  
  // 按各维度统计
  customers.forEach(customer => {
    // 按状态
    analysis.byStatus[customer.status] = (analysis.byStatus[customer.status] || 0) + 1;
    
    // 按行业
    if (customer.industry) {
      analysis.byIndustry[customer.industry] = (analysis.byIndustry[customer.industry] || 0) + 1;
    }
    
    // 按国家
    if (customer.country) {
      analysis.byCountry[customer.country] = (analysis.byCountry[customer.country] || 0) + 1;
    }
    
    // 按来源平台
    if (customer.source_platform) {
      analysis.bySource[customer.source_platform] = (analysis.bySource[customer.source_platform] || 0) + 1;
    }
  });
  
  // 计算平均分数
  const totalScore = customers.reduce((sum, c) => sum + (c.score || 0), 0);
  analysis.averageScore = customers.length > 0 ? (totalScore / customers.length).toFixed(1) : 0;
  
  // 排序获取TOP项
  analysis.topCountries = Object.entries(analysis.byCountry)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));
    
  analysis.topIndustries = Object.entries(analysis.byIndustry)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([industry, count]) => ({ industry, count }));
    
  analysis.topSources = Object.entries(analysis.bySource)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));
  
  // 计算转化率
  analysis.contactRate = analysis.totalCustomers > 0 ? 
    (analysis.contactedCount / analysis.totalCustomers * 100).toFixed(2) : 0;
  analysis.replyRate = analysis.contactedCount > 0 ? 
    (analysis.repliedCount / analysis.contactedCount * 100).toFixed(2) : 0;
  
  return analysis;
}

module.exports = router; 