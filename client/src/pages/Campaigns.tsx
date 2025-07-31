import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  PlayArrow,
  Pause,
  MoreVert,
  Edit,
  Delete,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSnackbar } from 'notistack'
import { campaignApi, searchApi } from '../services/api'

export default function Campaigns() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    search_keywords: '',
    search_platforms: '',
  })

  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  // 获取活动列表
  const { data: campaignsData, isLoading, error } = useQuery(
    'campaigns',
    () => campaignApi.getAll(),
    {
      refetchOnWindowFocus: false,
    }
  )

  // 创建活动的mutation
  const createMutation = useMutation(campaignApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      setCreateDialogOpen(false)
      setNewCampaign({ name: '', description: '', search_keywords: '', search_platforms: '' })
      enqueueSnackbar('活动创建成功！', { variant: 'success' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`创建失败: ${error.message}`, { variant: 'error' })
    },
  })

  // 启动活动的mutation
  const startMutation = useMutation(campaignApi.start, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      enqueueSnackbar('活动启动成功！', { variant: 'success' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`启动失败: ${error.message}`, { variant: 'error' })
    },
  })

  // 暂停活动的mutation
  const pauseMutation = useMutation(campaignApi.pause, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      enqueueSnackbar('活动已暂停', { variant: 'info' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`暂停失败: ${error.message}`, { variant: 'error' })
    },
  })

  // AI搜索客户的mutation
  const searchMutation = useMutation(searchApi.search, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('campaigns')
      queryClient.invalidateQueries('customers')
      enqueueSnackbar(data.message || `🎯 AI搜索完成！生成了 ${data.data.results_count} 个潜在客户`, { variant: 'success' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`AI搜索失败: ${error.message}`, { variant: 'error' })
    },
  })

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim()) {
      enqueueSnackbar('请输入活动名称', { variant: 'warning' })
      return
    }

    const campaignData = {
      ...newCampaign,
      search_keywords: newCampaign.search_keywords.split(',').map(k => k.trim()).filter(k => k),
      search_platforms: newCampaign.search_platforms.split(',').map(p => p.trim()).filter(p => p),
    }

    createMutation.mutate(campaignData)
  }

  const handleStartSearch = (campaignId: string, keywords: any[], platforms: any[]) => {
    searchMutation.mutate({
      campaignId,
      keywords,
      platforms
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'paused': return 'warning'
      case 'completed': return 'info'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '运行中'
      case 'paused': return '已暂停'
      case 'draft': return '草稿'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          活动管理
        </Typography>
        <Alert severity="error">
          加载活动列表失败，请检查网络连接和后端服务
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          活动管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          创建新活动
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 提示: 创建活动后，系统会自动搜索指定平台的潜在客户，并使用AI生成个性化开发信。
      </Alert>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {(!campaignsData?.data || campaignsData.data.length === 0) ? (
            <Grid item xs={12}>
              <Card sx={{ textAlign: 'center', py: 4 }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    还没有创建任何活动
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    创建您的第一个AI客户开发活动，开始自动搜索和联系潜在客户
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    创建第一个活动
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            campaignsData.data.map((campaign: any) => (
              <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                        {campaign.name}
                      </Typography>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    <Chip
                      label={getStatusLabel(campaign.status)}
                      color={getStatusColor(campaign.status)}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    {campaign.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {campaign.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        搜索数量
                      </Typography>
                      <Typography variant="caption">
                        {campaign.total_searched || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        发送邮件
                      </Typography>
                      <Typography variant="caption">
                        {campaign.total_emails_sent || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="textSecondary">
                        回复数量
                      </Typography>
                      <Typography variant="caption">
                        {campaign.total_replies || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    {campaign.status === 'draft' ? (
                      <Button
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => handleStartSearch(
                          campaign.id,
                          campaign.search_keywords || [],
                          campaign.search_platforms || []
                        )}
                        disabled={searchMutation.isLoading}
                      >
                        开始搜索
                      </Button>
                    ) : campaign.status === 'active' ? (
                      <Button
                        size="small"
                        startIcon={<Pause />}
                        onClick={() => pauseMutation.mutate(campaign.id)}
                        disabled={pauseMutation.isLoading}
                      >
                        暂停
                      </Button>
                    ) : campaign.status === 'paused' ? (
                      <Button
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => startMutation.mutate(campaign.id)}
                        disabled={startMutation.isLoading}
                      >
                        继续
                      </Button>
                    ) : null}
                    
                    <Button size="small">
                      查看详情
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* 创建活动对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新活动</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="活动名称"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="例如：买手店开发活动"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="活动描述"
                multiline
                rows={3}
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                placeholder="描述这个活动的目标和策略"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="搜索关键词"
                value={newCampaign.search_keywords}
                onChange={(e) => setNewCampaign({ ...newCampaign, search_keywords: e.target.value })}
                placeholder="例如：买手店,时尚零售,服装批发 (用逗号分隔)"
                helperText="输入要搜索的关键词，用逗号分隔"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="搜索平台"
                value={newCampaign.search_platforms}
                onChange={(e) => setNewCampaign({ ...newCampaign, search_platforms: e.target.value })}
                placeholder="例如：Google,LinkedIn,1688 (用逗号分隔)"
                helperText="指定要搜索的平台，用逗号分隔"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleCreateCampaign}
            variant="contained"
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? <CircularProgress size={20} /> : '创建活动'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 