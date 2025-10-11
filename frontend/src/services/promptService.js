import request from '@/utils/request';

class PromptService {
  async getPrompts(params = {}) {
    const response = await request({
      url: '/tools/prompt-vault/prompts',
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取提示词列表失败');
  }

  async getPromptById(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取提示词详情失败');
  }

  // 获取版本历史（仅作者可访问）
  async getVersionHistory(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/versions`,
      method: 'get'
    });
    if (response.code === 200) {
      // 返回完整响应以便调用方读取 code 和 data
      return response;
    }
    throw new Error(response.message || '获取版本历史失败');
  }

  // 恢复到指定版本（仅作者）
  async restoreVersion(id, versionId) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/versions/${versionId}/restore`,
      method: 'post'
    });
    if (response.code === 200) {
      // 返回完整响应以便调用方读取 code 和 data
      return response;
    }
    throw new Error(response.message || '恢复版本失败');
  }

  async createPrompt(data) {
    const response = await request({
      url: '/tools/prompt-vault/prompts',
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '创建提示词失败');
  }

  async updatePrompt(id, data) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'put',
      data
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新提示词失败');
  }

  async deletePrompt(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'delete'
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '删除提示词失败');
  }

  async recordUsage(id, data) {
    const response = await request({
      url: `/prompts/${id}/usage`,
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '记录使用失败');
  }

  async getUsageLogs(id, params = {}) {
    const response = await request({
      url: `/prompts/${id}/usage`,
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取使用记录失败');
  }

  async updateFeedback(logId, feedback) {
    const response = await request({
      url: `/prompts/usage/${logId}/feedback`,
      method: 'patch',
      data: feedback
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新反馈失败');
  }

  async getStatistics(id, params = {}) {
    const response = await request({
      url: `/prompts/${id}/usage/statistics`,
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取统计数据失败');
  }

  async getFolderTree() {
    const response = await request({
      url: '/tools/prompt-vault/folders/tree',
      method: 'get'
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取文件夹树失败');
  }

  async createFolder(data) {
    const response = await request({
      url: '/tools/prompt-vault/folders',
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '创建文件夹失败');
  }

  async updateFolder(id, data) {
    const response = await request({
      url: `/tools/prompt-vault/folders/${id}`,
      method: 'put',
      data
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新文件夹失败');
  }

  parseVariables(content) {
    if (!content) return [];
    const variableRegex = /\{\{(\w+)(?::([^}]*))?\}\}/g;
    const variables = [];
    const seen = new Set();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const varName = match[1];
      const varOptions = match[2];

      if (!seen.has(varName)) {
        seen.add(varName);
        const variable = {
          name: varName,
          type: 'text',
          required: true,
          options: []
        };

        if (varOptions) {
          const parts = varOptions.split(':');
          parts.forEach(part => {
            if (part.includes('|')) {
              variable.type = 'select';
              variable.options = part.split('|').map(o => o.trim());
            } else if (part.startsWith('default=')) {
              variable.default = part.substring(8);
              variable.required = false;
            } else if (part === 'textarea') {
              variable.type = 'textarea';
            } else if (part === 'number') {
              variable.type = 'number';
            } else if (part === 'date') {
              variable.type = 'date';
            }
          });
        }
        variables.push(variable);
      }
    }
    return variables;
  }

  renderPrompt(content, values = {}) {
    if (!content) return '';
    let rendered = content;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}(?::[^}]*)?\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    });
    return rendered;
  }

  // 高级模板引擎 API
  async renderTemplate(template, variables) {
    const response = await request({
      url: '/api/template/render',
      method: 'post',
      data: { template, variables }
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '渲染模板失败');
  }

  async extractVariables(template) {
    const response = await request({
      url: '/api/template/extract-variables',
      method: 'post',
      data: { template }
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '提取变量失败');
  }

  async getHelpers() {
    const response = await request({
      url: '/api/template/helpers',
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取辅助函数列表失败');
  }
}

export default new PromptService();
