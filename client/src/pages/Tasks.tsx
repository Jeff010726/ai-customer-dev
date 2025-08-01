import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Checkbox,
  Toolbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Replay as RetryIcon, // 使用Replay图标代替
  Delete as DeleteIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Stop as StopIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import api from '../services/api';

interface Task {
  id: string;
  type: 'email_send' | 'customer_search' | 'email_generate';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  campaign_id: string;
  customer_id?: string;
  email_id?: string;
  task_data: any;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  result: any;
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    company: string;
  };
  email?: {
    id: string;
    subject: string;
    status: string;
  };
  created_at: string;
}

interface TaskStats {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  total: number;
}

const Tasks: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ byStatus: {}, byType: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 选择和操作
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // 对话框控制
  const [batchActionDialog, setBatchActionDialog] = useState<string | null>(null);
  const [taskDetailDialog, setTaskDetailDialog] = useState<Task | null>(null);

  const tabLabels = ['全部', '待处理', '进行中', '已完成', '失败', '已取消'];
  const statusMap = ['', 'pending', 'processing', 'completed', 'failed', 'cancelled'];

  // 状态颜色和图标映射
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ScheduleIcon fontSize="small" />;
      case 'processing': return <CircularProgress size={16} />;
      case 'completed': return <CheckCircleIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email_send': return '邮件发送';
      case 'customer_search': return '客户搜索';
      case 'email_generate': return '邮件生成';
      default: return type;
    }
  };

  // 数据加载
  const loadTasks = async () => {
    try {
      setLoading(true);
      const status = statusMap[currentTab];
      const params: any = {
        page,
        limit: 20,
      };
      if (status) params.status = status;
      
      console.log('🔍 加载任务 - 参数:', params);
      const response = await api.get('/tasks', { params });
      console.log('🔍 API响应:', response);
      console.log('🔍 任务数组:', response.tasks);
      console.log('🔍 任务数量:', response.tasks?.length);
      
      setTasks(response.tasks || []);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error('❌ 加载任务失败:', err);
      setError(err.response?.data?.error?.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/tasks/stats');
      setStats(response.data || { byStatus: {}, byType: {}, total: 0 });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  // 任务操作
  const updateTaskStatus = async (taskId: string, status: string, errorMessage?: string) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status, error_message: errorMessage });
      loadTasks();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '更新任务状态失败');
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/retry`);
      loadTasks();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '重试任务失败');
    }
  };

  const batchOperation = async (action: string, taskIds: string[]) => {
    try {
      await api.post(`/tasks/batch/${action}`, { task_ids: taskIds });
      setSelectedTasks([]);
      setBatchActionDialog(null);
      loadTasks();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '批量操作失败');
    }
  };

  // 处理邮件生成和发送
  const generateAndSendEmail = async (taskId: string) => {
    try {
      // 先生成邮件
      const generateResponse = await api.post(`/tasks/${taskId}/generate-email`);
      if (generateResponse.data.success) {
        // 然后发送邮件
        const sendResponse = await api.post(`/tasks/${taskId}/send-email`);
        if (sendResponse.data.success) {
          setError(null);
          loadTasks();
          loadStats();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '生成或发送邮件失败');
    }
  };

  // 事件处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTask(null);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [currentTab, page]);

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      loadTasks();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentTab, page]);

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          任务管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedTasks.length > 0 && (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setBatchActionDialog('cancel')}
              >
                批量取消 ({selectedTasks.length})
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<PlayIcon />}
                onClick={() => setBatchActionDialog('retry')}
              >
                批量重试 ({selectedTasks.length})
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<UndoIcon />}
                onClick={() => setBatchActionDialog('reset')}
              >
                打回待处理 ({selectedTasks.length})
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadTasks();
              loadStats();
            }}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stats.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总任务数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {stats.byStatus?.pending || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                待处理
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="info.main">
                {stats.byStatus?.processing || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                进行中
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {stats.byStatus?.completed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已完成
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error.main">
                {stats.byStatus?.failed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                失败
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {stats.byStatus?.cancelled || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已取消
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 主要内容区域 */}
      <Card>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            setCurrentTab(newValue);
            setPage(1);
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabLabels.map((label, index) => (
            <Tab
              key={index}
              label={`${label}${stats.byStatus && statusMap[index] ? ` (${stats.byStatus[statusMap[index]] || 0})` : ''}`}
              sx={{ minWidth: 'auto', px: 2 }}
            />
          ))}
        </Tabs>

        {loading && <LinearProgress />}

        <CardContent sx={{ p: 0 }}>
          {tasks.length > 0 && (
            <Toolbar sx={{ minHeight: '48px !important', px: 2 }}>
              <Checkbox
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
                indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <Typography variant="subtitle2" sx={{ flex: 1, ml: 1 }}>
                {selectedTasks.length > 0 ? `已选择 ${selectedTasks.length} 个任务` : `共 ${tasks.length} 个任务`}
              </Typography>
            </Toolbar>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedTasks.length === tasks.length && tasks.length > 0}
                      indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>任务类型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>活动</TableCell>
                  <TableCell>客户</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>执行时间</TableCell>
                  <TableCell>重试次数</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} hover selected={selectedTasks.includes(task.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        {getTypeLabel(task.type)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(task.status)}
                        label={task.status}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {task.campaign?.name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {task.customer ? (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {task.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.customer.email}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{task.priority}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTime(task.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTime(task.completed_at || task.started_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={task.retry_count >= task.max_retries ? 'error' : 'inherit'}>
                        {task.retry_count}/{task.max_retries}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="更多操作">
                        <IconButton
                          onClick={(e) => handleMenuClick(e, task)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {tasks.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EmailIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无任务数据
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentTab === 0 ? '还没有创建任何任务' : `没有${tabLabels[currentTab]}的任务`}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTask?.status === 'pending' && selectedTask?.type === 'email_send' && (
          <MenuItem
            onClick={async () => {
              if (selectedTask) {
                await generateAndSendEmail(selectedTask.id);
              }
              handleMenuClose();
            }}
          >
            <SendIcon fontSize="small" sx={{ mr: 1 }} />
            生成并发送邮件
          </MenuItem>
        )}
        
        {selectedTask?.status === 'pending' && (
          <MenuItem
            onClick={() => {
              if (selectedTask) {
                updateTaskStatus(selectedTask.id, 'processing');
              }
              handleMenuClose();
            }}
          >
            <PlayIcon fontSize="small" sx={{ mr: 1 }} />
            开始执行
          </MenuItem>
        )}
        
        {selectedTask?.status === 'processing' && (
          <MenuItem
            onClick={() => {
              if (selectedTask) {
                updateTaskStatus(selectedTask.id, 'cancelled');
              }
              handleMenuClose();
            }}
          >
            <StopIcon fontSize="small" sx={{ mr: 1 }} />
            停止执行
          </MenuItem>
        )}
        
        {selectedTask?.status === 'failed' && (
          <MenuItem
            onClick={() => {
              if (selectedTask) {
                retryTask(selectedTask.id);
              }
              handleMenuClose();
            }}
          >
            <RetryIcon fontSize="small" sx={{ mr: 1 }} />
            重试任务
          </MenuItem>
        )}
        
        {selectedTask?.status !== 'pending' && (
          <MenuItem
            onClick={() => {
              if (selectedTask) {
                updateTaskStatus(selectedTask.id, 'pending');
              }
              handleMenuClose();
            }}
          >
            <UndoIcon fontSize="small" sx={{ mr: 1 }} />
            打回待处理
          </MenuItem>
        )}
        
        <MenuItem
          onClick={() => {
            setTaskDetailDialog(selectedTask);
            handleMenuClose();
          }}
        >
          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
          查看详情
        </MenuItem>
      </Menu>

      {/* 批量操作确认对话框 */}
      <Dialog open={Boolean(batchActionDialog)} onClose={() => setBatchActionDialog(null)}>
        <DialogTitle>
          确认批量操作
        </DialogTitle>
        <DialogContent>
          <Typography>
            确定要{
              batchActionDialog === 'cancel' ? '取消' : 
              batchActionDialog === 'retry' ? '重试' : 
              batchActionDialog === 'reset' ? '打回待处理' : ''
            }选中的 {selectedTasks.length} 个任务吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchActionDialog(null)}>
            取消
          </Button>
          <Button
            onClick={() => batchOperation(batchActionDialog!, selectedTasks)}
            color={
              batchActionDialog === 'cancel' ? 'error' : 
              batchActionDialog === 'retry' ? 'success' : 
              batchActionDialog === 'reset' ? 'warning' : 'primary'
            }
            variant="contained"
          >
            确认{
              batchActionDialog === 'cancel' ? '取消' : 
              batchActionDialog === 'retry' ? '重试' : 
              batchActionDialog === 'reset' ? '打回待处理' : ''
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* 任务详情对话框 */}
      <Dialog 
        open={Boolean(taskDetailDialog)} 
        onClose={() => setTaskDetailDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          任务详情
        </DialogTitle>
        <DialogContent>
          {taskDetailDialog && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>任务ID</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.id}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>任务类型</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{getTypeLabel(taskDetailDialog.type)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>状态</Typography>
                <Chip
                  icon={getStatusIcon(taskDetailDialog.status)}
                  label={taskDetailDialog.status}
                  color={getStatusColor(taskDetailDialog.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>优先级</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.priority}</Typography>
              </Grid>
              {taskDetailDialog.customer && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>客户姓名</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.customer.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>客户邮箱</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.customer.email}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>客户公司</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.customer.company}</Typography>
                  </Grid>
                </>
              )}
              {taskDetailDialog.email && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>邮件主题</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{taskDetailDialog.email.subject}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>邮件内容</Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        maxHeight: 300, 
                        overflow: 'auto',
                        backgroundColor: 'grey.50',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      <Typography variant="body2">
                        {taskDetailDialog.email.content || '邮件内容生成中...'}
                      </Typography>
                    </Paper>
                  </Grid>
                </>
              )}
              {taskDetailDialog.error_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom color="error">错误信息</Typography>
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {taskDetailDialog.error_message}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDetailDialog(null)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;