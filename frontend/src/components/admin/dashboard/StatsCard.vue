<template>
  <el-card class="stats-card" :class="cardClass" shadow="hover">
    <div class="stats-content">
      <div class="stats-icon">
        <el-icon :size="32" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>

      <div class="stats-info">
        <div class="stats-title">{{ title }}</div>
        <div class="stats-value">
          <span class="value">{{ formattedValue }}</span>
          <span v-if="unit" class="unit">{{ unit }}</span>
        </div>

        <div v-if="showTrend" class="stats-trend">
          <el-icon :color="trendColor" :size="14">
            <component :is="trendIcon" />
          </el-icon>
          <span :style="{ color: trendColor }" class="trend-text">
            {{ trendText }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="description" class="stats-description">
      {{ description }}
    </div>
  </el-card>
</template>

<script>
import { computed } from 'vue';
import {
  User,
  Document,
  View,
  Monitor,
  TrendCharts,
  ArrowUp,
  ArrowDown,
  Minus
} from '@element-plus/icons-vue';

export default {
  name: 'StatsCard',
  components: {
    User,
    Document,
    View,
    Monitor,
    TrendCharts,
    ArrowUp,
    ArrowDown,
    Minus
  },
  props: {
    // 卡片标题
    title: {
      type: String,
      required: true
    },
    // 数值
    value: {
      type: [Number, String],
      required: true
    },
    // 单位
    unit: {
      type: String,
      default: ''
    },
    // 图标
    icon: {
      type: String,
      default: 'TrendCharts'
    },
    // 卡片类型（影响颜色主题）
    type: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'success', 'warning', 'danger', 'info'].includes(value)
    },
    // 趋势数据
    trend: {
      type: Object,
      default: () => null
    },
    // 描述文本
    description: {
      type: String,
      default: ''
    },
    // 是否显示趋势
    showTrend: {
      type: Boolean,
      default: true
    },
    // 是否加载中
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    // 格式化数值
    const formattedValue = computed(() => {
      if (props.loading) return '--';

      const value = Number(props.value);
      if (isNaN(value)) return props.value;

      // 大数值格式化
      if (value >= 10000) {
        return (value / 10000).toFixed(1) + 'w';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'k';
      }

      return value.toLocaleString();
    });

    // 卡片样式类
    const cardClass = computed(() => {
      return `stats-card--${props.type}`;
    });

    // 图标颜色
    const iconColor = computed(() => {
      const colors = {
        primary: '#409eff',
        success: '#67c23a',
        warning: '#e6a23c',
        danger: '#f56c6c',
        info: '#909399'
      };
      return colors[props.type] || colors.primary;
    });

    // 趋势图标
    const trendIcon = computed(() => {
      if (!props.trend) return 'Minus';

      // 支持新的数据格式
      const isPositive = props.trend.isPositive !== undefined
        ? props.trend.isPositive
        : props.trend.type === 'up';

      if (isPositive) {
        return 'ArrowUp';
      } else {
        return 'ArrowDown';
      }
    });

    // 趋势颜色
    const trendColor = computed(() => {
      if (!props.trend) return '#909399';

      // 支持新的数据格式
      const isPositive = props.trend.isPositive !== undefined
        ? props.trend.isPositive
        : props.trend.type === 'up';

      return isPositive ? '#67c23a' : '#f56c6c';
    });

    // 趋势文本
    const trendText = computed(() => {
      if (!props.trend) return '无变化';

      const { value, period } = props.trend;
      // 支持新的数据格式
      const isPositive = props.trend.isPositive !== undefined
        ? props.trend.isPositive
        : props.trend.type === 'up';
      const prefix = isPositive ? '+' : '';
      return `${prefix}${value}% ${period || ''}`;
    });

    return {
      formattedValue,
      cardClass,
      iconColor,
      trendIcon,
      trendColor,
      trendText
    };
  }
};
</script>

<style scoped>
.stats-card {
  border-radius: 8px;
  transition: all 0.3s;
  cursor: pointer;
}

.stats-card:hover {
  transform: translateY(-2px);
}

.stats-card--primary {
  border-left: 4px solid #409eff;
}

.stats-card--success {
  border-left: 4px solid #67c23a;
}

.stats-card--warning {
  border-left: 4px solid #e6a23c;
}

.stats-card--danger {
  border-left: 4px solid #f56c6c;
}

.stats-card--info {
  border-left: 4px solid #909399;
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 50%;
}

.stats-card--success .stats-icon {
  background: rgba(103, 194, 58, 0.1);
}

.stats-card--warning .stats-icon {
  background: rgba(230, 162, 60, 0.1);
}

.stats-card--danger .stats-icon {
  background: rgba(245, 108, 108, 0.1);
}

.stats-card--info .stats-icon {
  background: rgba(144, 147, 153, 0.1);
}

.stats-info {
  flex: 1;
}

.stats-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stats-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.unit {
  font-size: 14px;
  color: #909399;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-text {
  font-size: 12px;
}

.stats-description {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .stats-content {
    gap: 12px;
  }

  .stats-icon {
    width: 48px;
    height: 48px;
  }

  .stats-icon :deep(.el-icon) {
    font-size: 24px !important;
  }

  .value {
    font-size: 24px;
  }
}
</style>
