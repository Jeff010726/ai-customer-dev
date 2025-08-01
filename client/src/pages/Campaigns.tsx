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
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  FormGroup,
  Checkbox,
  Tooltip,
  Icon,
} from '@mui/material'
import {
  Add as AddIcon,
  PlayArrow,
  Pause,
  MoreVert,
  Edit,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSnackbar } from 'notistack'
import { campaignApi, searchApi } from '../services/api'

const initialCampaignState = {
  name: '',
  description: '',
  search_keywords: '',
  search_platforms: ['google', 'linkedin'], // 改为数组格式
  email_config: {
    product_description: '',
    service_description: '',
    writing_style: 'professional',
    tone: 'friendly',
    sender_name: '',
    sender_title: '',
    company_info: '',
    call_to_action: '安排一次简短的在线会议',
    custom_prompt: ''
  },
  automation_config: {
    auto_search: true,
    auto_send: true,
    emails_per_hour: 10,
    max_retries: 3,
    search_interval_hours: 24,
    duplicate_check: true
  }
};

const writingStyles = ['professional', 'casual', 'enthusiastic', 'direct', 'formal'];
const tones = ['friendly', 'persuasive', 'informative', 'humorous', 'empathetic'];

export default function Campaigns() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [newCampaign, setNewCampaign] = useState<any>(initialCampaignState)

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

  // 获取支持的搜索平台列表
  const { data: platformsData } = useQuery(
    'platforms', 
    () => campaignApi.getPlatforms(),
    {
      refetchOnWindowFocus: false,
    }
  )

  // 创建活动的mutation
  const createMutation = useMutation(campaignApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      setCreateDialogOpen(false)
      setNewCampaign(initialCampaignState)
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
      enqueueSnackbar(data?.data?.message || `🎯 AI搜索完成！生成了 ${data?.data?.results_count || 0} 个潜在客户`, { variant: 'success' })
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
      search_platforms: newCampaign.search_platforms, // 已经是数组格式
    }

    createMutation.mutate(campaignData)
  }

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign({ ...campaign })
    setEditMode(false)
    setDetailsDialogOpen(true)
  }

  const handleEditCampaign = () => {
    setEditMode(true)
  }

  const handleSaveEdit = () => {
    // TODO: 实现编辑保存功能
    setEditMode(false)
    enqueueSnackbar('活动配置已更新', { variant: 'success' })
  }

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false)
    setSelectedCampaign(null)
    setEditMode(false)
  }

  const handleActivateCampaign = (campaignId: string) => {
    // 激活活动，启动自动化流程
    startMutation.mutate(campaignId)
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
      <Box sx={{ width: '100%', maxWidth: 'none' }}>
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
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
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
                        onClick={() => handleActivateCampaign(campaign.id)}
                        disabled={startMutation.isLoading}
                      >
                        激活
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
                    
                    <Button size="small" onClick={() => handleViewDetails(campaign)}>
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
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend">搜索平台</FormLabel>
                <Box sx={{ mt: 1 }}>
                  {platformsData?.data && (
                    <Grid container spacing={1}>
                      {/* 按分类分组显示 */}
                      {Object.entries(
                        platformsData.data.reduce((acc, platform) => {
                          if (!acc[platform.category]) acc[platform.category] = [];
                          acc[platform.category].push(platform);
                          return acc;
                        }, {})
                      ).map(([category, platforms]) => (
                        <Grid item xs={12} key={category}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {category}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {platforms.map((platform) => (
                              <Tooltip key={platform.id} title={platform.description} placement="top">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={newCampaign.search_platforms.includes(platform.id)}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        const currentPlatforms = newCampaign.search_platforms;
                                        
                                        if (isChecked) {
                                          setNewCampaign({
                                            ...newCampaign,
                                            search_platforms: [...currentPlatforms, platform.id]
                                          });
                                        } else {
                                          setNewCampaign({
                                            ...newCampaign,
                                            search_platforms: currentPlatforms.filter(p => p !== platform.id)
                                          });
                                        }
                                      }}
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Icon fontSize="small">{platform.icon}</Icon>
                                      <Typography variant="body2">{platform.name}</Typography>
                                    </Box>
                                  }
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    已选择 {newCampaign.search_platforms.length} 个平台
                  </Typography>
                </Box>
              </FormControl>
            </Grid>
            
            {/* 邮件配置 */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>邮件生成配置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="产品描述"
                        multiline
                        rows={2}
                        value={newCampaign.email_config?.product_description || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), product_description: e.target.value }
                        })}
                        placeholder="描述您的主要产品，例如：高端时尚服装、设计师品牌..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="服务描述"
                        multiline
                        rows={2}
                        value={newCampaign.email_config?.service_description || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), service_description: e.target.value }
                        })}
                        placeholder="描述您提供的服务，例如：一站式采购服务、独家设计师合作..."
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="发件人姓名"
                        value={newCampaign.email_config?.sender_name || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), sender_name: e.target.value }
                        })}
                        placeholder="例如：张三"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="发件人职位"
                        value={newCampaign.email_config?.sender_title || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), sender_title: e.target.value }
                        })}
                        placeholder="例如：销售总监"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="公司信息"
                        multiline
                        rows={2}
                        value={newCampaign.email_config?.company_info || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), company_info: e.target.value }
                        })}
                        placeholder="简要介绍您的公司，例如：专注高端时尚20年的供应链公司..."
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>写作风格</InputLabel>
                        <Select
                          value={newCampaign.email_config?.writing_style || 'professional'}
                          onChange={(e) => setNewCampaign({
                            ...newCampaign,
                            email_config: { ...(newCampaign.email_config || {}), writing_style: e.target.value }
                          })}
                          label="写作风格"
                        >
                          {writingStyles.map(style => (
                            <MenuItem key={style} value={style}>{style}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>语气</InputLabel>
                        <Select
                          value={newCampaign.email_config?.tone || 'friendly'}
                          onChange={(e) => setNewCampaign({
                            ...newCampaign,
                            email_config: { ...(newCampaign.email_config || {}), tone: e.target.value }
                          })}
                          label="语气"
                        >
                          {tones.map(tone => (
                            <MenuItem key={tone} value={tone}>{tone}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="行动号召"
                        value={newCampaign.email_config?.call_to_action || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), call_to_action: e.target.value }
                        })}
                        placeholder="例如：安排一次简短的在线会议、索取产品目录..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="额外提示词（可选）"
                        multiline
                        rows={2}
                        value={newCampaign.email_config?.custom_prompt || ''}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          email_config: { ...(newCampaign.email_config || {}), custom_prompt: e.target.value }
                        })}
                        placeholder="为AI提供额外的邮件生成指导，例如：强调环保理念、突出独家设计..."
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            {/* 自动化配置 */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>自动化设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newCampaign.automation_config?.auto_search || false}
                            onChange={(e) => setNewCampaign({
                              ...newCampaign,
                              automation_config: { ...(newCampaign.automation_config || {}), auto_search: e.target.checked }
                            })}
                          />
                        }
                        label="自动搜索客户"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newCampaign.automation_config?.auto_send || false}
                            onChange={(e) => setNewCampaign({
                              ...newCampaign,
                              automation_config: { ...(newCampaign.automation_config || {}), auto_send: e.target.checked }
                            })}
                          />
                        }
                        label="自动发送邮件"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="每小时发送邮件数"
                        value={newCampaign.automation_config?.emails_per_hour || 10}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          automation_config: { ...(newCampaign.automation_config || {}), emails_per_hour: parseInt(e.target.value) || 10 }
                        })}
                        InputProps={{ inputProps: { min: 1, max: 100 } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="搜索间隔（小时）"
                        value={newCampaign.automation_config?.search_interval_hours || 24}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          automation_config: { ...(newCampaign.automation_config || {}), search_interval_hours: parseInt(e.target.value) || 24 }
                        })}
                        InputProps={{ inputProps: { min: 1 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newCampaign.automation_config?.duplicate_check || false}
                            onChange={(e) => setNewCampaign({
                              ...newCampaign,
                              automation_config: { ...(newCampaign.automation_config || {}), duplicate_check: e.target.checked }
                            })}
                          />
                        }
                        label="检查重复客户"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
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

      {/* 活动详情对话框 */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedCampaign?.name} - 活动详情
            </Typography>
            <Box>
              {!editMode ? (
                <Button onClick={handleEditCampaign} startIcon={<Edit />}>
                  编辑配置
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={handleCloseDetails} variant="outlined">
                    取消
                  </Button>
                  <Button onClick={handleSaveEdit} variant="contained">
                    保存
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCampaign && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* 基本信息 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>基本信息</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="活动名称"
                      value={selectedCampaign.name || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({...selectedCampaign, name: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="状态"
                      value={getStatusLabel(selectedCampaign.status)}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="描述"
                      multiline
                      rows={2}
                      value={selectedCampaign.description || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({...selectedCampaign, description: e.target.value})}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 搜索配置 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>搜索配置</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="搜索关键词"
                      value={Array.isArray(selectedCampaign.search_keywords) 
                        ? selectedCampaign.search_keywords.join(', ') 
                        : selectedCampaign.search_keywords || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({
                        ...selectedCampaign, 
                        search_keywords: e.target.value
                      })}
                      helperText="用逗号分隔多个关键词"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="搜索平台"
                      value={Array.isArray(selectedCampaign.search_platforms) 
                        ? selectedCampaign.search_platforms.join(', ') 
                        : selectedCampaign.search_platforms || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({
                        ...selectedCampaign, 
                        search_platforms: e.target.value
                      })}
                      helperText="用逗号分隔多个平台"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 邮件配置 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>邮件配置</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="产品描述"
                      multiline
                      rows={3}
                      value={selectedCampaign.email_config?.product_description || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({
                        ...selectedCampaign,
                        email_config: { ...(selectedCampaign.email_config || {}), product_description: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="服务描述"
                      multiline
                      rows={3}
                      value={selectedCampaign.email_config?.service_description || ''}
                      disabled={!editMode}
                      onChange={(e) => setSelectedCampaign({
                        ...selectedCampaign,
                        email_config: { ...(selectedCampaign.email_config || {}), service_description: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editMode}>
                      <InputLabel>写作风格</InputLabel>
                      <Select
                        value={selectedCampaign.email_config?.writing_style || 'professional'}
                        onChange={(e) => setSelectedCampaign({
                          ...selectedCampaign,
                          email_config: { ...(selectedCampaign.email_config || {}), writing_style: e.target.value }
                        })}
                      >
                        {writingStyles.map(style => (
                          <MenuItem key={style} value={style}>{style}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editMode}>
                      <InputLabel>语气</InputLabel>
                      <Select
                        value={selectedCampaign.email_config?.tone || 'friendly'}
                        onChange={(e) => setSelectedCampaign({
                          ...selectedCampaign,
                          email_config: { ...(selectedCampaign.email_config || {}), tone: e.target.value }
                        })}
                      >
                        {tones.map(tone => (
                          <MenuItem key={tone} value={tone}>{tone}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>

              {/* 统计信息 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>统计信息</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="primary">
                          {selectedCampaign.total_searched || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          搜索数量
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="warning.main">
                          {selectedCampaign.total_emails_sent || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          发送邮件
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {selectedCampaign.total_replies || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          回复数量
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="info.main">
                          {selectedCampaign.total_replies && selectedCampaign.total_emails_sent 
                            ? `${Math.round((selectedCampaign.total_replies / selectedCampaign.total_emails_sent) * 100)}%`
                            : '0%'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          回复率
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 