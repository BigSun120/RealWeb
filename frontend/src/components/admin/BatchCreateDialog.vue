<template>
  <el-dialog
    v-model="visible"
    title="批量新增配置"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="batch-create-content">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 路径生成器 -->
        <el-tab-pane label="路径生成器" name="generator">
          <el-form :model="generatorForm" label-width="120px">
            <el-form-item label="基础路径">
              <el-input v-model="generatorForm.basePath" placeholder="/pages/" />
            </el-form-item>
            
            <el-form-item label="路径列表">
              <el-input
                v-model="generatorForm.pathList"
                type="textarea"
                :rows="6"
                placeholder="每行一个路径，例如：&#10;home&#10;about&#10;contact&#10;products/list&#10;products/detail"
              />
              <div class="form-tip">每行输入一个路径片段，将与基础路径组合</div>
            </el-form-item>
            
            <el-form-item label="匹配类型">
              <el-select v-model="generatorForm.matchType">
                <el-option label="精确匹配" value="exact" />
                <el-option label="前缀匹配" value="prefix" />
                <el-option label="通配符匹配" value="wildcard" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="优先级">
              <el-input-number v-model="generatorForm.priority" :min="1" :max="1000" />
            </el-form-item>
          </el-form>
          
          <div class="preview-section">
            <h4>预览生成的路径 ({{ generatedPaths.length }} 个)</h4>
            <div class="path-preview">
              <el-tag
                v-for="path in generatedPaths.slice(0, 10)"
                :key="path"
                class="path-tag"
              >
                {{ path }}
              </el-tag>
              <span v-if="generatedPaths.length > 10" class="more-indicator">
                ... 还有 {{ generatedPaths.length - 10 }} 个
              </span>
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 模板复制 -->
        <el-tab-pane label="模板复制" name="template">
          <el-form :model="templateForm" label-width="120px">
            <el-form-item label="选择模板">
              <el-select v-model="templateForm.templateId" placeholder="选择要复制的配置">
                <el-option
                  v-for="config in availableTemplates"
                  :key="config._id"
                  :label="`${config.pathConfig.path} (${config.pathConfig.description || '无描述'})`"
                  :value="config._id"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="新路径列表">
              <el-input
                v-model="templateForm.newPaths"
                type="textarea"
                :rows="6"
                placeholder="每行一个新路径，例如：&#10;/new-page1&#10;/new-page2&#10;/category/page1"
              />
            </el-form-item>
            
            <el-form-item label="优先级调整">
              <el-radio-group v-model="templateForm.priorityAction">
                <el-radio label="keep">保持原优先级</el-radio>
                <el-radio label="set">设置为</el-radio>
                <el-radio label="increase">原优先级+</el-radio>
              </el-radio-group>
              <el-input-number
                v-if="templateForm.priorityAction !== 'keep'"
                v-model="templateForm.priorityValue"
                :min="1"
                :max="1000"
                style="margin-left: 12px"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- 手动输入 -->
        <el-tab-pane label="手动输入" name="manual">
          <div class="manual-input-section">
            <div class="section-header">
              <h4>配置列表</h4>
              <el-button size="small" @click="addManualConfig">
                <el-icon><Plus /></el-icon>
                添加配置
              </el-button>
            </div>
            
            <div class="manual-configs">
              <el-card
                v-for="(config, index) in manualConfigs"
                :key="index"
                class="config-card"
                shadow="never"
              >
                <template #header>
                  <div class="card-header">
                    <span>配置 {{ index + 1 }}</span>
                    <el-button
                      size="small"
                      type="danger"
                      text
                      @click="removeManualConfig(index)"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
                
                <el-form :model="config" label-width="100px" size="small">
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <el-form-item label="路径">
                        <el-input v-model="config.path" placeholder="/example" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="匹配类型">
                        <el-select v-model="config.matchType">
                          <el-option label="精确" value="exact" />
                          <el-option label="前缀" value="prefix" />
                          <el-option label="通配符" value="wildcard" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <el-form-item label="优先级">
                        <el-input-number v-model="config.priority" :min="1" :max="1000" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="状态">
                        <el-switch v-model="config.isActive" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  
                  <el-form-item label="描述">
                    <el-input v-model="config.description" placeholder="配置描述" />
                  </el-form-item>
                </el-form>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          批量创建
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { batchCreateBackgroundConfigs } from '@/api/backgrounds';

const props = defineProps({
  modelValue: Boolean,
  availableTemplates: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const submitting = ref(false);
const activeTab = ref('generator');

// 路径生成器
const generatorForm = ref({
  basePath: '/pages/',
  pathList: '',
  matchType: 'exact',
  priority: 100
});

const generatedPaths = computed(() => {
  if (!generatorForm.value.pathList.trim()) return [];
  
  const paths = generatorForm.value.pathList
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      const basePath = generatorForm.value.basePath.replace(/\/$/, '');
      const path = line.startsWith('/') ? line : `/${line}`;
      return basePath + path;
    });
  
  return paths;
});

