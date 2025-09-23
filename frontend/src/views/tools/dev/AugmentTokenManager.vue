<template>
  <div class="augment-token-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon">
              <Coin />
            </el-icon>
            Augment 令牌池
          </h1>
          <p class="page-description">共享令牌池，上传和领取 Augment Code 访问令牌</p>
        </div>
        <div class="header-actions">
          <el-button @click="showUploadDialog = true" :icon="Upload" type="primary" round>
            上传令牌
          </el-button>
          <el-popover placement="bottom" :width="200" trigger="hover" :show-arrow="false">
            <template #reference>
              <el-button :icon="Refresh" :loading="isRefreshing" round>
                刷新
              </el-button>
            </template>
            <div class="refresh-options">
              <el-button type="text" size="small" @click="batchRefreshPoolInfo" :loading="isRefreshingPoolInfo"
                class="refresh-option-btn">
                批量基础信息刷新
              </el-button>
              <el-button type="text" size="small" @click="batchRefreshPoolStatus" :loading="isRefreshingPoolStatus"
                class="refresh-option-btn">
                批量令牌状态刷新
              </el-button>
            </div>
          </el-popover>
        </div>
      </div>
    </div>
    <!-- 批量进度浮层 -->
    <transition name="el-fade-in-linear">
      <div v-if="showBatchProgress" class="batch-progress-float">
        <el-card class="batch-progress-card" shadow="always">
          <div class="batch-progress-title">{{ batchTitle }} {{ batchDone }} / {{ batchTotal }}</div>
          <el-progress :percentage="batchPercent" :stroke-width="8" />
        </el-card>
      </div>
    </transition>


    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.available || 0 }}</div>
              <div class="stat-label">可用令牌</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.total || 0 }}</div>
              <div class="stat-label">总令牌数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.myUploads || 0 }}</div>
              <div class="stat-label">我的上传</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="pool-tabs">
      <!-- 令牌池 -->
      <el-tab-pane label="令牌池" name="pool">
        <el-card class="pool-card compact-card" shadow="hover">
          <template #header>
            <div class="card-header-compact">
              <div class="card-title-compact">
                <el-icon class="card-icon">
                  <Coin />
                </el-icon>
                <h2>可用令牌池</h2>
                <span class="card-subtitle-inline">从池子中领取令牌到您的账户</span>
              </div>
            </div>
          </template>

          <div v-if="poolTokens.length === 0" class="empty-state">
            <el-empty description="暂无可用令牌" />
          </div>

          <div v-else class="pool-table-container">
            <el-table :data="sortedPoolTokens" style="width: 100%" :header-cell-style="{
              background: '#f8fafc',
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderBottom: '2px solid #e5e7eb'
            }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>

              <el-table-column label="邮箱备注" min-width="160" align="center">
                <template #default="{ row }">
                  <div class="email-note-simple">
                    <div class="email-text" :title="maskEmailForPool(row.email_note || row.emailNote || '未设置')">
                      {{ maskEmailForPool(row.email_note || row.emailNote || '未设置') }}
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ formatDate(row.uploadedAt) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #header>
                  <div class="sortable-header" @click="toggleSort('pool', 'expiryDate')">
                    <span>过期时间</span>
                    <el-icon class="sort-icon" :class="getSortIconClass('pool', 'expiryDate')">
                      <Sort />
                    </el-icon>
                  </div>
                </template>
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ formatDate(row.expiryDate) || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ row.creditsBalance || '未知' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getAccountStatusType(row)" size="default" effect="light" round>
                      {{ getAccountStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="上传者" min-width="100" align="center">
                <template #default="{ row }">
                  <div class="uploader-info">
                    <el-text size="small" style="color: #666;">
                      {{ row.originalUploader || row.uploaderId?.username || row.uploaderUsername || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="操作" :min-width="isAdmin ? 160 : 120" align="center">
                <template #default="{ row }">
                  <div class="action-buttons compact-actions">
                    <el-tooltip content="领取令牌" placement="top">
                      <el-button type="primary" size="small" @click="claimToken(row)" :loading="row._claiming"
                        :disabled="row.status !== 'available'" :icon="Download" circle>
                      </el-button>
                    </el-tooltip>
                    <el-popover placement="top" :width="180" trigger="hover" :show-arrow="false">
                      <template #reference>
                        <el-button :icon="Refresh" size="small" :loading="row._refreshing" circle plain>
                        </el-button>
                      </template>
                      <div class="refresh-options">
                        <el-button type="text" size="small" @click="refreshTokenInfo(row)"
                          :loading="row._refreshingInfo" class="refresh-option-btn">
                          基础信息刷新
                        </el-button>
                        <el-button type="text" size="small" @click="refreshTokenStatus(row)"
                          :loading="row._refreshingStatus" class="refresh-option-btn">
                          令牌状态刷新
                        </el-button>
                      </div>
                    </el-popover>
                    <!-- 管理员删除按钮 -->
                    <el-tooltip v-if="isAdmin" content="管理员删除" placement="top">
                      <el-button type="danger" size="small" @click="adminDeleteToken(row)" :loading="row._deleting"
                        :icon="Delete" circle plain>
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 我的上传 -->
      <el-tab-pane label="我的上传" name="uploads">
        <el-card class="uploads-card compact-card" shadow="hover">
          <template #header>
            <div class="card-header-compact">
              <div class="card-title-compact">
                <el-icon class="card-icon">
                  <Upload />
                </el-icon>
                <h2>我的上传</h2>
                <span class="card-subtitle-inline">查看您上传到池子的令牌历史记录</span>
              </div>
            </div>
          </template>

          <div v-if="myUploads.length === 0" class="empty-state">
            <el-empty description="您还没有上传任何令牌">
              <el-button type="primary" @click="showUploadDialog = true">
                上传令牌
              </el-button>
            </el-empty>
          </div>

          <div v-else class="uploads-table-container">
            <el-table :data="sortedMyUploads" style="width: 100%" :header-cell-style="{
              background: '#f8fafc',
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderBottom: '2px solid #e5e7eb'
            }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>

              <el-table-column label="邮箱备注" min-width="160" align="center">
                <template #default="{ row }">
                  <div class="email-note-modern">
                    <div class="email-text" :title="getTokenEmailNote(row, false)">
                      {{ getTokenEmailNote(row, false) }}
                    </div>
                    <el-button v-if="row.email_note || row.emailNote"
                      @click="copyToClipboard(getTokenEmailNote(row, false))" size="small" text class="copy-btn"
                      title="复制邮箱备注">
                      复制
                    </el-button>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ formatDate(row.uploadedAt) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #header>
                  <div class="sortable-header" @click="toggleSort('uploads', 'expiryDate')">
                    <span>过期时间</span>
                    <el-icon class="sort-icon" :class="getSortIconClass('uploads', 'expiryDate')">
                      <Sort />
                    </el-icon>
                  </div>
                </template>
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ formatDate(row.expiryDate) || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ row.creditsBalance || '未知' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getAccountStatusType(row)" size="default" effect="light" round>
                      {{ getAccountStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="当前状态" min-width="120" align="center">
                <template #default="{ row }">
                  <div v-if="row.claimedBy" class="claimed-info">
                    <el-tag type="success" size="small" round>
                      已被领取
                    </el-tag>
                    <div style="margin-top: 4px;">
                      <small style="color: #999;">领取者：{{ row.claimedBy.username || '未知用户' }}</small>
                    </div>
                  </div>
                  <el-tag v-else type="info" size="small" round>
                    等待领取
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>



      <!-- 已保存的令牌 -->
      <el-tab-pane label="已保存的令牌" name="saved">

        <!-- 已保存的令牌列表 -->
        <el-card class="tokens-card" shadow="hover">
          <template #header>
            <div class="card-header-with-actions">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Document />
                </el-icon>
                <h2>已保存的令牌</h2>
              </div>
              <div class="card-actions">
                <el-button @click="showImportDialog = true" :icon="Upload" type="info" plain round size="small">
                  导入令牌
                </el-button>
                <el-dropdown @command="handleExportCommand" :disabled="tokens.length === 0">
                  <el-button :icon="Download" type="success" plain round size="small">
                    批量导出
                    <el-icon class="el-icon--right">
                      <ArrowDown />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="all">
                        <el-icon>
                          <Download />
                        </el-icon>
                        导出全部 ({{ tokens.length }})
                      </el-dropdown-item>
                      <el-dropdown-item command="selected" :disabled="selectedTokens.length === 0">
                        <el-icon>
                          <Check />
                        </el-icon>
                        导出选中 ({{ selectedTokens.length }})
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-popover placement="bottom" :width="200" trigger="hover" :show-arrow="false">
                  <template #reference>
                    <el-button type="primary" :icon="Refresh" :loading="isRefreshing" round size="small">
                      刷新令牌
                    </el-button>
                  </template>
                  <div class="refresh-options">
                    <el-button type="text" size="small" @click="batchRefreshTokensInfo"
                      :loading="isRefreshingTokensInfo" class="refresh-option-btn">
                      批量基础信息刷新
                    </el-button>
                    <el-button type="text" size="small" @click="batchRefreshTokensStatus"
                      :loading="isRefreshingTokensStatus" class="refresh-option-btn">
                      批量令牌状态刷新
                    </el-button>
                  </div>
                </el-popover>
              </div>
            </div>
          </template>

          <div v-if="tokens.length === 0" class="empty-state">
            <el-empty description="暂无保存的令牌">
              <el-button type="primary" @click="scrollToGenerator">
                生成新令牌
              </el-button>
            </el-empty>
          </div>

          <div v-else class="tokens-table-container">
            <el-table :data="sortedTokens" style="width: 100%" :row-key="row => row.id" table-layout="auto"
              @selection-change="handleSelectionChange" ref="tokenTable" :header-cell-style="{
                background: '#f8fafc',
                color: '#000000',
                fontWeight: '600',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                borderBottom: '2px solid #e5e7eb'
              }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>
              <el-table-column type="selection" width="50" align="center" />
              <el-table-column prop="email_note" label="邮箱备注" min-width="160" align="center">
                <template #default="{ row }">
                  <div class="email-note-modern">
                    <div class="email-text" :title="row.email_note || row.emailNote || '未设置'">
                      {{ row.email_note || row.emailNote || '未设置' }}
                    </div>
                    <el-button v-if="row.email_note || row.emailNote"
                      @click="copyToClipboard(row.email_note || row.emailNote)" size="small" text class="copy-btn"
                      title="复制邮箱备注">
                      复制
                    </el-button>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ getCreatedAt(row) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #header>
                  <div class="sortable-header" @click="toggleSort('saved', 'expiryDate')">
                    <span>过期时间</span>
                    <el-icon class="sort-icon" :class="getSortIconClass('saved', 'expiryDate')">
                      <Sort />
                    </el-icon>
                  </div>
                </template>
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ getExpiryDate(row) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ getCreditsBalance(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getAccountStatusType(row)" size="default" effect="light" round>
                      {{ getAccountStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="编辑器" min-width="120" align="center">
                <template #default="{ row }">
                  <el-dropdown @command="(command) => handleEditorSwitch(row, command)" trigger="click">
                    <el-button size="default" type="primary" plain :icon="Monitor" round>
                      切换
                      <el-icon class="el-icon--right">
                        <ArrowDown />
                      </el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="vscode">
                          <span class="editor-item">🔵 VS Code</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="cursor">
                          <span class="editor-item">⚡ Cursor</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="kiro">
                          <span class="editor-item">🔥 Kiro</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="trae">
                          <span class="editor-item">🚀 Trae</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="windsurf">
                          <span class="editor-item">🌊 Windsurf</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="qoder">
                          <span class="editor-item">📝 Qoder</span>
                        </el-dropdown-item>
                        <el-dropdown-item divided command="copy">
                          <span class="editor-item">📋 复制令牌</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>

              <el-table-column label="操作" min-width="200" fixed="right" align="center">
                <template #default="{ row }">
                  <div class="action-buttons compact-actions">
                    <el-popover placement="top" :width="180" trigger="hover" :show-arrow="false">
                      <template #reference>
                        <el-button type="primary" size="small" :loading="row._refreshing" :icon="Refresh" circle plain>
                        </el-button>
                      </template>
                      <div class="refresh-options">
                        <el-button type="text" size="small" @click="refreshSavedTokenInfo(row)"
                          :loading="row._refreshingInfo" class="refresh-option-btn">
                          基础信息刷新
                        </el-button>
                        <el-button type="text" size="small" @click="refreshSavedTokenStatus(row)"
                          :loading="row._refreshingStatus" class="refresh-option-btn">
                          令牌状态刷新
                        </el-button>
                      </div>
                    </el-popover>
                    <el-tooltip content="上传到池" placement="top">
                      <el-button type="info" size="small" @click="uploadTokenToPool(row)" :loading="row._uploading"
                        :icon="Upload" circle plain>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="编辑令牌" placement="top">
                      <el-button type="warning" size="small" @click="editToken(row)" :icon="Edit" circle plain>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="导出令牌" placement="top">
                      <el-button type="success" size="small" @click="exportToken(row)" :icon="Download" circle plain>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="删除令牌" placement="top">
                      <el-button type="danger" size="small" @click="deleteToken(row)" :icon="Delete" circle plain>
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- 生成新令牌 -->
        <el-card class="generator-card" ref="generatorCard" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Key />
                </el-icon>
                <h2>生成新的访问令牌</h2>
              </div>
              <span class="card-subtitle">按照以下步骤获取您的 Augment 访问令牌</span>
            </div>
          </template>

          <!-- 步骤 1: 生成授权URL -->
          <div class="step-section">
            <div class="step-header">
              <el-icon class="step-icon">
                <Key />
              </el-icon>
              <h3>步骤 1: 生成授权URL</h3>
            </div>

            <el-button type="primary" @click="generateAuthUrl" :loading="isGenerating" size="large" round>
              <el-icon>
                <Link />
              </el-icon>
              生成授权URL
            </el-button>

            <div v-if="authUrl" class="url-section">
              <el-form-item label="授权URL:">
                <el-input v-model="authUrl" readonly placeholder="点击上方按钮生成授权URL">
                  <template #append>
                    <el-button @click="copyAuthUrl" :icon="CopyDocument">
                      复制
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <div class="action-buttons">
                <el-button @click="openAuthUrl" :icon="Link">
                  打开授权页面
                </el-button>
              </div>
            </div>
          </div>

          <!-- 步骤 2: 输入授权码 -->
          <div class="step-section">
            <div class="step-header">
              <el-icon class="step-icon">
                <Document />
              </el-icon>
              <h3>步骤 2: 输入授权码</h3>
            </div>

            <el-form-item label="授权码:">
              <el-input v-model="authCode" type="textarea" :rows="4" placeholder="在此粘贴授权码JSON..." />
            </el-form-item>

            <el-button type="primary" @click="getAccessToken" :loading="isGettingToken" :disabled="!canGetToken"
              size="large" round>
              <el-icon>
                <Key />
              </el-icon>
              获取访问令牌
            </el-button>
          </div>

          <!-- 步骤 3: 访问令牌结果 -->
          <div v-if="tokenResult" class="step-section">
            <div class="step-header">
              <el-icon class="step-icon">
                <Check />
              </el-icon>
              <h3>步骤 3: 保存访问令牌</h3>
            </div>

            <el-form :model="tokenForm" label-width="120px">
              <el-form-item label="访问令牌:">
                <el-input v-model="tokenResult.access_token" readonly>
                  <template #append>
                    <el-button @click="copyAccessToken" :icon="CopyDocument">
                      复制
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="租户URL:">
                <el-input v-model="tokenResult.tenant_url" readonly>
                  <template #append>
                    <el-button @click="copyTenantUrl" :icon="CopyDocument">
                      复制
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="Portal URL:">
                <el-input v-model="tokenForm.portalUrl" placeholder="请输入 Portal 地址（可选）" />
              </el-form-item>

              <el-form-item label="邮箱备注:">
                <el-input v-model="tokenForm.emailNote" placeholder="请输入邮箱相关备注（可选）" />
              </el-form-item>

              <el-form-item>
                <el-button type="success" @click="saveToken" :loading="isSaving" size="large" round>
                  <el-icon>
                    <Check />
                  </el-icon>
                  保存令牌
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 导入令牌对话框 -->
        <TokenImportDialog v-model="showImportDialog" @import-success="handleImportSuccess" />

        <!-- 编辑对话框 -->
        <TokenEditDialog v-model="showEditDialog" :token="editingToken" @save="handleEditSave" />
      </el-tab-pane>
    </el-tabs>



    <!-- 上传令牌到池子对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传令牌到池子" width="800px" :close-on-click-modal="false">
      <div class="upload-dialog">
        <!-- 导入方式选择 -->
        <div class="import-mode-selector">
          <el-radio-group v-model="uploadMode" @change="handleUploadModeChange">
            <el-radio-button label="manual">手动输入</el-radio-button>
            <el-radio-button label="json">JSON导入</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 手动输入模式 -->
        <div v-if="uploadMode === 'manual'" class="manual-upload">
          <div class="section-header">
            <h3>手动输入令牌信息</h3>
            <p>请逐个输入令牌信息，每个令牌占一行</p>
          </div>

          <div class="token-inputs">
            <div v-for="(token, index) in uploadTokens" :key="index" class="token-input-row">
              <div class="row-header">
                <span class="row-number">{{ index + 1 }}</span>
                <el-button v-if="uploadTokens.length > 1" type="danger" size="small" :icon="Delete" circle
                  @click="removeUploadTokenRow(index)" />
              </div>

              <div class="token-fields">
                <el-form-item label="访问令牌" required>
                  <el-input v-model="token.access_token" placeholder="请输入访问令牌" type="textarea" :rows="2"
                    :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="租户URL">
                  <el-input v-model="token.tenant_url" placeholder="请输入租户URL（可选）" :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="Portal URL">
                  <el-input v-model="token.portal_url" placeholder="请输入Portal URL（可选）" :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="邮箱备注">
                  <el-input v-model="token.email_note" placeholder="请输入邮箱备注（可选）" :disabled="isUploading" />
                </el-form-item>
              </div>
            </div>
          </div>

          <div class="add-token-row">
            <el-button @click="addUploadTokenRow" :icon="Plus" type="primary" plain>
              添加令牌
            </el-button>
          </div>
        </div>

        <!-- JSON导入模式 -->
        <div v-else class="json-upload">
          <div class="section-header">
            <h3>JSON格式导入</h3>
            <p>请粘贴JSON格式的令牌数据</p>
          </div>

          <el-input v-model="uploadJsonText" type="textarea" :rows="12" placeholder="请粘贴JSON格式的令牌数据..."
            :disabled="isUploading" />

          <div class="json-example">
            <el-collapse>
              <el-collapse-item title="查看JSON格式示例" name="example">
                <pre class="json-example-code">{{ jsonExample }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showUploadDialog = false" :disabled="isUploading">
          取消
        </el-button>
        <el-button type="primary" @click="uploadTokensToPool" :loading="isUploading">
          上传到池子
        </el-button>
      </template>
    </el-dialog>

    <!-- 临时邮箱助手 -->
    <TempEmailHelper :visible="showTempEmailHelper" position="right" @close="handleTempEmailHelperClose"
      @email-generated="handleEmailGenerated" @verification-code="handleVerificationCode" @copy-email="handleCopyEmail"
      @copy-code="handleCopyCode" @permission-denied="handlePermissionDenied" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key,
  Document,
  Check,
  Link,
  CopyDocument,
  Refresh,
  Delete,

  Upload,
  Monitor,
  ArrowDown,
  Edit,
  Download,
  Coin,
  User,
  Plus,
  Sort,
  Select
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import { useUserStore } from '@/stores/user'
import { useProtocolSwitcher } from '@/composables/useProtocolSwitcher'
import TokenImportDialog from './components/TokenImportDialog.vue'
import TokenEditDialog from './components/TokenEditDialog.vue'
import TempEmailHelper from '@/components/TempEmailHelper.vue'
import { tokenPoolService } from '@/services/tokenPoolService'


// 响应式数据
const authUrl = ref('')
const authCode = ref('')
const tokenResult = ref(null)
const tokens = ref([])
const generatorCard = ref(null)
const showImportDialog = ref(false)
const showEditDialog = ref(false)
const editingToken = ref(null)
const selectedTokens = ref([])
const tokenTable = ref(null)

// 临时邮箱助手相关
const showTempEmailHelper = ref(false)

// 用户store
const userStore = useUserStore()

// 管理员权限计算属性
const isAdmin = computed(() => {
  return userStore.user && userStore.user.isAdmin
})

// 令牌池相关数据
const activeTab = ref('saved')
const showUploadDialog = ref(false)
const isUploading = ref(false)
const poolTokens = ref([])
const myUploads = ref([])


// 计算统计信息
const poolStatsComputed = computed(() => {
  const available = poolTokens.value.filter(token => token.status === 'available').length
  const total = poolTokens.value.length
  const myUploadsCount = myUploads.value.length

  return {
    available,
    total,
    myUploads: myUploadsCount,
    capacity: 1000
  }
})

// 排序后的数据
const sortedPoolTokens = computed(() => {
  return sortTokens(poolTokens.value, 'pool')
})

const sortedMyUploads = computed(() => {
  return sortTokens(myUploads.value, 'uploads')
})

const sortedTokens = computed(() => {
  return sortTokens(tokens.value, 'saved')
})







// 上传对话框相关数据
const uploadMode = ref('manual')
const uploadTokens = ref([{
  access_token: '',
  tenant_url: '',
  portal_url: '',
  email_note: ''
}])
const uploadJsonText = ref('')

// JSON示例
const jsonExample = ref(`[
  {
    "access_token": "your_access_token_here",
    "tenant_url": "https://your-tenant.augmentcode.com",
    "portal_url": "https://portal.augmentcode.com",
    "email_note": "example@domain.com"
  }
]`)



const tokenForm = ref({
  portalUrl: '',
  emailNote: ''
})

// 加载状态
// 批量进度状态
const showBatchProgress = ref(false)
const batchTitle = ref('')
const batchTotal = ref(0)
const batchDone = ref(0)
const batchPercent = computed(() => batchTotal.value ? Math.round((batchDone.value / batchTotal.value) * 100) : 0)

const startBatchProgress = (title, total) => {
  showBatchProgress.value = true
  batchTitle.value = title
  batchTotal.value = total
  batchDone.value = 0
}
const incBatchProgress = () => {
  batchDone.value = Math.min(batchDone.value + 1, batchTotal.value)
}
const finishBatchProgress = () => {
  showBatchProgress.value = false
}

const isGenerating = ref(false)
const isGettingToken = ref(false)
const isSaving = ref(false)
const isRefreshing = ref(false)

// 分离的刷新状态
const isRefreshingPoolInfo = ref(false)
const isRefreshingPoolStatus = ref(false)
const isRefreshingTokensInfo = ref(false)
const isRefreshingTokensStatus = ref(false)

// 排序状态
const sortConfig = ref({
  pool: { field: null, order: null },
  uploads: { field: null, order: null },
  saved: { field: null, order: null }
})



// 使用组合式函数
const {
  generateAuthUrl: generateUrl,
  getAccessToken: getToken,
  saveToken: saveTokenApi,
  loadTokens,
  updateToken: updateTokenApi,
  deleteToken: deleteTokenApi,
  refreshTokenInfo: refreshTokenInfoApi,
  refreshTokenStatus: refreshTokenStatusApi,
  refreshPortalInfo: refreshPortalInfoApi,
  batchRefreshTokenInfo: batchRefreshTokenInfoApi,
  batchRefreshTokenStatus: batchRefreshTokenStatusApi,
  batchRefreshPortalInfo: batchRefreshPortalInfoApi,
  checkTokenStatus: checkTokenStatusApi,
  formatTokenStatus
} = useAugmentAuth()

const { switchToEditor, copyTokenInfo } = useProtocolSwitcher()

// 计算属性
const canGetToken = computed(() => {
  return authUrl.value && authCode.value.trim().length > 0
})



// 方法
const generateAuthUrl = async () => {
  isGenerating.value = true
  try {
    const result = await generateUrl()
    authUrl.value = result.auth_url
    ElMessage.success('授权URL生成成功')

    // 显示临时邮箱助手
    showTempEmailHelper.value = true
  } catch (error) {
    ElMessage.error(`生成授权URL失败: ${error.message}`)
  } finally {
    isGenerating.value = false
  }
}

const getAccessToken = async () => {
  isGettingToken.value = true
  try {
    const result = await getToken(authCode.value)
    tokenResult.value = result
    ElMessage.success('访问令牌获取成功')
  } catch (error) {
    ElMessage.error(`获取访问令牌失败: ${error.message}`)
  } finally {
    isGettingToken.value = false
  }
}

const saveToken = async () => {
  isSaving.value = true
  try {
    await saveTokenApi({
      tenant_url: tokenResult.value.tenant_url,
      access_token: tokenResult.value.access_token,
      portal_url: tokenForm.value.portalUrl || null,
      email_note: tokenForm.value.emailNote || null
    })

    ElMessage.success('令牌保存成功')

    // 重置表单
    authUrl.value = ''
    authCode.value = ''
    tokenResult.value = null
    tokenForm.value = {
      portalUrl: '',
      emailNote: ''
    }

    // 刷新令牌列表
    await refreshTokens()
  } catch (error) {
    ElMessage.error(`保存令牌失败: ${error.message}`)
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // 复制失败已通过返回值处理
    return false
  }
}

const copyAuthUrl = async () => {
  const success = await copyToClipboard(authUrl.value)
  ElMessage[success ? 'success' : 'error'](
    success ? 'URL已复制到剪贴板' : '复制失败'
  )
}

const copyAccessToken = async () => {
  const success = await copyToClipboard(tokenResult.value.access_token)
  ElMessage[success ? 'success' : 'error'](
    success ? '访问令牌已复制到剪贴板' : '复制失败'
  )
}

const copyTenantUrl = async () => {
  const success = await copyToClipboard(tokenResult.value.tenant_url)
  ElMessage[success ? 'success' : 'error'](
    success ? '租户URL已复制到剪贴板' : '复制失败'
  )
}

const openAuthUrl = () => {
  if (authUrl.value) {
    window.open(authUrl.value, '_blank')
  }
}

// 临时邮箱助手事件处理
const handleTempEmailHelperClose = () => {
  showTempEmailHelper.value = false
}

const handleEmailGenerated = (email) => {
  ElMessage.success(`临时邮箱生成成功: ${email}`)
}

const handleVerificationCode = (code) => {
  ElMessage.success(`检测到验证码: ${code}`)
}

const handleCopyEmail = () => {
  ElMessage.success('邮箱已复制到剪贴板')
}

const handleCopyCode = () => {
  ElMessage.success('验证码已复制到剪贴板')
}

const handlePermissionDenied = () => {
  ElMessage.warning('需要激活临时邮箱权限')
  // 可以在这里添加跳转到临时邮箱页面的逻辑
}

// 仅加载数据库中的令牌数据（页面初始化用）
const loadTokensOnly = async () => {
  try {
    const result = await loadTokens()
    tokens.value = result || []
  } catch (error) {
    ElMessage.error(`加载令牌失败: ${error.message}`)
  }
}

// 刷新令牌列表和Portal信息
const refreshTokens = async () => {
  isRefreshing.value = true
  try {
    // 1. 先加载令牌列表
    const result = await loadTokens()
    tokens.value = result || []

    // 2. 如果有令牌，批量刷新Portal信息
    if (tokens.value.length > 0) {
      const tokenIds = tokens.value.map(token => token.id)

      try {
        const refreshResults = await batchRefreshPortalInfoApi(tokenIds)

        // 更新本地令牌数据
        refreshResults.forEach(result => {
          if (result.success) {
            const index = tokens.value.findIndex(t => t.id === result.tokenId)
            if (index !== -1) {
              tokens.value.splice(index, 1, {
                ...tokens.value[index],
                portal_info: JSON.stringify(result.data.portal_info),
                usage_stats: result.data.usage_stats
              })
            }
          }
        })

        ElMessage.success(`令牌列表已刷新，Portal信息已更新`)
      } catch (portalError) {
        ElMessage.warning(`令牌列表已刷新，但Portal信息更新失败: ${portalError.message}`)
      }
    } else {
      ElMessage.success('令牌列表已刷新')
    }
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshing.value = false
  }
}

// 删除令牌
const deleteToken = async (token) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除令牌 "${token.email_note || token.id}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await deleteTokenApi(token.id)
    ElMessage.success('令牌删除成功')
    await refreshTokens()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${error.message}`)
    }
  }
}

// 刷新Portal信息
const refreshPortalInfo = async (token) => {
  // 找到原始token对象并设置loading状态
  const index = tokens.value.findIndex(t => t.id === token.id)
  if (index === -1) return

  // 直接在原始对象上设置loading状态
  tokens.value[index]._refreshing = true

  try {
    const result = await refreshPortalInfoApi(token.id)

    // 根据后端返回的数据结构，正确提取portal_info
    const portalInfo = result.portal_info || {}

    // 将portal_info对象序列化为JSON字符串，因为前端解析函数期望JSON字符串格式
    const updatedToken = {
      ...tokens.value[index],
      portal_info: JSON.stringify(portalInfo),
      usage_stats: result.usage_stats || {},
      _refreshing: false // 确保清除loading状态
    }

    // 使用Vue的响应式更新
    tokens.value.splice(index, 1, updatedToken)

    ElMessage.success('Portal信息已刷新')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    // 确保清除loading状态
    if (tokens.value[index]) {
      tokens.value[index]._refreshing = false
    }
  }
}

// Portal状态相关方法
const getPortalStatusType = (token) => {
  if (!token.portal_info) return 'info'
  try {
    const info = JSON.parse(token.portal_info)
    return info.is_active ? 'success' : 'danger'
  } catch {
    return 'warning'
  }
}

const getPortalStatusText = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    return info.is_active ? '活跃' : '已过期'
  } catch {
    return '解析错误'
  }
}

const getCreditsBalance = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    return info.credits_balance !== undefined ? info.credits_balance : '未知'
  } catch {
    return '未知'
  }
}

// 格式化日期函数
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '未知'
  }
}

// 获取创建时间
const getCreatedAt = (token) => {
  if (!token.portal_info) return formatDate(token.created_at)
  try {
    const info = JSON.parse(token.portal_info)
    if (info.created_at) {
      const createdDate = new Date(info.created_at)
      return createdDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return formatDate(token.created_at)
  } catch {
    return formatDate(token.created_at)
  }
}

const getExpiryDate = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    if (info.expiry_date) {
      const expiryDate = new Date(info.expiry_date)
      return expiryDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return '未知'
  } catch {
    return '未知'
  }
}

// 获取过期时间的样式类
const getExpiryClass = (token) => {
  if (!token.portal_info) return 'expiry-unknown'
  try {
    const info = JSON.parse(token.portal_info)
    if (info.expiry_date) {
      const expiryDate = new Date(info.expiry_date)
      const now = new Date()
      const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return 'expiry-expired'  // 已过期：红色
      if (diffDays < 1) return 'expiry-danger'   // 低于1天：红色
      if (diffDays < 3) return 'expiry-warning'  // 低于3天：橙色
      return 'expiry-normal'                     // 其他时间：绿色
    }
    return 'expiry-unknown'
  } catch {
    return 'expiry-unknown'
  }
}

// 获取剩余次数的标签类型
const getCreditsType = (token) => {
  const credits = parseInt(getCreditsBalance(token))
  if (isNaN(credits)) return 'info'
  if (credits <= 0) return 'danger'
  if (credits <= 10) return 'warning'
  if (credits <= 50) return 'primary'
  return 'success'
}

// 排序相关方法
const toggleSort = (table, field) => {
  const currentSort = sortConfig.value[table]

  if (currentSort.field === field) {
    // 如果是同一个字段，切换排序方向
    if (currentSort.order === 'asc') {
      currentSort.order = 'desc'
    } else if (currentSort.order === 'desc') {
      currentSort.order = null
      currentSort.field = null
    } else {
      currentSort.order = 'asc'
    }
  } else {
    // 如果是不同字段，设置为升序
    currentSort.field = field
    currentSort.order = 'asc'
  }
}

const getSortIconClass = (table, field) => {
  const currentSort = sortConfig.value[table]
  if (currentSort.field !== field) return ''

  return {
    'sort-asc': currentSort.order === 'asc',
    'sort-desc': currentSort.order === 'desc'
  }
}

const sortTokens = (tokens, table) => {
  const currentSort = sortConfig.value[table]
  if (!currentSort.field || !currentSort.order) return tokens

  return [...tokens].sort((a, b) => {
    let aValue, bValue

    if (currentSort.field === 'expiryDate') {
      // 处理过期时间排序
      aValue = getExpiryDateForSort(a)
      bValue = getExpiryDateForSort(b)
    }

    // 处理空值
    if (aValue === null && bValue === null) return 0
    if (aValue === null) return 1
    if (bValue === null) return -1

    let result = 0
    if (aValue < bValue) result = -1
    else if (aValue > bValue) result = 1

    return currentSort.order === 'desc' ? -result : result
  })
}

const getExpiryDateForSort = (token) => {
  // 对于令牌池和我的上传，使用 expiryDate 字段
  if (token.expiryDate) {
    return new Date(token.expiryDate)
  }

  // 对于已保存的令牌，从 portal_info 中解析
  if (token.portal_info) {
    try {
      const info = JSON.parse(token.portal_info)
      if (info.expiry_date) {
        return new Date(info.expiry_date)
      }
    } catch {
      // 解析失败，返回null
    }
  }

  return null
}

// 滚动到生成器
const scrollToGenerator = () => {
  nextTick(() => {
    if (generatorCard.value) {
      generatorCard.value.$el.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

// 令牌池相关方法
const refreshPool = async () => {
  isRefreshing.value = true
  try {
    // 获取池子数据
    const poolResponse = await tokenPoolService.getPoolTokens({ status: 'available' })
    poolTokens.value = poolResponse.data?.tokens || poolResponse.tokens || []

    // 获取我的上传
    const uploadsResponse = await tokenPoolService.getMyUploads()
    myUploads.value = uploadsResponse.data?.tokens || uploadsResponse.tokens || []

    ElMessage.success('刷新成功')
  } catch (error) {
    // 刷新失败详情已通过UI反馈处理
    ElMessage.error(error.message || '刷新失败')
  } finally {
    isRefreshing.value = false
  }
}



const claimToken = async (token) => {
  token._claiming = true
  try {
    // 详细确认操作
    await ElMessageBox.confirm(
      `确定要领取此令牌吗？

ℹ️ 领取说明：
• 领取后令牌将从池中移除
• 您将成为该令牌的唯一所有者
• 令牌将添加到您的个人列表中

令牌信息：${token.email_note || token.emailNote || '未命名'}
原始上传者：${token.originalUploader || token.uploaderId?.username || '未知'}`,
      '确认领取令牌',
      {
        type: 'info',
        confirmButtonText: '确定领取',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: true
      }
    )

    // 调用领取API（转移模式）
    const response = await tokenPoolService.claimTokenTransfer(token._id || token.id)

    if (response.success) {
      ElMessage.success('令牌已领取，已添加到您的个人列表中')

      // 立即更新本地数据
      const tokenIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (tokenIndex !== -1) {
        poolTokens.value.splice(tokenIndex, 1)
      }

      // 刷新完整数据：令牌池、我的上传、已保存的令牌
      await Promise.all([
        refreshPool(),
        refreshTokens() // 刷新已保存的令牌列表
      ])

      // 切换到已保存令牌标签页
      activeTab.value = 'saved'
    } else {
      throw new Error(response.message || '领取失败')
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      // 领取失败已通过UI反馈处理
      ElMessage.error(error.message || '领取失败')
    }
  } finally {
    token._claiming = false
  }
}





// 管理员删除令牌池中的令牌
const adminDeleteToken = async (token) => {
  try {
    // 管理员删除确认对话框
    const { value: reason } = await ElMessageBox.prompt(
      `确定要删除此令牌吗？

⚠️ 管理员操作提醒：
• 此操作将永久删除令牌池中的令牌
• 原始上传者：${token.originalUploader || token.uploaderId?.username || '未知'}
• 上传时间：${formatDate(token.uploadedAt)}
• 当前状态：${token.status === 'available' ? '可领取' : '已被领取'}

请输入删除原因（可选）：`,
      '管理员删除令牌',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入删除原因...',
        inputType: 'textarea',
        type: 'warning'
      }
    )

    token._deleting = true
    const response = await tokenPoolService.adminDeleteToken(token._id || token.id, reason || '管理员删除')

    if (response.success) {
      ElMessage.success('令牌删除成功')

      // 立即更新本地数据 - 从令牌池中移除
      const tokenId = token._id || token.id
      const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === tokenId)
      if (poolIndex !== -1) {
        poolTokens.value.splice(poolIndex, 1)
      }

      // 刷新完整数据以确保同步
      await refreshPool()
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      // 管理员删除失败已通过UI反馈处理
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    token._deleting = false
  }
}

// 辅助方法 - 使用已有的formatDate函数

const getStatusType = (token) => {
  switch (token.status) {
    case 'available': return 'success'
    case 'claimed': return 'warning'
    case 'expired': return 'danger'
    case 'invalid': return 'info'
    default: return 'info'
  }
}

const getStatusText = (token) => {
  switch (token.status) {
    case 'available': return '可用'
    case 'claimed': return '已领取'
    case 'expired': return '已过期'
    case 'invalid': return '无效'
    default: return '未知'

  }
}

// 专门用于可用令牌池的邮箱脱敏函数：@符号前后2位替换为*
const maskEmailForPool = (email) => {
  if (!email || email === '未设置') return email

  const atIndex = email.indexOf('@')
  if (atIndex === -1) return email

  let result = ''

  // 处理@前的部分

  const localPart = email.substring(0, atIndex)
  if (localPart.length <= 2) {
    // 如果@前不足2位，全部替换为*
    result += '*'.repeat(localPart.length)
  } else {
    // @前超过2位，只替换最后2位
    result += localPart.substring(0, localPart.length - 2) + '**'
  }

  result += '@'

  // 处理@后的部分
  const domainPart = email.substring(atIndex + 1)
  if (domainPart.length <= 2) {
    // 如果@后不足2位，全部替换为*
    result += '*'.repeat(domainPart.length)
  } else {
    // @后超过2位，只替换前2位
    result += '**' + domainPart.substring(2)
  }

  return result
}

// 获取令牌邮箱备注的显示文本（简化版，显示完整内容）
const getTokenEmailNote = (token, isMyUpload = false) => {
  // 如果是我的上传，显示默认文本
  if (isMyUpload) {
    return '我的上传'
  }

  // 直接返回完整的邮箱备注，不做任何脱敏处理
  return token.email_note || token.emailNote || '未设置'
}

// 基于 ban_status 的账号状态展示
const getAccountStatusType = (row) => {
  const info = formatTokenStatus(row.ban_status)
  return info.type
}

const getAccountStatusText = (row) => {
  const info = formatTokenStatus(row.ban_status)
  return info.text
}


// 这个函数已不再需要，因为我们简化了显示逻辑











// ==================== 管理员令牌管理方法结束 ====================

// 上传对话框相关方法
const handleUploadModeChange = () => {
  // 切换模式时清空数据
  if (uploadMode.value === 'manual') {
    uploadTokens.value = [{
      access_token: '',
      tenant_url: '',
      portal_url: '',
      email_note: ''
    }]
  } else {
    uploadJsonText.value = ''
  }
}

const addUploadTokenRow = () => {
  uploadTokens.value.push({
    access_token: '',
    tenant_url: '',
    portal_url: '',
    email_note: ''
  })
}

const removeUploadTokenRow = (index) => {
  if (uploadTokens.value.length > 1) {
    uploadTokens.value.splice(index, 1)
  }
}

const uploadTokensToPool = async () => {
  try {
    let tokensToUpload = []

    if (uploadMode.value === 'manual') {
      // 手动输入模式
      tokensToUpload = uploadTokens.value.filter(token => token.access_token.trim())
      if (tokensToUpload.length === 0) {
        ElMessage.warning('请至少输入一个访问令牌')
        return
      }
    } else {
      // JSON导入模式
      if (!uploadJsonText.value.trim()) {
        ElMessage.warning('请输入JSON数据')
        return
      }

      try {
        const jsonData = JSON.parse(uploadJsonText.value)
        tokensToUpload = Array.isArray(jsonData) ? jsonData : [jsonData]
      } catch (error) {
        ElMessage.error('JSON格式错误，请检查格式')
        return
      }
    }

    isUploading.value = true

    // 批量上传令牌到池子
    const result = await tokenPoolService.uploadTokens(tokensToUpload)

    const { uploaded, failed, errors } = result.data

    // 显示结果
    if (uploaded > 0) {
      ElMessage.success(`成功上传 ${uploaded} 个令牌${failed > 0 ? `，失败 ${failed} 个` : ''}`)
      showUploadDialog.value = false

      // 重置表单
      uploadMode.value = 'manual'
      uploadTokens.value = [{
        access_token: '',
        tenant_url: '',
        portal_url: '',
        email_note: ''
      }]
      uploadJsonText.value = ''

      // 刷新池子数据和统计信息
      await refreshPool()
    } else {
      ElMessage.error(`所有令牌上传失败${errors.length > 0 ? `：${errors[0]}` : ''}`)
    }
  } catch (error) {
    // 批量上传失败细节已通过UI反馈处理
    ElMessage.error(error.response?.data?.message || error.message || '上传失败')
  } finally {
    isUploading.value = false
  }
}

// 上传单个令牌到令牌池（转移所有权）
const uploadTokenToPool = async (token) => {
  try {
    // 设置loading状态
    token._uploading = true

    // 详细确认操作
    await ElMessageBox.confirm(
      `确定要将令牌转移到公共池吗？

⚠️ 重要提醒：
• 转移后您将失去该令牌的所有权
• 其他用户可以立即领取此令牌
• 此操作无法撤销
• 令牌将从您的个人列表中移除

令牌信息：${token.email_note || token.emailNote || '未命名'}`,
      '确认转移令牌',
      {
        type: 'warning',
        confirmButtonText: '确定转移',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: true
      }
    )

    // 准备上传数据
    const uploadData = {
      access_token: token.access_token || token.accessToken,
      tenant_url: token.tenant_url || token.tenantUrl,
      portal_url: token.portal_url || token.portalUrl || '',
      email_note: token.email_note || token.emailNote || '',
      transfer_mode: true // 标记为转移模式
    }

    // 调用转移API
    const response = await tokenPoolService.transferTokenToPool(token.id, uploadData)

    if (response.success) {
      ElMessage.success('令牌已转移到池子，已从您的个人列表中移除')
      // 刷新个人令牌列表和令牌池数据
      await loadTokensOnly()
      await refreshPool()
    } else {
      throw new Error(response.message || '转移失败')
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      // 转移令牌到池子失败已通过UI反馈处理
      ElMessage.error(`转移失败: ${error.message}`)
    }
  } finally {
    token._uploading = false
  }
}

// 处理编辑器切换
const handleEditorSwitch = async (token, command) => {
  if (command === 'copy') {
    try {
      await copyTokenInfo(token)
    } catch (error) {
      // 复制令牌失败已通过UI反馈处理
    }
  } else {
    try {
      await switchToEditor(token, command)
    } catch (error) {
      // 编辑器切换失败已通过UI反馈处理
    }
  }
}

// 编辑令牌
const editToken = (token) => {
  editingToken.value = { ...token }
  showEditDialog.value = true
}

// 导出单个令牌
const exportToken = (token) => {
  try {
    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = [{
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }]

    downloadTokensAsJson(exportData, `augment-token-${token.email_note || token.id}.json`)
    ElMessage.success('令牌导出成功')
  } catch (error) {
    ElMessage.error('导出令牌失败')
  }
}

// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedTokens.value = selection
}

// 处理导出命令
const handleExportCommand = (command) => {
  if (command === 'all') {
    exportAllTokens()
  } else if (command === 'selected') {
    exportSelectedTokens()
  }
}

// 批量导出所有令牌
const exportAllTokens = () => {
  try {
    if (tokens.value.length === 0) {
      ElMessage.warning('没有可导出的令牌')
      return
    }

    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = tokens.value.map(token => ({
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }))

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    downloadTokensAsJson(exportData, `augment-tokens-batch-${timestamp}.json`)
    ElMessage.success(`成功导出 ${tokens.value.length} 个令牌`)
  } catch (error) {
    ElMessage.error('批量导出失败')
  }
}

// 导出选中的令牌
const exportSelectedTokens = () => {
  try {
    if (selectedTokens.value.length === 0) {
      ElMessage.warning('请先选择要导出的令牌')
      return
    }

    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = selectedTokens.value.map(token => ({
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }))

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    downloadTokensAsJson(exportData, `augment-tokens-selected-${timestamp}.json`)
    ElMessage.success(`成功导出 ${selectedTokens.value.length} 个选中令牌`)

    // 清空选择
    if (tokenTable.value) {
      tokenTable.value.clearSelection()
    }
  } catch (error) {
    ElMessage.error('导出选中令牌失败')
  }
}

// 通用下载函数
const downloadTokensAsJson = (data, filename) => {
  const dataStr = JSON.stringify(data, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)

  // 创建下载链接并触发下载
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 处理编辑保存
const handleEditSave = async (updatedToken) => {
  try {
    // 准备更新数据
    const updateData = {
      tenant_url: updatedToken.tenant_url,
      access_token: updatedToken.access_token,
      portal_url: updatedToken.portal_url,
      email_note: updatedToken.email_note
    }

    // 调用更新API
    await updateTokenApi(updatedToken.id, updateData)

    // 更新本地数据
    const index = tokens.value.findIndex(t => t.id === updatedToken.id)
    if (index !== -1) {
      tokens.value.splice(index, 1, {
        ...tokens.value[index],
        ...updateData,
        updated_at: new Date().toISOString()
      })
    }

    showEditDialog.value = false
    editingToken.value = null
    ElMessage.success('令牌更新成功')
  } catch (error) {
    ElMessage.error(`更新令牌失败: ${error.message}`)
  }
}

// 处理导入成功
const handleImportSuccess = async (result) => {
  // 构建结果消息
  const messages = []
  if (result.imported > 0) {
    messages.push(`成功导入 ${result.imported} 个`)
  }
  if (result.duplicated > 0) {
    messages.push(`跳过重复 ${result.duplicated} 个`)
  }
  if (result.failed > 0) {
    messages.push(`失败 ${result.failed} 个`)
  }

  if (messages.length > 0) {
    ElMessage.success(`导入完成：${messages.join('，')}`)
  }

  // 刷新令牌列表
  if (result.imported > 0) {
    await refreshTokens()
  }

  // 关闭对话框
  showImportDialog.value = false
}

// 刷新令牌池中单个令牌的Portal信息
const refreshTokenPortalInfo = async (token) => {
  token._refreshing = true
  try {
    // 调用后端API刷新Portal信息
    const response = await tokenPoolService.refreshTokenInfo(token._id || token.id)

    // 更新本地数据 - 与已保存令牌的刷新逻辑一致
    const updatedToken = response.data || response
    if (updatedToken) {

      // 更新令牌状态、剩余次数、过期时间等数据
      const newTokenData = {
        ...token,
        status: updatedToken.status,
        creditsBalance: updatedToken.creditsBalance,
        expiryDate: updatedToken.expiryDate,
        portalInfo: updatedToken.portalInfo,
        lastRefreshed: updatedToken.lastRefreshed || new Date(),
        _refreshing: false
      }

      // 如果令牌状态变为无效，从可用列表中移除
      if (updatedToken.status === 'invalid' || updatedToken.status === 'expired') {
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1)
        }
        const uploadIndex = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (uploadIndex !== -1) {
          myUploads.value.splice(uploadIndex, 1, newTokenData)
        }
      } else {
        // 强制更新Vue的响应式系统
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1, newTokenData)
        }

        const uploadIndex = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (uploadIndex !== -1) {
          myUploads.value.splice(uploadIndex, 1, newTokenData)
        }
      }
    }

    ElMessage.success('Portal信息刷新成功')
  } catch (error) {
    // 刷新Portal信息失败细节已通过UI反馈处理
    ElMessage.error(error.message || '刷新Portal信息失败')
  } finally {
    token._refreshing = false
  }
}

// ========== 新增的分离式刷新方法 ==========

// 批量刷新令牌池基础信息
const batchRefreshPoolInfo = async () => {
  if (poolTokens.value.length === 0) {
    ElMessage.warning('没有可刷新的令牌池令牌')
    return
  }

  isRefreshingPoolInfo.value = true
  try {
    const list = [...poolTokens.value]
    startBatchProgress('批量基础信息刷新', list.length)
    for (const t of list) {
      try {
        const resp = await tokenPoolService.refreshTokenInfo(t._id || t.id)
        const updated = resp.data || resp
        if (updated) {
          const newData = {
            ...t,
            portalInfo: updated.portalInfo,
            creditsBalance: updated.creditsBalance,
            expiryDate: updated.expiryDate,
            lastRefreshed: updated.lastRefreshed || new Date(),
            _refreshingInfo: false
          }
          const poolIdx = poolTokens.value.findIndex(x => (x._id || x.id) === (t._id || t.id))
          if (poolIdx !== -1) poolTokens.value.splice(poolIdx, 1, newData)
          const upIdx = myUploads.value.findIndex(x => (x._id || x.id) === (t._id || t.id))
          if (upIdx !== -1) myUploads.value.splice(upIdx, 1, newData)
        }
      } catch { }
      incBatchProgress()
    }
    ElMessage.success('令牌池基础信息刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshingPoolInfo.value = false
    finishBatchProgress()
  }
}

// 批量刷新令牌池状态
const batchRefreshPoolStatus = async () => {
  if (poolTokens.value.length === 0) {
    ElMessage.warning('没有可刷新的令牌池令牌')
    return
  }

  isRefreshingPoolStatus.value = true
  try {
    const list = [...poolTokens.value]
    startBatchProgress('批量令牌状态刷新', list.length)
    for (const t of list) {
      try {
        const resp = await tokenPoolService.refreshTokenStatus(t._id || t.id)
        const updatedData = resp.data || resp
        if (updatedData && updatedData.token) {
          const newBan = updatedData.ban_status || updatedData.token.ban_status || {
            isBanned: updatedData.is_banned,
            status: updatedData.status,
            errorMessage: updatedData.error_message,
            responseCode: updatedData.response_code,
            lastChecked: new Date()
          }
          const newData = {
            ...t,
            status: updatedData.token.status,
            ban_status: newBan,
            lastRefreshed: updatedData.token.lastRefreshed || new Date(),
            _refreshingStatus: false
          }
          const poolIdx = poolTokens.value.findIndex(x => (x._id || x.id) === (t._id || t.id))
          if (poolIdx !== -1) poolTokens.value.splice(poolIdx, 1, newData)
          const upIdx = myUploads.value.findIndex(x => (x._id || x.id) === (t._id || t.id))
          if (upIdx !== -1) myUploads.value.splice(upIdx, 1, newData)
        }
      } catch { }
      incBatchProgress()
    }
    ElMessage.success('令牌池状态刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshingPoolStatus.value = false
    finishBatchProgress()
  }
}

// 批量刷新已保存令牌基础信息
const batchRefreshTokensInfo = async () => {
  if (tokens.value.length === 0) {
    ElMessage.warning('没有可刷新的已保存令牌')
    return
  }

  isRefreshingTokensInfo.value = true
  try {
    const tokenIds = tokens.value.map(token => token.id)
    const refreshResults = await batchRefreshTokenInfoApi(tokenIds)

    // 更新本地令牌数据
    refreshResults.forEach(result => {
      if (result.success) {
        const index = tokens.value.findIndex(t => t.id === result.tokenId)
        if (index !== -1) {
          tokens.value.splice(index, 1, {
            ...tokens.value[index],
            portal_info: JSON.stringify(result.data.portal_info),
            usage_stats: result.data.usage_stats
          })
        }
      }
    })

    ElMessage.success('已保存令牌基础信息刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshingTokensInfo.value = false
  }
}

// 批量刷新已保存令牌状态
const batchRefreshTokensStatus = async () => {
  if (tokens.value.length === 0) {
    ElMessage.warning('没有可刷新的已保存令牌')
    return
  }

  isRefreshingTokensStatus.value = true
  try {
    const tokenIds = tokens.value.map(token => token.id)
    const refreshResults = await batchRefreshTokenStatusApi(tokenIds)

    // 更新本地令牌状态
    refreshResults.forEach(result => {
      if (result.success) {
        const index = tokens.value.findIndex(t => t.id === result.tokenId)
        if (index !== -1) {
          const newBan = (result.data && result.data.ban_status) || {
            isBanned: result.data?.is_banned,
            status: result.data?.status,
            lastChecked: new Date(),
            errorMessage: result.data?.error_message,
            responseCode: result.data?.response_code
          }
          tokens.value[index].ban_status = newBan
        }
      }
    })

    ElMessage.success('已保存令牌状态刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshingTokensStatus.value = false
  }
}

// 单个令牌池令牌基础信息刷新
const refreshTokenInfo = async (token) => {
  token._refreshingInfo = true
  try {
    const idx = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
    if (idx !== -1) poolTokens.value[idx]._refreshingInfo = true
  } catch { }

  try {
    // 调用令牌池的基础信息刷新API
    const response = await tokenPoolService.refreshTokenInfo(token._id || token.id)

    // 更新本地数据
    const updatedToken = response.data || response
    if (updatedToken) {
      const newTokenData = {
        ...token,
        portalInfo: updatedToken.portalInfo,
        creditsBalance: updatedToken.creditsBalance,
        expiryDate: updatedToken.expiryDate,
        lastRefreshed: updatedToken.lastRefreshed || new Date(),
        _refreshingInfo: false
      }

      // 更新池子数据
      const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (poolIndex !== -1) {
        poolTokens.value.splice(poolIndex, 1, newTokenData)
      }
      // 同步更新“我的上传”表
      const uploadIndexSync = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (uploadIndexSync !== -1) {
        myUploads.value.splice(uploadIndexSync, 1, newTokenData)
      }
    }

    ElMessage.success('基础信息刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    token._refreshingInfo = false
    try {
      const idx2 = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (idx2 !== -1) poolTokens.value[idx2]._refreshingInfo = false
    } catch { }
  }
}

// 单个令牌池令牌状态刷新
const refreshTokenStatus = async (token) => {
  token._refreshingStatus = true
  try {
    const idx = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
    if (idx !== -1) poolTokens.value[idx]._refreshingStatus = true
  } catch { }

  try {
    // 调用令牌池的状态验证API
    const response = await tokenPoolService.refreshTokenStatus(token._id || token.id)

    // 更新本地数据
    const updatedData = response.data || response
    if (updatedData && updatedData.token) {
      // 兼容从接口返回的封禁状态
      const newBan = updatedData.ban_status || updatedData.token.ban_status || {
        isBanned: updatedData.is_banned,
        status: updatedData.status,
        errorMessage: updatedData.error_message,
        responseCode: updatedData.response_code,
        lastChecked: new Date()
      }

      const newTokenData = {
        ...token,
        status: updatedData.token.status,
        lastRefreshed: updatedData.token.lastRefreshed || new Date(),
        ban_status: newBan,
        _refreshingStatus: false
      }

      // 如果令牌状态变为无效，从可用列表中移除
      if (updatedData.token.status === 'invalid') {
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1)
        }
        ElMessage.warning('令牌已失效，已从可用列表中移除')
      } else {
        // 更新池子数据
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1, newTokenData)
        }
        // 同步更新“我的上传”表
        const uploadIndexSync = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (uploadIndexSync !== -1) {
          myUploads.value.splice(uploadIndexSync, 1, newTokenData)
        }
        ElMessage.success('令牌状态刷新成功')
      }
    }
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    token._refreshingStatus = false
    try {
      const idx2 = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (idx2 !== -1) poolTokens.value[idx2]._refreshingStatus = false
    } catch { }
  }
}

// 单个已保存令牌基础信息刷新
const refreshSavedTokenInfo = async (token) => {
  token._refreshingInfo = true
  try {
    const idx = tokens.value.findIndex(t => t.id === token.id)
    if (idx !== -1) tokens.value[idx]._refreshingInfo = true
  } catch { }

  try {
    const result = await refreshTokenInfoApi(token.id)

    // 更新本地数据
    const index = tokens.value.findIndex(t => t.id === token.id)
    if (index !== -1) {
      tokens.value.splice(index, 1, {
        ...tokens.value[index],
        portal_info: JSON.stringify(result.portal_info),
        usage_stats: result.usage_stats,
        _refreshingInfo: false
      })
    }

    ElMessage.success('基础信息刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    token._refreshingInfo = false
    try {
      const idx2 = tokens.value.findIndex(t => t.id === token.id)
      if (idx2 !== -1) tokens.value[idx2]._refreshingInfo = false
    } catch { }
  }
}

// 单个已保存令牌状态刷新
const refreshSavedTokenStatus = async (token) => {
  token._refreshingStatus = true
  try {
    const idx = tokens.value.findIndex(t => t.id === token.id)
    if (idx !== -1) tokens.value[idx]._refreshingStatus = true
  } catch { }

  try {
    const result = await refreshTokenStatusApi(token.id)

    // 更新本地状态
    const index = tokens.value.findIndex(t => t.id === token.id)
    if (index !== -1) {
      const newBan = result.ban_status || {
        isBanned: result.is_banned,
        status: result.status,
        lastChecked: new Date(),
        errorMessage: result.error_message,
        responseCode: result.response_code
      }
      tokens.value[index].ban_status = newBan
    }

    ElMessage.success('令牌状态刷新成功')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    token._refreshingStatus = false
    try {
      const idx2 = tokens.value.findIndex(t => t.id === token.id)
      if (idx2 !== -1) tokens.value[idx2]._refreshingStatus = false
    } catch { }
  }
}
// 我的上传 - 单个令牌基础信息刷新（更新 myUploads 表，必要时同步 pool 表）
const refreshUploadInfo = async (token) => {
  token._refreshingInfo = true
  try {
    const idx = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
    if (idx !== -1) myUploads.value[idx]._refreshingInfo = true
  } catch { }

  try {
    const response = await tokenPoolService.refreshTokenInfo(token._id || token.id)
    const updated = response.data || response
    if (updated) {
      const newData = {
        ...token,
        portalInfo: updated.portalInfo,
        creditsBalance: updated.creditsBalance,
        expiryDate: updated.expiryDate,
        lastRefreshed: updated.lastRefreshed || new Date(),
        _refreshingInfo: false
      }
      const upIdx = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (upIdx !== -1) myUploads.value.splice(upIdx, 1, newData)
      const poolIdx = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (poolIdx !== -1) poolTokens.value.splice(poolIdx, 1, newData)
    }
    ElMessage.success('基础信息刷新成功')
  } catch (error) {
    ElMessage.error(error.message || '刷新失败')
  } finally {
    token._refreshingInfo = false
    try {
      const idx2 = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (idx2 !== -1) myUploads.value[idx2]._refreshingInfo = false
    } catch { }
  }
}

// 我的上传 - 单个令牌状态刷新（更新 myUploads 表，必要时同步 pool 表）
const refreshUploadStatus = async (token) => {
  token._refreshingStatus = true
  try {
    const idx = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
    if (idx !== -1) myUploads.value[idx]._refreshingStatus = true
  } catch { }

  try {
    const response = await tokenPoolService.refreshTokenStatus(token._id || token.id)
    const updatedData = response.data || response
    if (updatedData && updatedData.token) {
      const newBan = updatedData.ban_status || updatedData.token.ban_status || {
        isBanned: updatedData.is_banned,
        status: updatedData.status,
        errorMessage: updatedData.error_message,
        responseCode: updatedData.response_code,
        lastChecked: new Date()
      }
      const newData = {
        ...token,
        status: updatedData.token.status,
        ban_status: newBan,
        lastRefreshed: updatedData.token.lastRefreshed || new Date(),
        _refreshingStatus: false
      }
      const upIdx = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (upIdx !== -1) myUploads.value.splice(upIdx, 1, newData)
      const poolIdx = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (poolIdx !== -1) poolTokens.value.splice(poolIdx, 1, newData)
      ElMessage.success('令牌状态刷新成功')
    }
  } catch (error) {
    ElMessage.error(error.message || '刷新失败')
  } finally {
    token._refreshingStatus = false
    try {
      const idx2 = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (idx2 !== -1) myUploads.value[idx2]._refreshingStatus = false
    } catch { }
  }
}


// 生命周期 - 页面加载时仅获取数据库中的令牌数据，不主动刷新Portal信息
onMounted(() => {

  // 仅加载数据库中存储的令牌数据（包括已保存的Portal信息）
  loadTokensOnly()
  // 加载令牌池数据
  refreshPool()
})
</script>

<style scoped>
.augment-token-manager {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

/* 全局背景渐变 */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
}

.page-header {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 页面头部样式 */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.title-section {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: white;
}

.title-icon {
  font-size: 2rem;
  color: #fbbf24;
}

.page-description {
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 16px;
}

.compact-stat-card {
  height: 70px;
}

.compact-stat-card .el-card__body {
  padding: 10px 14px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-stat-card .stat-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-content {
  text-align: center;
  padding: 4px;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0;
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: #000000;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

/* 标签页 */
.pool-tabs {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 卡片样式 */
.tokens-card,
.generator-card,
.pool-card,
.uploads-card {
  margin-bottom: 32px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  min-height: 40px;
}

.card-title-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.card-subtitle-inline {
  color: #6b7280;
  font-size: 14px;
  font-weight: normal;
  margin-left: auto;
  white-space: nowrap;
}

.card-title-compact h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.uploader-info,
.upload-time,
.expiry-time {
  font-size: 13px;
  line-height: 1.4;
}

.uploader-icon {
  font-size: 14px;
  margin-right: 4px;
}

.action-buttons .el-button {
  margin: 0 2px;
  padding: 4px 8px;
  font-size: 12px;
}

.compact-header {
  padding: 12px 0;
}

.compact-card .el-card__header {
  padding: 12px 20px;
}

.compact-card .el-card__body {
  padding: 12px 20px;
}



.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-header-with-actions .card-title {
  flex: 1;
}

.card-header-with-actions .card-actions {
  margin-top: 0;
  flex-shrink: 0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.card-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #000000;
}

.card-icon {
  font-size: 1.5rem;
  color: #3b82f6;
}

.card-subtitle {
  color: #000000;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 表格样式 */
.tokens-table-container {
  overflow-x: auto;
  border-radius: 10px;
  overflow: hidden;
}

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table__header-wrapper) .el-checkbox {
  transform: scale(1.1);
}

:deep(.el-table__body-wrapper) .el-checkbox {
  transform: scale(1.1);
}

:deep(.el-table .el-table__cell) {
  border-bottom: 1px solid #f1f5f9;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: rgba(248, 250, 252, 0.5);
}

:deep(.el-table__body tr:hover > td) {
  background-color: rgba(224, 242, 254, 0.6) !important;
}

/* 表格内容样式 */
.email-note {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.email-icon {
  color: #3b82f6;
  font-size: 16px;
}

.time-info,
.expiry-info,
.credits-info,
.status-info {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 过期时间样式 */
.expiry-normal {
  color: #059669;
  /* 绿色：其他时间 */
}

.expiry-warning {
  color: #f97316;
  /* 橙色：低于3天 */
}

.expiry-danger {
  color: #dc2626;
  /* 红色：低于1天 */
}

.expiry-expired {
  color: #dc2626;
  /* 红色：已过期 */
  font-weight: 600;
  text-decoration: line-through;
}

.expiry-unknown {
  color: #000000;
  /* 黑色：未知状态 */
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

/* 编辑器下拉菜单样式 */
.editor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

/* 下拉菜单样式 */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item .el-icon) {
  font-size: 14px;
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: #f0f9ff;
}

.email-note {
  display: flex;
  align-items: center;
  gap: 6px;
}

.email-icon {
  color: var(--el-color-primary);
  font-size: 14px;
}

.portal-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.portal-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #000000;
}

.credits {
  color: var(--el-color-success);
}

.expiry {
  color: #000000;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
}

/* 时间和状态信息样式 */
.time-info {
  font-size: 12px;
  color: #000000;
}

.expiry-info {
  font-size: 12px;
}

.credits-info {
  text-align: center;
}

.status-info {
  text-align: center;
}

/* 编辑器下拉菜单样式 */
.editor-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #000000;
}

.title-section p {
  margin: 0;
  color: #000000;
  font-size: 16px;
}

.generator-card {
  margin-bottom: 24px;
}

.card-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.card-header span {
  color: #000000;
  font-size: 14px;
}

.step-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.step-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.step-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.step-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.url-section {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .augment-token-manager {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .title-section {
    text-align: center;
  }

  .title-section h1 {
    font-size: 24px;
  }
}

/* 步骤区域样式 */
.step-section {
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.step-icon {
  font-size: 1.5rem;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 50%;
}

.step-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #000000;
}

/* URL区域样式 */
.url-section {
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #000000;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 按钮样式优化 */
:deep(.el-button) {
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 标签样式优化 */
:deep(.el-tag) {
  font-weight: 500;
  border: none;
  font-size: 12px;
}

/* 令牌池表格样式 */
.pool-table-container,
.uploads-table-container {
  border-radius: 12px;
  overflow: hidden;
}

.uploader-info {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.uploader-icon {
  color: #3b82f6;
  font-size: 16px;
}

.email-note {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.email-icon {
  color: #3b82f6;
  font-size: 16px;
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.expiry-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.credits-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.claimed-info {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.claimed-icon {
  color: #10b981;
  font-size: 16px;
}

.upload-time,
.expiry-time {
  font-size: 12px;
  color: #000000;
}

.not-claimed {
  color: #6b7280;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.compact-actions {
  gap: 4px;
}

.compact-actions .el-button {
  width: 28px;
  height: 28px;
  padding: 0;
  min-width: 28px;
}

.compact-actions .el-button.is-circle {
  border-radius: 50%;
}

/* 排序相关样式 */
.sortable-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.sortable-header:hover {
  color: #409eff;
}

.sort-icon {
  font-size: 12px;
  opacity: 0.6;
  transition: all 0.2s;
}

.sort-icon.sort-asc {
  opacity: 1;
  color: #409eff;
  transform: rotate(0deg);
}

.sort-icon.sort-desc {
  opacity: 1;
  color: #409eff;
  transform: rotate(180deg);
}

.credits-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.expiry-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 上传对话框样式 */
.upload-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.import-mode-selector {
  margin-bottom: 24px;
  text-align: center;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0 0 8px 0;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 600;
}

.section-header p {
  margin: 0;
  color: #000000;
  font-size: 0.9rem;
}

.token-inputs {
  margin-bottom: 20px;
}

.token-input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.row-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 60px;
}

.row-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
}

.token-fields {
  flex: 1;
}

.add-token-row {
  text-align: center;
  margin-top: 16px;
}

.json-example {
  margin-top: 16px;
}

.json-example-code {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  margin: 0;
  white-space: pre-wrap;
}

/* 批量操作工具栏样式 */
.batch-operations-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.selected-info {
  color: white;
  font-weight: 500;
  font-size: 14px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.batch-actions .el-button {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
}

.batch-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.batch-actions .el-button.is-danger {
  background: rgba(245, 101, 101, 0.2);
  border-color: rgba(245, 101, 101, 0.5);
}

.batch-actions .el-button.is-danger:hover {
  background: rgba(245, 101, 101, 0.3);
  border-color: rgba(245, 101, 101, 0.7);
}

/* 所属用户信息样式 */
.owner-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-icon {
  color: #6366f1;
  font-size: 16px;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.username {
  font-weight: 500;
  color: #374151;
  font-size: 13px;
}

.user-email {
  font-size: 11px;
  color: #6b7280;
}

/* 账号状态和令牌状态样式 */
.account-status,
.token-status {
  display: flex;
  justify-content: center;
}

/* 最后活跃时间样式 */
.last-active {
  display: flex;
  justify-content: center;
}

/* 进度条对话框样式 */
.progress-container {
  padding: 20px 0;
}

.progress-info {
  margin-top: 16px;
  text-align: center;
}

.progress-info p {
  margin: 8px 0;
  color: #666;
}

.error-list {
  margin-top: 16px;
  text-align: left;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
}

.error-list p {
  color: #dc2626;
  font-weight: 500;
  margin-bottom: 8px;
}

.error-list ul {
  margin: 0;
  padding-left: 20px;
}

.error-list li {
  color: #dc2626;
  font-size: 12px;
  margin: 4px 0;
}

/* 转移对话框样式 */
.transfer-dialog {
  padding: 20px 0;
}

.transfer-dialog p {
  margin-bottom: 20px;
  color: #666;
  text-align: center;
}

/* 修复对话框背景问题 */
:deep(.el-dialog__wrapper) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2000 !important;
}

/* ==================== 现代化样式 ==================== */

/* 现代化批量操作工具栏 */
.batch-operations-modern {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(240, 147, 251, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: slideInDown 0.3s ease-out;
}

.selected-info-modern {
  display: flex;
  align-items: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.selected-icon {
  margin-right: 8px;
  font-size: 16px;
}

.operation-buttons-modern {
  display: flex;
  gap: 8px;
}

.op-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
}

.op-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  background: rgba(255, 255, 255, 0.2) !important;
}

.refresh-btn:hover {
  background: rgba(34, 197, 94, 0.2) !important;
}

.transfer-btn:hover {
  background: rgba(59, 130, 246, 0.2) !important;
}

/* 刷新选项样式 */
.refresh-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.refresh-option-btn {
  width: 100%;
  justify-content: flex-start;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-size: 13px;
  text-align: left;
  margin: 0;
}

.refresh-option-btn:hover {
  background-color: var(--el-fill-color-light);
}

.reclaim-btn:hover {
  background: rgba(245, 158, 11, 0.2) !important;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2) !important;
}

/* 现代化表格容器 */
.all-tokens-table-container-modern {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(190, 53, 53, 0.1);
  background: white;
}

.modern-table {
  border-radius: 12px !important;
  overflow: hidden !important;
}



/* 现代化邮箱备注样式 */
.email-note-modern {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

/* 简化邮箱备注样式（无复制按钮） */
.email-note-simple {
  padding: 4px 0;
}

.email-text {
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.4;
  font-size: 13px;
  color: #374151;
  max-width: 100%;
}

.copy-btn {
  padding: 2px 8px !important;
  height: 22px !important;
  font-size: 11px !important;
  border-radius: 4px !important;
  background: #d1fae5 !important;
  color: #065f46 !important;
  border: 1px solid #a7f3d0 !important;
  transition: all 0.2s ease !important;
}

.copy-btn:hover {
  background: #a7f3d0 !important;
  color: #064e3b !important;
  transform: scale(1.05) !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2) !important;
}

/* 动画效果 */
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 表格行悬停效果 */
:deep(.el-table__row:hover) {
  background-color: #f8fafc !important;
  transform: scale(1.001);
  transition: all 0.2s ease;
}

/* 表格边框美化 */
:deep(.el-table) {
  border-radius: 12px !important;
}

:deep(.el-table__header) {
  border-radius: 12px 12px 0 0 !important;
}

/* 选择框美化 */
:deep(.el-checkbox) {
  transform: scale(1.1);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
  border-color: #f093fb !important;
}

/* 批量进度浮层样式 */
.batch-progress-float {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 3000;
}

.batch-progress-card {
  width: 280px;
}

.batch-progress-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #111827;
}
</style>