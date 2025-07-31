import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Save,
  Science,
  CheckCircle,
  Error,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { settingsApi } from '../services/api'

export default function Settings() {
  const [settings, setSettings] = useState({
    // OpenAI配置
    openai_api_key: '',
    openai_model: 'gpt-3.5-turbo',
    
    // 邮箱配置
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    from_name: '',
    
    // 发送策略
    daily_limit: '50',
    interval_minutes: '30',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    
    // 反检测设置
    random_delay: true,
    human_simulation: true,
    user_agent_rotation: true,
  })

  const [testResults, setTestResults] = useState<{
    openai: string | null,
    email: string | null,
  }>({
    openai: null,
    email: null,
  })
  
  const [loading, setLoading] = useState({
    openai: false,
    email: false,
    save: false,
    load: true,
  })

  const { enqueueSnackbar } = useSnackbar()

  // 加载设置
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(prev => ({ ...prev, load: true }))
      const response = await settingsApi.getAll()
      if (response && response.success && response.data) {
        setSettings(prev => ({ ...prev, ...response.data }))
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      enqueueSnackbar('加载设置失败', { variant: 'warning' })
    } finally {
      setLoading(prev => ({ ...prev, load: false }))
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(prev => ({ ...prev, save: true }))
      const response = await settingsApi.batch(settings)
      if (response && response.success) {
        enqueueSnackbar('设置保存成功！', { variant: 'success' })
      } else {
        throw new Error((response as any)?.error?.message || '保存失败')
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      enqueueSnackbar(`保存失败: ${error.message}`, { variant: 'error' })
    } finally {
      setLoading(prev => ({ ...prev, save: false }))
    }
  }

  const handleTestOpenAI = async () => {
    if (!settings.openai_api_key.trim()) {
      enqueueSnackbar('请先输入DeepSeek API密钥', { variant: 'warning' })
      return
    }

    try {
      setLoading(prev => ({ ...prev, openai: true }))
      setTestResults(prev => ({ ...prev, openai: null }))
      
      const response = await settingsApi.testAI()
      if (response && response.success) {
        setTestResults(prev => ({ ...prev, openai: 'success' }))
        enqueueSnackbar('DeepSeek API测试成功！', { variant: 'success' })
      } else {
        throw new Error((response as any)?.error?.message || '测试失败')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, openai: 'error' }))
      enqueueSnackbar(`DeepSeek API测试失败: ${error.message}`, { variant: 'error' })
    } finally {
      setLoading(prev => ({ ...prev, openai: false }))
    }
  }

  const handleTestEmail = async () => {
    if (!settings.smtp_user.trim() || !settings.smtp_pass.trim()) {
      enqueueSnackbar('请先填写邮箱配置', { variant: 'warning' })
      return
    }

    try {
      setLoading(prev => ({ ...prev, email: true }))
      setTestResults(prev => ({ ...prev, email: null }))
      
      const emailConfig = {
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port),
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      }
      
      const response = await settingsApi.testEmail(emailConfig)
      if (response && response.success) {
        setTestResults(prev => ({ ...prev, email: 'success' }))
        enqueueSnackbar('邮箱配置测试成功！测试邮件已发送', { variant: 'success' })
      } else {
        throw new Error((response as any)?.error?.message || '测试失败')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, email: 'error' }))
      enqueueSnackbar(`邮箱测试失败: ${error.message}`, { variant: 'error' })
    } finally {
      setLoading(prev => ({ ...prev, email: false }))
    }
  }

  const getTestStatusChip = (status: any) => {
    if (status === 'success') {
      return <Chip icon={<CheckCircle />} label="测试通过" color="success" size="small" />
    } else if (status === 'error') {
      return <Chip icon={<Error />} label="测试失败" color="error" size="small" />
    }
    return null
  }

  if (loading.load) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>加载设置中...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        系统设置
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 配置完成后，请务必测试各项功能确保正常工作。修改设置后需要点击"保存设置"才能生效。
      </Alert>

      <Grid container spacing={3}>
        {/* OpenAI 配置 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  🤖 DeepSeek AI 配置
                </Typography>
                {getTestStatusChip(testResults.openai)}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="API密钥"
                    type="password"
                    value={settings.openai_api_key}
                    onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                    placeholder="sk-..."
                    helperText="从 https://platform.deepseek.com/api_keys 获取"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="模型"
                    value={settings.openai_model}
                    onChange={(e) => handleInputChange('openai_model', e.target.value)}
                    helperText="推荐使用 deepseek-chat"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={loading.openai ? <CircularProgress size={16} /> : <Science />}
                    onClick={handleTestOpenAI}
                    disabled={loading.openai}
                  >
                    测试DeepSeek连接
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 邮箱配置 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  📧 邮箱 SMTP 配置
                </Typography>
                {getTestStatusChip(testResults.email)}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP主机"
                    value={settings.smtp_host}
                    onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="端口"
                    value={settings.smtp_port}
                    onChange={(e) => handleInputChange('smtp_port', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="邮箱地址"
                    type="email"
                    value={settings.smtp_user}
                    onChange={(e) => handleInputChange('smtp_user', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="应用密码"
                    type="password"
                    value={settings.smtp_pass}
                    onChange={(e) => handleInputChange('smtp_pass', e.target.value)}
                    helperText="Gmail需要使用应用密码，不是登录密码"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="发件人姓名"
                    value={settings.from_name}
                    onChange={(e) => handleInputChange('from_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={loading.email ? <CircularProgress size={16} /> : <Science />}
                    onClick={handleTestEmail}
                    disabled={loading.email}
                  >
                    发送测试邮件
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 发送策略 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ 发送策略
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="每日发送限制"
                    type="number"
                    value={settings.daily_limit}
                    onChange={(e) => handleInputChange('daily_limit', e.target.value)}
                    helperText="建议不超过50封/天"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="发送间隔(分钟)"
                    type="number"
                    value={settings.interval_minutes}
                    onChange={(e) => handleInputChange('interval_minutes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="工作开始时间"
                    type="time"
                    value={settings.working_hours_start}
                    onChange={(e) => handleInputChange('working_hours_start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="工作结束时间"
                    type="time"
                    value={settings.working_hours_end}
                    onChange={(e) => handleInputChange('working_hours_end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 反检测设置 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🛡️ 反检测设置
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.random_delay}
                        onChange={(e) => handleInputChange('random_delay', e.target.checked)}
                      />
                    }
                    label="随机延时"
                  />
                  <Typography variant="caption" color="textSecondary" display="block">
                    在操作间添加随机延时
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.human_simulation}
                        onChange={(e) => handleInputChange('human_simulation', e.target.checked)}
                      />
                    }
                    label="人性化操作模拟"
                  />
                  <Typography variant="caption" color="textSecondary" display="block">
                    模拟真实用户行为
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.user_agent_rotation}
                        onChange={(e) => handleInputChange('user_agent_rotation', e.target.checked)}
                      />
                    }
                    label="用户代理轮换"
                  />
                  <Typography variant="caption" color="textSecondary" display="block">
                    轮换浏览器标识
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 保存按钮 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading.save ? <CircularProgress size={16} /> : <Save />}
              onClick={handleSave}
              disabled={loading.save}
            >
              保存设置
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
} 