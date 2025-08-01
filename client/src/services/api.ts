import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 120000  // 2分钟超时
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 统一错误处理
    const message = error.response?.data?.error?.message || 
                   error.response?.data?.message || 
                   error.message || 
                   '网络请求失败';
    
    // 只在开发环境输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }
    
    // 返回格式化的错误信息
    return Promise.reject(new Error(message));
  }
);

// 活动相关API
export const campaignApi = {
  // 获取所有活动
  getAll: (params = {}) => api.get('/campaigns', { params }),
  
  // 获取单个活动
  getById: (id: string) => api.get(`/campaigns/${id}`),
  
  // 获取支持的搜索平台列表
  getPlatforms: () => api.get('/campaigns/platforms'),
  
  // 创建活动
  create: (data: any) => api.post('/campaigns', data),
  
  // 更新活动
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  
  // 删除活动
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  
  // 启动活动
  start: (id: string) => api.post(`/campaigns/${id}/start`),
  
  // 暂停活动
  pause: (id: string) => api.post(`/campaigns/${id}/pause`),
  
  // 获取活动统计
  getStats: (id: string) => api.get(`/campaigns/${id}/stats`),
};

// 客户相关API
export const customerApi = {
  // 获取所有客户
  getAll: (params = {}) => api.get('/customers', { params }),
  
  // 获取单个客户
  getById: (id: string) => api.get(`/customers/${id}`),
  
  // 创建客户
  create: (data: any) => api.post('/customers', data),
  
  // 更新客户
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  
  // 获取客户统计
  getStats: (campaignId?: string) => api.get('/customers/stats/overview', { 
    params: campaignId ? { campaign_id: campaignId } : {} 
  }),
};

// 邮件相关API
export const emailApi = {
  // 获取所有邮件
  getAll: (params = {}) => api.get('/emails', { params }),
  
  // 发送邮件
  send: (data: any) => api.post('/emails/send', data),
  
  // 生成邮件内容
  generate: (data: any) => api.post('/emails/generate', data),
};

// 搜索相关API
export const searchApi = {
  // 执行搜索
  search: (data: any) => api.post('/search', data),
  
  // 获取搜索结果
  getResults: (params = {}) => api.get('/search/results', { params }),
};

// 设置相关API
export const settingsApi = {
  // 获取所有设置
  getAll: () => api.get('/settings'),
  
  // 更新设置
  update: (key: string, value: any) => api.put(`/settings/${key}`, { value }),
  
  // 批量更新设置
  batch: (settings: any) => api.post('/settings/batch', settings),
  
  // 测试邮箱配置
  testEmail: (config: any) => api.post('/settings/test-email', config),
  
  // 测试AI配置
  testAI: () => api.post('/settings/test-ai'),
};

// 报告相关API
export const reportApi = {
  // 获取报告列表
  getAll: (params = {}) => api.get('/reports', { params }),
  
  // 生成报告
  generate: (type: string, params = {}) => api.post('/reports/generate', { type, ...params }),
};

// 健康检查
export const healthApi = {
  check: () => api.get('/health'),
};

export default api; 