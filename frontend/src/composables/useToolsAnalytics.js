import { reactive, ref } from 'vue';
import { analyticsAPI, toolsAPI } from '@/api/admin/tools';
import { getRecentActivity, getSystemStatus } from '@/api/admin';

const toNumber = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const coerceDate = value => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapPopularTools = (payload = [], nameMap = {}) => {
  return payload
    .map(item => {
      const identifier = item.toolIdentifier || item.id || item._id || item.identifier;
      const usage = toNumber(item.usageCount ?? item.count ?? item.total);
      return {
        id: identifier,
        name: item.name || nameMap[identifier] || identifier || '未知工具',
        usageCount: usage
      };
    })
    .filter(item => item.id);
};

const buildNameMap = (list = []) => {
  return list.reduce((acc, item) => {
    const id = item.id || item._id || item.identifier;
    if (id) {
      acc[id] = item.name || item.title || item.slug || id;
    }
    return acc;
  }, {});
};

const normalizeTrend = (trend = []) =>
  trend.map(point => ({
    date: point.date || point.day || point.label,
    count: toNumber(point.count ?? point.usageCount ?? point.total),
    uniqueUsers: toNumber(point.uniqueUsers ?? point.userCount ?? 0)
  }));

const pickOverviewStats = data => {
  const payload = data?.data?.data || data?.data || data || {};
  return {
    totalTools: toNumber(payload.totalTools ?? payload.total ?? 0),
    activeTools: toNumber(payload.activeTools ?? payload.active ?? 0),
    totalUsage: toNumber(
      payload.totalUsage ?? payload.weekUsage ?? payload.todayUsage ?? payload.totalCount ?? 0
    ),
    activeUsers: toNumber(payload.activeUsers ?? payload.uniqueUsers ?? 0)
  };
};

