<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑用户' : '添加用户'"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      @submit.prevent
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          :disabled="isEdit"
        />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="formData.email"
          placeholder="请输入邮箱"
          type="email"
        />
      </el-form-item>

      <el-form-item v-if="!isEdit" label="密码" prop="password">
        <el-input
          v-model="formData.password"
          placeholder="请输入密码"
          type="password"
          show-password
        />
      </el-form-item>

      <el-form-item label="个人简介" prop="bio">
        <el-input
          v-model="formData.bio"
          placeholder="请输入个人简介"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="用户角色" prop="role">
        <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
          <el-option
            v-for="role in roleOptions"
            :key="role.value"
            :label="role.label"
            :value="role.value"
          >
            <div>
              <span>{{ role.label }}</span>
              <div style="font-size: 12px; color: #999; margin-top: 2px;">
                {{ role.description }}
              </div>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="用户状态" prop="isActive">
        <el-radio-group v-model="formData.isActive">
          <el-radio :label="true">正常</el-radio>
          <el-radio :label="false">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { createUser, updateUser } from '@/api/admin';

export default {
  name: 'UserEditDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    userData: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'success'],
  setup(props, { emit }) {
    const visible = ref(false);
    const loading = ref(false);
    const formRef = ref();
    const isEdit = ref(false);

    // 角色选项
    const roleOptions = [
      {
        value: 'user',
        label: '普通用户',
        description: '基础权限：评论、编辑个人资料'
      },
      {
        value: 'blogger',
        label: '博主',
        description: '可以创建、编辑、发布博客'
      },
      {
        value: 'moderator',
        label: '版主',
        description: '可以管理评论和博客内容'
      },
      {
        value: 'admin',
        label: '管理员',
        description: '拥有所有权限'
      }
    ];

    // 表单数据
    const formData = reactive({
      username: '',
      email: '',
      password: '',
      bio: '',
      role: 'user',
      isActive: true
    });

    // 表单验证规则
    const formRules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
      ],
      email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
      ],
      bio: [
        { max: 200, message: '个人简介不能超过200个字符', trigger: 'blur' }
      ],
      role: [
        { required: true, message: '请选择用户角色', trigger: 'change' }
      ]
    };

    // 监听显示状态
    watch(() => props.modelValue, (newVal) => {
      visible.value = newVal;
      if (newVal) {
        initForm();
      }
    });

    // 监听visible变化
    watch(visible, (newVal) => {
      emit('update:modelValue', newVal);
    });

    // 初始化表单
    const initForm = () => {
      isEdit.value = !!props.userData;

      if (props.userData) {
        // 编辑模式
        Object.assign(formData, {
          username: props.userData.username || '',
          email: props.userData.email || '',
          bio: props.userData.bio || '',
          role: props.userData.role || (props.userData.isAdmin ? 'admin' : 'user'),
          isActive: props.userData.isActive !== false
        });
      } else {
        // 新增模式
        Object.assign(formData, {
          username: '',
          email: '',
          password: '',
          bio: '',
          role: 'user',
          isActive: true
        });
      }

      // 清除验证
      nextTick(() => {
        if (formRef.value) {
          formRef.value.clearValidate();
        }
      });
    };

    // 提交表单
    const handleSubmit = async () => {
      try {
        // 表单验证
        await formRef.value.validate();

        loading.value = true;

        // 准备提交数据
        const submitData = { ...formData };
        if (isEdit.value) {
          delete submitData.password; // 编辑时不提交密码
        }

        // 调用API
        if (isEdit.value) {
          // 调用更新用户API
          await updateUser(props.userData._id, submitData);
          ElMessage.success('用户更新成功');
        } else {
          // 调用创建用户API
          await createUser(submitData);
          ElMessage.success('用户创建成功');
        }

        emit('success');
        handleClose();

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '操作失败');
        } else if (error !== false) { // 表单验证失败时error为false
          ElMessage.error('操作失败');
        }
      } finally {
        loading.value = false;
      }
    };

    // 关闭对话框
    const handleClose = () => {
      visible.value = false;
      // 重置表单
      Object.assign(formData, {
        username: '',
        email: '',
        password: '',
        bio: '',
        isAdmin: false,
        isActive: true
      });
    };

    return {
      visible,
      loading,
      formRef,
      isEdit,
      formData,
      formRules,
      roleOptions,
      handleSubmit,
      handleClose
    };
  }
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-textarea__inner) {
  resize: vertical;
}
</style>
