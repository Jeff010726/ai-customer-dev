import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Email,
  Visibility,
  Edit,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSnackbar } from 'notistack'
import { customerApi, emailApi } from '../services/api'

export default function Customers() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState<any>(null)

  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  // 获取客户列表
  const { data: customersData, isLoading, error } = useQuery(
    'customers',
    () => customerApi.getAll(),
    {
      refetchOnWindowFocus: false,
    }
  )

  // 获取客户统计
  const { data: customerStats } = useQuery(
    'customer-stats',
    () => customerApi.getStats(),
    {
      refetchOnWindowFocus: false,
    }
  )

  // 生成邮件的mutation
  const generateEmailMutation = useMutation(emailApi.generate, {
    onSuccess: (data) => {
      setGeneratedEmail(data.data)
      setEmailDialogOpen(true)
      enqueueSnackbar('AI邮件内容生成成功！', { variant: 'success' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`生成邮件失败: ${error.message}`, { variant: 'error' })
    },
  })

  // 发送邮件的mutation
  const sendEmailMutation = useMutation(emailApi.send, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers')
      setEmailDialogOpen(false)
      setGeneratedEmail(null)
      enqueueSnackbar('邮件发送成功！', { variant: 'success' })
    },
    onError: (error: any) => {
      enqueueSnackbar(`发送邮件失败: ${error.message}`, { variant: 'error' })
    },
  })

  const handleGenerateEmail = (customer: any) => {
    setSelectedCustomer(customer)
    generateEmailMutation.mutate({
      customerId: customer.id,
      campaignId: customer.campaign_id
    })
  }

  const handleSendEmail = () => {
    if (generatedEmail?.email?.id) {
      sendEmailMutation.mutate({
        emailId: generatedEmail.email.id
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'info'
      case 'contacted': return 'warning'
      case 'replied': return 'success'
      case 'interested': return 'success'
      case 'not_interested': return 'error'
      case 'blacklisted': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return '新客户'
      case 'contacted': return '已联系'
      case 'replied': return '已回复'
      case 'interested': return '有兴趣'
      case 'not_interested': return '无兴趣'
      case 'blacklisted': return '黑名单'
      default: return status
    }
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          客户管理
        </Typography>
        <Alert severity="error">
          加载客户数据失败，请检查网络连接和后端服务
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        客户管理
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 提示: 在这里你可以查看搜索到的客户信息，生成AI个性化邮件并发送。
      </Alert>

      {/* 客户统计 */}
      {customerStats?.data && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {Object.entries(customerStats.data).map(([status, count]: [string, any]) => (
            <Grid item xs={12} sm={6} md={3} key={status}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {count}
                  </Typography>
                  <Chip
                    label={getStatusLabel(status)}
                    color={getStatusColor(status)}
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 客户列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            客户列表
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !customersData?.data || customersData.data.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="textSecondary">
                还没有客户数据
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                创建并启动活动后，系统会自动搜索并添加客户信息
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>客户名称</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>公司</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>来源平台</TableCell>
                    <TableCell>联系次数</TableCell>
                    <TableCell>最后联系时间</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customersData.data.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name || '未知'}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.company || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(customer.status)}
                          color={getStatusColor(customer.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{customer.source_platform || '-'}</TableCell>
                      <TableCell>{customer.contact_count || 0}</TableCell>
                      <TableCell>
                        {customer.last_contacted_at
                          ? new Date(customer.last_contacted_at).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Email />}
                          onClick={() => handleGenerateEmail(customer)}
                          disabled={generateEmailMutation.isLoading}
                        >
                          生成邮件
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 邮件预览和发送对话框 */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          AI生成的邮件内容 - {selectedCustomer?.name || selectedCustomer?.company}
        </DialogTitle>
        <DialogContent>
          {generatedEmail && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="收件人"
                  value={`${selectedCustomer?.name || ''} <${selectedCustomer?.email}>`}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="邮件主题"
                  value={generatedEmail.generatedContent?.subject || generatedEmail.email?.subject}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="邮件内容"
                  multiline
                  rows={12}
                  value={generatedEmail.generatedContent?.content || generatedEmail.email?.content}
                  disabled
                />
              </Grid>
              {generatedEmail.usage && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    AI使用情况: {generatedEmail.usage.total_tokens} tokens
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            disabled={sendEmailMutation.isLoading}
            startIcon={sendEmailMutation.isLoading ? <CircularProgress size={16} /> : <Email />}
          >
            发送邮件
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 