export function useToolsOverviewAnalytics() {
  const loading = ref(false);
  const trendLoading = ref(false);
  const error = ref(null);

  const overviewStats = reactive({
    totalTools: 0,
    activeTools: 0,
    totalUsage: 0,
    activeUsers: 0
  });

  const topTools = ref([]);
  const toolOptions = ref([]);
  const activities = ref([]);
  const systemStatus = reactive({
    serverStatus: 'unknown',
    databaseStatus: 'unknown',
    memoryUsage: '--',
    cpuUsage: 0,
    diskUsage: null,
    checkedAt: null
  });
  const trendPoints = ref([]);

  const fetchTrend = async ({ period = '7d', toolId } = {}) => {
    trendLoading.value = true;
    trendPoints.value = [];
    try {
      if (!toolId) return [];
      const response = await analyticsAPI.getToolUsageStats({ period, toolId });
      const trend = normalizeTrend(response?.data?.data?.trend || response?.data?.trend || []);
      trendPoints.value = trend;
      return trend;
    } catch (err) {
      trendPoints.value = [];
      throw err;
    } finally {
      trendLoading.value = false;
    }
  };

  const fetchOverview = async ({ period = '7d', activityLimit = 10, toolId } = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const [overviewRes, popularRes, toolsRes, activityRes, systemRes] = await Promise.all([
        analyticsAPI.getOverviewStats(),
        analyticsAPI.getToolUsageStats({ period }),
        toolsAPI.getTools({ page: 1, pageSize: 1000, status: 'active' }),
        getRecentActivity(activityLimit),
        getSystemStatus()
      ]);

      const toolsList =
        toolsRes?.data?.tools ||
        toolsRes?.data?.data?.tools ||
        toolsRes?.data?.data?.items ||
        toolsRes?.data?.items ||
        [];

      const nameMap = buildNameMap(toolsList);
      const popularRaw =
        popularRes?.data?.data?.popularTools ||
        popularRes?.data?.popularTools ||
        popularRes?.data?.data?.topTools ||
        popularRes?.data?.topTools ||
        [];

      const mappedTopTools = mapPopularTools(popularRaw, nameMap).sort(
        (a, b) => b.usageCount - a.usageCount
      );

      Object.assign(overviewStats, pickOverviewStats(overviewRes));
      topTools.value = mappedTopTools;
      toolOptions.value = toolsList
        .map(item => ({
          id: item.id || item._id || item.identifier,
          name: item.name || item.title || item.slug || '未命名工具'
        }))
        .filter(item => item.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      const activitiesRaw = activityRes?.data?.activities || activityRes?.data?.data || [];
      activities.value = activitiesRaw.map(item => ({
        id: item.id || `${item.type}-${item.createdAt}` || Math.random().toString(36).slice(2),
        title: item.title || item.description || item.message || '未知操作',
        type: item.type || 'info',
        createdAt: coerceDate(item.createdAt) || coerceDate(item.date) || new Date()
      }));

      const system = systemRes?.data?.data || systemRes?.data || {};
      const used = system?.memory?.used ?? system.memoryUsed ?? 0;
      const total = system?.memory?.total ?? system.memoryTotal ?? 0;
      const percent = total ? Math.round((used / total) * 100) : null;
      systemStatus.serverStatus = system.serverStatus || system.status || 'online';
      systemStatus.databaseStatus = system.databaseStatus || 'online';
      systemStatus.memoryUsage = total
        ? `${(used / 1024 / 1024).toFixed(0)}MB / ${(total / 1024 / 1024).toFixed(0)}MB${percent !== null ? ` (${percent}%)` : ''
        }`
        : '--';
      systemStatus.cpuUsage = toNumber(system.cpuUsage ?? system.cpu ?? 0);
      systemStatus.diskUsage = system.diskUsage ?? system.disk ?? null;
      systemStatus.checkedAt = new Date();

      const chartToolId = toolId || topTools.value[0]?.id;
      if (chartToolId) {
        await fetchTrend({ period, toolId: chartToolId });
      } else {
        trendPoints.value = [];
      }
    } catch (err) {
      error.value = err;
      trendPoints.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    trendLoading,
    error,
    overviewStats,
    topTools,
    toolOptions,
    activities,
    systemStatus,
    trendPoints,
    fetchOverview,
    fetchTrend
  };
}

export function useToolsUsageAnalytics() {
  const loading = ref(false);
  const error = ref(null);

  const summary = reactive({
    totalUsage: 0,
    uniqueUsers: 0,
    avgResponseTime: 0,
    successRate: 0
  });
  const toolOptions = ref([]);
  const topTools = ref([]);
  const trendPoints = ref([]);
  const deviceStats = ref([]);
  const behaviorStats = ref([]);

  const fetchUsage = async ({ period = '7d', toolId = '', dateRange } = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const params = {
        period,
        toolId: toolId || undefined
      };
      if (Array.isArray(dateRange) && dateRange.length === 2) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }


      const [statsRes, overallRes, toolsRes] = await Promise.all([
        analyticsAPI.getToolUsageStats(params),
        analyticsAPI.getOverallStats(params),
        toolsAPI.getTools({ page: 1, pageSize: 1000, status: 'active' })
      ]);


      const statsPayload = statsRes?.data?.data || statsRes?.data || {};
      const stats = statsPayload.stats || statsPayload;
      summary.totalUsage = toNumber(
        stats.totalUsage ?? stats.total ?? stats.totalCount ?? stats.weekUsage ?? 0
      );
      summary.uniqueUsers = toNumber(stats.uniqueUsers ?? stats.users ?? 0);
      summary.avgResponseTime = toNumber(stats.avgResponseTime ?? stats.averageTime ?? 0);
      summary.successRate = toNumber(stats.successRate ?? stats.success ?? 0);

      // 修复趋势数据处理逻辑
      let trendData = [];
      if (statsPayload.trend) {
        // 单工具查询时的trend字段
        trendData = statsPayload.trend;
      } else if (statsPayload.overallTrend) {
        // 全站查询时的overallTrend字段
        trendData = statsPayload.overallTrend;
      } else if (statsRes?.data?.overallTrend) {
        // 备用路径
        trendData = statsRes.data.overallTrend;
      }

      const trend = normalizeTrend(trendData);
      trendPoints.value = trend;


      const overallPayload = overallRes?.data?.data || overallRes?.data || {};
      const devices = overallPayload.deviceStats || overallPayload.devices || [];
      const behaviors = overallPayload.behaviorStats || overallPayload.behaviors || [];


      deviceStats.value = devices.map(item => ({
        name: item.type || item.name || '未知',
        value: toNumber(item.count ?? item.value ?? 0)
      }));
      behaviorStats.value = behaviors.map(item => ({
        action: item.action || item.name || '未知',
        value: toNumber(item.count ?? item.value ?? 0)
      }));


      const toolsList =
        toolsRes?.data?.tools ||
        toolsRes?.data?.data?.tools ||
        toolsRes?.data?.data?.items ||
        toolsRes?.data?.items ||
        [];
      toolOptions.value = toolsList
        .map(item => ({
          id: item.id || item._id || item.identifier,
          name: item.name || item.title || item.slug || '未命名工具'
        }))
        .filter(item => item.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      // 修复热门工具数据处理
      let popularRaw = [];
      if (statsPayload.popularTools) {
        popularRaw = statsPayload.popularTools;
      } else if (statsPayload.topTools) {
        popularRaw = statsPayload.topTools;
      }


      if (popularRaw.length) {
        topTools.value = mapPopularTools(popularRaw, buildNameMap(toolsList));
      } else if (!toolId) {
        topTools.value = [];
      }

    } catch (err) {
      error.value = err;
      trendPoints.value = [];
      deviceStats.value = [];
      behaviorStats.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    summary,
    toolOptions,
    topTools,
    trendPoints,
    deviceStats,
    behaviorStats,
    fetchUsage
  };
}
