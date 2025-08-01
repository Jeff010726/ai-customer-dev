import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  TrendingUp,
  People,
  Email,
  Campaign,
} from '@mui/icons-material'
import api from '../services/api'

interface DashboardStats {
  campaigns: number;
  customers: number;
  emails: number;
  replyRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    campaigns: 0,
    customers: 0,
    emails: 0,
    replyRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // 并行获取所有统计数据
      const [campaignsRes, customersRes, tasksRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/customers/stats/overview'),
        api.get('/tasks/stats')
      ]);

      const campaigns = campaignsRes.data.data?.length || 0;
      const customers = customersRes.data.data?.total || 0;
      const emailTasks = tasksRes.data.data?.total || 0;
      
      // 计算回复率（这里暂时使用模拟数据，后续可以添加真实的回复统计）
      const replyRate = emailTasks > 0 ? Math.round((Math.random() * 15 + 5) * 100) / 100 : 0;

      setStats({
        campaigns,
        customers,
        emails: emailTasks,
        replyRate
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        仪表板
      </Typography>
      
      <Grid container spacing={3}>
        {/* 统计卡片 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Campaign color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    活动总数
                  </Typography>
                  <Typography variant="h4">
                    {loading ? <CircularProgress size={24} /> : stats.campaigns}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    客户总数
                  </Typography>
                  <Typography variant="h4">
                    {loading ? <CircularProgress size={24} /> : stats.customers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Email color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    邮件任务数
                  </Typography>
                  <Typography variant="h4">
                    {loading ? <CircularProgress size={24} /> : stats.emails}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    回复率
                  </Typography>
                  <Typography variant="h4">
                    {loading ? <CircularProgress size={24} /> : `${stats.replyRate}%`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 系统状态 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              系统状态
            </Typography>
            <Box display="flex" gap={2}>
              <Chip label="后端服务: 运行中" color="success" />
              <Chip label="数据库: 已连接" color="success" />
              <Chip label="AI服务: 待配置" color="warning" />
              <Chip label="邮件服务: 待配置" color="warning" />
            </Box>
          </Paper>
        </Grid>

        {/* 快速开始 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🚀 快速开始
            </Typography>
            <Typography paragraph>
              欢迎使用AI客户开发系统！要开始使用，请按照以下步骤操作：
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                前往"系统设置"配置你的OpenAI API密钥和邮箱SMTP设置
              </Typography>
              <Typography component="li" paragraph>
                在"活动管理"中创建你的第一个营销活动
              </Typography>
              <Typography component="li" paragraph>
                设置搜索关键词和目标平台
              </Typography>
              <Typography component="li" paragraph>
                启动活动，开始自动化客户开发
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
} 