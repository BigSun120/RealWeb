import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import api from '@/api';

/**
 * Profile页面状态管理 Composable
 * 统一管理用户信息、表单数据、邮箱验证等状态
 */
export function useProfile() {
  const userStore = useUserStore();
  
  // 基础状态
  const loading = ref(false);
  const activeMenu = ref('profile');
  
  // 用户统计信息
  const userStats = ref({
    followersCount: 0,
    followingCount: 0,
    articleCount: 0
  });
  
  // 计算属性
  const user = computed(() => userStore.user);
  const isLoggedIn = computed(() => userStore.isLoggedIn);
  
  // 获取完整的用户信息（包括统计数据）
  const fetchUserProfile = async () => {
    if (!user.value?._id) return;
    
    loading.value = true;
    try {
      const response = await api.get(`/users/${user.value._id}/profile`);
      const userData = response.data.data;
      
      // 更新用户store
      userStore.updateUser(userData);
      
      // 更新统计信息
      userStats.value = {
        followersCount: userData.followersCount || 0,
        followingCount: userData.followingCount || 0,
        articleCount: userData.articleCount || 0
      };
      
      return userData;
    } catch (error) {
      console.error('获取用户资料失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  // 更新用户资料
  const updateUserProfile = async (profileData) => {
    loading.value = true;
    try {
      const result = await userStore.updateProfile(profileData);
      
      if (result.success) {
        // 重新获取最新的用户信息
        await fetchUserProfile();
      }
      
      return result;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  // 处理菜单切换
  const handleMenuSelect = (menuIndex) => {
    activeMenu.value = menuIndex;
  };
  
  // 监听邮箱验证状态变化
  const handleEmailVerificationChange = async (event) => {
    const { verified, email } = event.detail;
    
    if (verified && email === user.value?.email) {
      // 邮箱验证成功，刷新用户信息
      await userStore.fetchUserInfo();
    }
  };
  
  // 初始化
  const initialize = async () => {
    // 添加body类用于全屏背景
    document.body.classList.add('profile-page');
    
    // 获取最新的用户信息
    if (user.value) {
      await fetchUserProfile();
    }
    
    // 监听邮箱验证状态变化
    window.addEventListener('emailVerificationChanged', handleEmailVerificationChange);
  };
  
  // 清理
  const cleanup = () => {
    document.body.classList.remove('profile-page');
    window.removeEventListener('emailVerificationChanged', handleEmailVerificationChange);
  };
  
  // 监听用户登录状态变化
  watch(isLoggedIn, (newValue) => {
    if (newValue && user.value) {
      fetchUserProfile();
    }
  });
  
  return {
    // 状态
    loading,
    activeMenu,
    user,
    userStats,
    isLoggedIn,
    
    // 方法
    fetchUserProfile,
    updateUserProfile,
    handleMenuSelect,
    initialize,
    cleanup
  };
}

/**
 * 邮箱验证相关的 Composable
 */
export function useEmailVerification() {
  const userStore = useUserStore();
  
  // 状态
  const verificationLoading = ref(false);
  const lastVerificationTime = ref(null);
  
  // 计算属性
  const user = computed(() => userStore.user);
  const isEmailVerified = computed(() => user.value?.emailVerified || false);
  const canSendVerification = computed(() => {
    if (verificationLoading.value) return false;
    
    // 限制发送频率（60秒内只能发送一次）
    if (lastVerificationTime.value) {
      const timeDiff = Date.now() - lastVerificationTime.value;
      return timeDiff > 60000; // 60秒
    }
    
    return true;
  });
  
  // 发送验证邮件
  const sendVerificationEmail = async (email) => {
    if (!canSendVerification.value) {
      throw new Error('请稍后再试');
    }
    
    verificationLoading.value = true;
    try {
      await api.post('/auth/resend-verification', { email });
      lastVerificationTime.value = Date.now();
      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      verificationLoading.value = false;
    }
  };
  
  // 验证邮箱令牌
  const verifyEmailToken = async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      
      // 更新用户信息
      if (response.data.data.user) {
        userStore.updateUser(response.data.data.user);
      }
      
      // 触发验证成功事件
      const event = new CustomEvent('emailVerificationChanged', {
        detail: {
          verified: true,
          email: response.data.data.user?.email
        }
      });
      window.dispatchEvent(event);
      
      return { success: true, user: response.data.data.user };
    } catch (error) {
      throw error;
    }
  };
  
  return {
    // 状态
    verificationLoading,
    isEmailVerified,
    canSendVerification,
    
    // 方法
    sendVerificationEmail,
    verifyEmailToken
  };
}

/**
 * 表单数据管理 Composable
 */
export function useProfileForm(initialData = {}) {
  // 表单数据
  const formData = ref({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    ...initialData
  });
  
  // 原始数据（用于比较变化）
  const originalData = ref({});
  
  // 计算属性
  const hasChanges = computed(() => {
    return Object.keys(formData.value).some(key => 
      formData.value[key] !== originalData.value[key]
    );
  });
  
  const isDirty = computed(() => hasChanges.value);
  
  // 初始化表单数据
  const initializeForm = (userData) => {
    if (!userData) return;
    
    const data = {
      displayName: userData.displayName || '',
      username: userData.username || '',
      email: userData.email || '',
      bio: userData.bio || ''
    };
    
    formData.value = { ...data };
    originalData.value = { ...data };
  };
  
  // 重置表单
  const resetForm = () => {
    formData.value = { ...originalData.value };
  };
  
  // 更新原始数据（在保存成功后调用）
  const updateOriginalData = () => {
    originalData.value = { ...formData.value };
  };
  
  // 获取变更的字段
  const getChangedFields = () => {
    const changes = {};
    Object.keys(formData.value).forEach(key => {
      if (formData.value[key] !== originalData.value[key]) {
        changes[key] = formData.value[key];
      }
    });
    return changes;
  };
  
  return {
    // 状态
    formData,
    originalData,
    hasChanges,
    isDirty,
    
    // 方法
    initializeForm,
    resetForm,
    updateOriginalData,
    getChangedFields
  };
}
