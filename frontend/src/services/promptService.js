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
      url: `/tools/prompt-vault/prompts/${id}/usage`,
      method: 'post',
      data
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '记录使用失败');
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
}

export default new PromptService();