// 模板复制
const templateForm = ref({
  templateId: '',
  newPaths: '',
  priorityAction: 'keep',
  priorityValue: 100
});

// 手动输入
const manualConfigs = ref([]);

const addManualConfig = () => {
  manualConfigs.value.push({
    path: '',
    matchType: 'exact',
    priority: 100,
    isActive: true,
    description: ''
  });
};

const removeManualConfig = (index) => {
  manualConfigs.value.splice(index, 1);
};

const handleClose = () => {
  visible.value = false;
  resetForm();
};

const resetForm = () => {
  activeTab.value = 'generator';
  generatorForm.value = {
    basePath: '/pages/',
    pathList: '',
    matchType: 'exact',
    priority: 100
  };
  templateForm.value = {
    templateId: '',
    newPaths: '',
    priorityAction: 'keep',
    priorityValue: 100
  };
  manualConfigs.value = [];
};

const handleSubmit = async () => {
  let configsToCreate = [];

  switch (activeTab.value) {
    case 'generator':
      if (generatedPaths.value.length === 0) {
        ElMessage.warning('请输入要生成的路径');
        return;
      }
      configsToCreate = generatedPaths.value.map(path => ({
        pathConfig: {
          path,
          matchType: generatorForm.value.matchType,
          priority: generatorForm.value.priority,
          description: `自动生成的配置 - ${path}`
        },
        backgroundImage: {
          url: '', // 需要用户后续上传图片
          filename: '',
          size: 0,
          dimensions: { width: 0, height: 0 },
          format: ''
        },
        displaySettings: {
          opacity: 1.0,
          blur: 0,
          brightness: 1.0,
          contrast: 1.0,
          saturation: 1.0
        },
        layoutSettings: {
          zIndex: -1,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll'
        },
        responsiveSettings: {
          enableOnMobile: true,
          enableOnTablet: true,
          enableOnDesktop: true,
          mobileBreakpoint: 768,
          tabletBreakpoint: 1024
        },
        isActive: true,
        notes: '批量生成的配置'
      }));
      break;

    case 'template':
      if (!templateForm.value.templateId || !templateForm.value.newPaths.trim()) {
        ElMessage.warning('请选择模板并输入新路径');
        return;
      }
      // TODO: 实现模板复制逻辑
      ElMessage.info('模板复制功能开发中...');
      return;

    case 'manual':
      if (manualConfigs.value.length === 0) {
        ElMessage.warning('请至少添加一个配置');
        return;
      }
      configsToCreate = manualConfigs.value
        .filter(config => config.path.trim())
        .map(config => ({
          pathConfig: {
            path: config.path,
            matchType: config.matchType,
            priority: config.priority,
            description: config.description || `手动创建的配置 - ${config.path}`
          },
          backgroundImage: {
            url: '', // 需要用户后续上传图片
            filename: '',
            size: 0,
            dimensions: { width: 0, height: 0 },
            format: ''
          },
          displaySettings: {
            opacity: 1.0,
            blur: 0,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0
          },
          layoutSettings: {
            zIndex: -1,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll'
          },
          responsiveSettings: {
            enableOnMobile: true,
            enableOnTablet: true,
            enableOnDesktop: true,
            mobileBreakpoint: 768,
            tabletBreakpoint: 1024
          },
          isActive: config.isActive,
          notes: config.description || '手动创建的配置'
        }));
      break;
  }

  if (configsToCreate.length === 0) {
    ElMessage.warning('没有可创建的配置');
    return;
  }

  submitting.value = true;
  try {
    const response = await batchCreateBackgroundConfigs(configsToCreate);

    const result = response.data.data;

    if (response.data.success) {
      if (result.failed > 0) {
        // 部分成功
        ElMessage.warning(
          `批量创建部分成功！成功: ${result.created}，失败: ${result.failed}`
        );
      } else {
        // 完全成功
        ElMessage.success(`已成功创建 ${result.created} 个配置`);
      }
      emit('success');
    } else {
      ElMessage.error(response.data.message || '批量创建失败');

      // 如果有错误详情，显示在消息中
      if (result.errors && result.errors.length > 0 && result.errors.length <= 3) {
        ElMessage.error(`创建失败！${result.errors.join('; ')}`);
      }
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '批量创建失败');
  } finally {
    submitting.value = false;
  }
};

// 初始化时添加一个手动配置
watch(visible, (newVal) => {
  if (newVal && manualConfigs.value.length === 0) {
    addManualConfig();
  }
});
</script>

<style scoped>
.batch-create-content {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.path-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.path-tag {
  margin: 0;
}

.more-indicator {
  color: #909399;
  font-size: 12px;
  align-self: center;
}

.manual-input-section {
  padding: 16px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.manual-configs {
  max-height: 400px;
  overflow-y: auto;
}

.config-card {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
