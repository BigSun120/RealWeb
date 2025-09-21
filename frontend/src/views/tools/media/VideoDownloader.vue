<template>
  <div class="video-downloader">
    <!-- 工具头部 -->
    <div class="tool-header">
      <div class="tool-info">
        <div class="tool-icon">🎬</div>
        <div class="tool-details">
          <h1>视频下载器</h1>
          <p>支持多平台视频下载，提供高质量的下载体验</p>
        </div>
      </div>
    </div>

    <!-- Tab导航 -->
    <div class="platform-tabs">
      <div class="tab-header">
        <div :class="['tab-item', { active: activeTab === 'bilibili' }]" @click="switchTab('bilibili')">
          <i class="fab fa-bilibili"></i>
          <span>Bilibili</span>
          <div class="tab-status">
            <span class="status-badge available">可用</span>
          </div>
        </div>
        <div :class="['tab-item', { active: activeTab === 'youtube', disabled: true }]" @click="switchTab('youtube')">
          <i class="fab fa-youtube"></i>
          <span>YouTube</span>
          <div class="tab-status">
            <span class="status-badge coming-soon">即将推出</span>
          </div>
        </div>
        <div :class="['tab-item', { active: activeTab === 'iqiyi' }]" @click="switchTab('iqiyi')">
          <i class="fas fa-video"></i>
          <span>爱奇艺</span>
          <div class="tab-status">
            <span class="status-badge available">可用</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab内容区域 -->
    <div class="tab-content">
      <!-- Bilibili Tab -->
      <div v-show="activeTab === 'bilibili'" class="tab-pane bilibili-pane">
        <div class="platform-intro">
          <h2>🎬 Bilibili视频下载</h2>
          <p>专业的Bilibili视频下载工具，支持多种格式和清晰度选择</p>
        </div>

        <!-- URL输入区域 -->
        <div class="url-input-section">
          <el-form @submit.prevent="parseVideo">
            <el-form-item>
              <el-input v-model="videoUrl" placeholder="请输入Bilibili视频链接 (如: https://www.bilibili.com/video/BV...)"
                size="large" clearable @keyup.enter="parseVideo">
                <template #prepend>
                  <span>🔗</span>
                </template>
                <template #append>
                  <el-button type="primary" @click="parseVideo" :loading="parsing" :disabled="!videoUrl.trim()">
                    {{ parsing ? '解析中...' : '解析视频' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <!-- 解析结果区域 -->
        <div v-if="videoInfo" class="video-info-section">
          <!-- 视频信息展示 -->
          <div class="video-preview">
            <div class="video-thumbnail" v-if="videoInfo.thumbnail">
              <img :src="videoInfo.thumbnail" :alt="videoInfo.title" />
            </div>
            <div class="video-details">
              <h2>{{ videoInfo.title }}</h2>
              <div class="video-meta">
                <span v-if="videoInfo.uploader">UP主: {{ videoInfo.uploader }}</span>
                <span v-if="videoInfo.duration">时长: {{ formatDuration(videoInfo.duration) }}</span>
                <span>平台: {{ getPlatformName(videoInfo.platform) }}</span>
              </div>
            </div>
          </div>

          <!-- 格式选择区域 -->
          <div class="format-selection">
            <!-- 视频格式 -->
            <div class="format-group">
              <h3>📹 视频格式</h3>
              <div class="format-table">
                <div class="table-header">
                  <span>选择</span>
                  <span>格式ID</span>
                  <span>分辨率</span>
                  <span>文件格式</span>
                  <span>码率</span>
                  <span>大小</span>
                  <span>说明</span>
                </div>
                <div v-for="video in videoInfo.available.videos" :key="video.id"
                  :class="['table-row', { selected: selectedVideo && selectedVideo.id === video.id }]"
                  @click="selectVideo(video)">
                  <span>
                    <el-radio v-model="selectedVideo" :value="video" @change="selectVideo(video)" />
                  </span>
                  <span class="format-id">{{ video.id }}</span>
                  <span class="resolution">{{ video.scale }}</span>
                  <span class="ext">{{ video.format }}</span>
                  <span class="rate">{{ video.rate }}</span>
                  <span class="size">{{ video.size }}MB</span>
                  <span class="note">{{ video.info }}</span>
                </div>
              </div>
            </div>

            <!-- 音频格式 -->
            <div class="format-group">
              <h3>🎵 音频格式</h3>
              <div class="format-table">
                <div class="table-header">
                  <span>选择</span>
                  <span>格式ID</span>
                  <span>质量</span>
                  <span>文件格式</span>
                  <span>大小</span>
                  <span>说明</span>
                </div>
                <div v-for="audio in videoInfo.available.audios" :key="audio.id"
                  :class="['table-row', { selected: selectedAudio && selectedAudio.id === audio.id }]"
                  @click="selectAudio(audio)">
                  <span>
                    <el-radio v-model="selectedAudio" :value="audio" @change="selectAudio(audio)" />
                  </span>
                  <span class="format-id">{{ audio.id }}</span>
                  <span class="quality">{{ audio.rate }}kbps</span>
                  <span class="ext">{{ audio.format }}</span>
                  <span class="size">{{ audio.size }}MB</span>
                  <span class="note">{{ audio.info }}</span>
                </div>
              </div>
            </div>

            <!-- 下载选项 -->
            <div class="download-options">
              <el-radio-group v-model="downloadType">
                <el-radio value="video">下载视频（包含音频）</el-radio>
                <el-radio value="audio">仅下载音频</el-radio>
                <el-radio value="combine">合并最佳音视频</el-radio>
              </el-radio-group>
            </div>

            <!-- 下载按钮 -->
            <div class="download-actions">
              <el-button type="primary" size="large" @click="downloadVideo" :loading="downloading"
                :disabled="!canDownload">
                <span v-if="!downloading">{{ getDownloadButtonText() }}</span>
                <span v-else>下载中...</span>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 使用说明 -->
        <div class="usage-tips">
          <h3>📖 使用说明</h3>
          <ul>
            <li><strong>支持平台：</strong>Bilibili (bilibili.com, b23.tv)</li>
            <li>
              <strong>解析功能：</strong>输入Bilibili视频链接后点击"解析视频"，系统会自动获取所有可用格式
            </li>
            <li><strong>格式选择：</strong>可查看视频分辨率、音频质量、文件大小等详细信息</li>
            <li><strong>推荐格式：</strong>系统会自动推荐最佳MP4格式，确保兼容性</li>
            <li><strong>下载选项：</strong>支持下载视频、仅音频或合并最佳音视频质量</li>
            <li><strong>文件保存：</strong>下载的文件会自动保存到浏览器默认下载目录</li>
            <li><strong>注意事项：</strong>请遵守Bilibili的使用条款，仅下载允许的内容</li>
          </ul>
        </div>

        <!-- 示例链接 -->
        <div class="example-links">
          <h3>🔗 示例链接</h3>
          <div class="example-list">
            <div class="example-item">
              <span class="platform">Bilibili:</span>
              <code @click="setExampleUrl('https://www.bilibili.com/video/BV1xx411c7mD')">
        https://www.bilibili.com/video/BV1xx411c7mD
      </code>
            </div>
            <div class="example-item">
              <span class="platform">Bilibili:</span>
              <code @click="setExampleUrl('https://www.bilibili.com/video/BV1ta411Q7Zu')">
        https://www.bilibili.com/video/BV1ta411Q7Zu
      </code>
            </div>
          </div>
        </div>
      </div>
      <!-- Bilibili Tab 结束 -->

      <!-- YouTube Tab -->
      <div v-show="activeTab === 'youtube'" class="tab-pane youtube-pane">
        <div class="platform-intro">
          <h2>🎥 YouTube视频下载</h2>
          <p>高质量YouTube视频下载，支持多种格式和清晰度选择</p>
        </div>

        <!-- YouTube URL输入区域 -->
        <div class="url-input-section">
          <div class="input-group">
            <el-input v-model="youtubeUrl" size="large"
              placeholder="请输入YouTube视频链接 (如: https://www.youtube.com/watch?v=...)" clearable
              @keyup.enter="handleParseYouTubeVideo">
              <template #prepend>
                <i class="fab fa-youtube"></i>
              </template>
            </el-input>
            <el-button type="primary" size="large" :loading="youtubeLoading" @click="handleParseYouTubeVideo"
              :disabled="!youtubeUrl.trim()">
              {{ youtubeLoading ? '解析中...' : '解析视频' }}
            </el-button>
          </div>
        </div>

        <!-- YouTube视频信息显示 -->
        <div v-if="youtubeVideoInfo" class="video-info-card">
          <div class="video-header">
            <div class="video-thumbnail">
              <img :src="youtubeVideoInfo.thumbnail" :alt="youtubeVideoInfo.title" />
              <div class="video-duration">{{ formatDuration(youtubeVideoInfo.duration) }}</div>
            </div>
            <div class="video-details">
              <h3>{{ youtubeVideoInfo.title }}</h3>
              <div class="video-meta">
                <span class="uploader">
                  <i class="fas fa-user"></i>
                  {{ youtubeVideoInfo.uploader }}
                </span>
                <span class="views" v-if="youtubeVideoInfo.views">
                  <i class="fas fa-eye"></i>
                  {{ formatViews(youtubeVideoInfo.views) }}
                </span>
                <span class="platform">
                  <i class="fab fa-youtube"></i>
                  YouTube
                </span>
              </div>
              <p class="description" v-if="youtubeVideoInfo.description">
                {{ youtubeVideoInfo.description.substring(0, 200) }}...
              </p>
            </div>
          </div>

          <!-- YouTube格式选择区域 -->
          <div class="format-selection">
            <!-- 推荐格式 -->
            <div v-if="
              youtubeVideoInfo.available.recommended &&
              youtubeVideoInfo.available.recommended.length > 0
            " class="format-group">
              <h3>⭐ 推荐格式</h3>
              <div class="recommended-formats">
                <div v-for="rec in youtubeVideoInfo.available.recommended" :key="rec.id" :class="[
                  'recommended-item',
                  { selected: selectedYouTubeRecommended && selectedYouTubeRecommended.id === rec.id }
                ]" @click="selectYouTubeRecommended(rec)">
                  <div class="rec-header">
                    <el-radio v-model="selectedYouTubeRecommended" :value="rec"
                      @change="selectYouTubeRecommended(rec)" />
                    <span class="rec-name">{{ rec.name }}</span>
                  </div>
                  <div class="rec-description">{{ rec.description }}</div>
                </div>
              </div>
            </div>

            <!-- Progressive格式 -->
            <div v-if="
              youtubeVideoInfo.available.progressive &&
              youtubeVideoInfo.available.progressive.length > 0
            " class="format-group">
              <h3>📹 视频格式（音视频合并）</h3>
              <div class="format-list">
                <div v-for="video in youtubeVideoInfo.available.progressive" :key="video.itag"
                  :class="['format-item', { selected: selectedYouTubeVideo && selectedYouTubeVideo.itag === video.itag }]"
                  @click="selectYouTubeVideo(video)">
                  <el-radio v-model="selectedYouTubeVideo" :value="video" @change="selectYouTubeVideo(video)" />
                  <div class="format-info">
                    <div class="format-quality">{{ video.resolution || 'Unknown' }}</div>
                    <div class="format-details">
                      <span>{{ video.subtype && video.subtype.toUpperCase() || 'UNKNOWN' }}</span>
                      <span v-if="video.filesize_mb">{{ video.filesize_mb }}MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 音频格式 -->
            <div v-if="
              youtubeVideoInfo.available.audio_only &&
              youtubeVideoInfo.available.audio_only.length > 0
            " class="format-group">
              <h3>🎵 音频格式</h3>
              <div class="format-list">
                <div v-for="audio in youtubeVideoInfo.available.audio_only" :key="audio.itag"
                  :class="['format-item', { selected: selectedYouTubeAudio && selectedYouTubeAudio.itag === audio.itag }]"
                  @click="selectYouTubeAudio(audio)">
                  <el-radio v-model="selectedYouTubeAudio" :value="audio" @change="selectYouTubeAudio(audio)" />
                  <div class="format-info">
                    <div class="format-quality">{{ audio.abr || 'Unknown' }}</div>
                    <div class="format-details">
                      <span>{{ audio.subtype && audio.subtype.toUpperCase() || 'UNKNOWN' }}</span>
                      <span v-if="audio.filesize_mb">{{ audio.filesize_mb }}MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- YouTube下载按钮 -->
          <div class="download-section">
            <el-button type="primary" size="large" :loading="youtubeDownloading" @click="handleDownloadYouTubeVideo"
              :disabled="!canDownloadYouTube" class="download-btn">
              <i class="fas fa-download"></i>
              {{ getYouTubeDownloadButtonText() }}
            </el-button>
          </div>
        </div>

        <!-- YouTube Cookies管理 -->
        <div v-if="!youtubeVideoInfo" class="cookies-management">
          <h3>🍪 Cookies管理</h3>
          <div class="cookies-status">
            <div class="status-info">
              <div v-if="cookiesStatus.exists" class="status-item success">
                <i class="fas fa-check-circle"></i>
                <span>Cookies已配置</span>
                <small>{{ cookiesStatus.cookieCount }} 个cookies，最后更新：{{
                  formatDate(cookiesStatus.modified)
                }}</small>
              </div>
              <div v-else class="status-item warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>未配置Cookies</span>
                <small>YouTube可能限制访问，建议配置cookies以提高成功率</small>
              </div>
            </div>

            <div class="cookies-actions">
              <el-button type="primary" size="small" @click="showCookiesDialog = true">
                <i class="fas fa-cog"></i>
                管理Cookies
              </el-button>
              <el-button type="info" size="small" @click="checkCookiesStatus" :loading="checkingCookies">
                <i class="fas fa-refresh"></i>
                刷新状态
              </el-button>
            </div>
          </div>
        </div>

        <!-- YouTube使用说明 -->
        <div v-if="!youtubeVideoInfo" class="usage-tips">
          <h3>📖 使用说明</h3>
          <ul>
            <li><strong>支持平台：</strong>YouTube (youtube.com, youtu.be)</li>
            <li><strong>解析功能：</strong>输入YouTube视频链接后点击"解析视频"</li>
            <li><strong>格式选择：</strong>支持Progressive（音视频合并）和分离的音频格式</li>
            <li><strong>推荐格式：</strong>系统会自动推荐最佳格式</li>
            <li><strong>下载选项：</strong>支持不同清晰度和音质的选择</li>
            <li><strong>Cookies配置：</strong>如遇访问限制，请配置浏览器cookies</li>
            <li><strong>注意事项：</strong>请遵守YouTube的使用条款，仅下载允许的内容</li>
          </ul>
        </div>

        <!-- YouTube示例链接 -->
        <div v-if="!youtubeVideoInfo" class="example-links">
          <h3>🔗 示例链接</h3>
          <div class="example-list">
            <div class="example-item">
              <span class="platform">YouTube:</span>
              <code @click="setYouTubeExampleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')">
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </code>
            </div>
            <div class="example-item">
              <span class="platform">YouTube:</span>
              <code @click="setYouTubeExampleUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw')">
          https://www.youtube.com/watch?v=jNQXAC9IVRw
        </code>
            </div>
          </div>
        </div>
      </div>
      <!-- YouTube Tab 结束 -->

      <!-- 爱奇艺 Tab -->
      <div v-show="activeTab === 'iqiyi'" class="tab-pane iqiyi-pane">
        <!-- URL输入区域 -->
        <div class="url-input-section">
          <el-form @submit.prevent="handleParseIqiyiVideo">
            <el-form-item>
              <el-input v-model="iqiyiUrl" placeholder="请输入爱奇艺视频链接 (如: https://www.iqiyi.com/v_...)" size="large"
                clearable @keyup.enter="handleParseIqiyiVideo">
                <template #prepend>
                  <span>🔗</span>
                </template>
                <template #append>
                  <el-button type="primary" @click="handleParseIqiyiVideo" :loading="iqiyiLoading"
                    :disabled="!iqiyiUrl.trim()">
                    {{ iqiyiLoading ? '解析中...' : '解析视频' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <!-- 爱奇艺解析结果或帮助信息 -->
        <div v-if="!iqiyiVideoInfo" class="help-content">
          <!-- 快速示例 -->
          <div class="quick-examples">
            <h3>🔗 快速开始</h3>
            <div class="example-list">
              <div class="example-item">
                <span class="platform-tag iqiyi">爱奇艺</span>
                <div class="example-url">
                  <code @click="setIqiyiExampleUrl('https://www.iqiyi.com/v_195j9pmsbng.html')">
              https://www.iqiyi.com/v_195j9pmsbng.html
            </code>
                  <span class="example-desc">点击试试</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 功能特色 -->
          <div class="platform-features">
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">🎬</div>
                <h4>高清视频</h4>
                <p>支持多种清晰度选择</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h4>快速解析</h4>
                <p>智能解析视频链接</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h4>安全可靠</h4>
                <p>确保下载过程安全</p>
              </div>
            </div>
          </div>

          <!-- 使用说明 -->
          <div class="usage-tips">
            <h3>📖 使用说明</h3>
            <div class="tips-grid">
              <div class="tip-item">
                <div class="tip-number">1</div>
                <div class="tip-content">
                  <h4>复制视频链接</h4>
                  <p>在爱奇艺网站复制视频链接地址</p>
                </div>
              </div>
              <div class="tip-item">
                <div class="tip-number">2</div>
                <div class="tip-content">
                  <h4>粘贴并解析</h4>
                  <p>粘贴到输入框，点击"解析视频"</p>
                </div>
              </div>
              <div class="tip-item">
                <div class="tip-number">3</div>
                <div class="tip-content">
                  <h4>选择格式下载</h4>
                  <p>选择合适的格式和清晰度</p>
                </div>
              </div>
            </div>

            <div class="usage-notes">
              <h4>⚠️ 注意事项</h4>
              <ul>
                <li>支持爱奇艺 (iqiyi.com) 平台的视频链接</li>
                <li>部分VIP视频可能需要会员权限</li>
                <li>请遵守爱奇艺的使用条款</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 爱奇艺视频信息显示 -->
        <div v-if="iqiyiVideoInfo" class="video-info-card">
          <div class="video-header">
            <div class="video-thumbnail">
              <img :src="iqiyiVideoInfo.thumbnail || '/placeholder-video.jpg'" :alt="iqiyiVideoInfo.title" />
            </div>
            <div class="video-details">
              <h3>{{ iqiyiVideoInfo.title }}</h3>
              <div class="video-meta">
                <span><i class="fas fa-user"></i> {{ iqiyiVideoInfo.uploader }}</span>
                <span><i class="fas fa-clock"></i> {{ formatDuration(iqiyiVideoInfo.duration) }}</span>
                <span><i class="fas fa-video"></i> 爱奇艺</span>
              </div>
              <p class="video-description">{{ iqiyiVideoInfo.description }}</p>
            </div>
          </div>

          <!-- 下载选项 -->
          <div class="download-section">
            <h4>📥 下载选项</h4>
            <div class="download-options">
              <el-button type="primary" size="large" @click="handleDownloadIqiyiVideo" :loading="iqiyiDownloading">
                <span v-if="!iqiyiDownloading">下载视频</span>
                <span v-else>下载中...</span>
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <!-- Tab内容区域结束 -->
    </div>
    <!-- Cookies管理对话框 -->
    <el-dialog v-model="showCookiesDialog" title="🍪 YouTube Cookies管理" width="80%" :close-on-click-modal="false">
      <div class="cookies-dialog">
        <div class="cookies-tabs">
          <el-tabs v-model="cookiesTab" type="card">
            <!-- 上传Cookies -->
            <el-tab-pane label="上传Cookies" name="upload">
              <div class="cookies-upload">
                <div class="upload-instructions">
                  <h4>📋 如何获取YouTube Cookies：</h4>
                  <ol>
                    <li>
                      <strong>方法1 - 浏览器扩展（推荐）：</strong>
                      <ul>
                        <li>安装"Get cookies.txt"扩展</li>
                        <li>登录YouTube后点击扩展图标</li>
                        <li>导出cookies.txt文件</li>
                      </ul>
                    </li>
                    <li>
                      <strong>方法2 - 开发者工具：</strong>
                      <ul>
                        <li>在YouTube页面按F12打开开发者工具</li>
                        <li>在Console中运行提取脚本</li>
                        <li>复制生成的cookies内容</li>
                      </ul>
                    </li>
                    <li>
                      <strong>方法3 - 自动提取：</strong>
                      <ul>
                        <li>关闭所有浏览器窗口</li>
                        <li>运行自动提取脚本</li>
                        <li>获取cookies.txt文件</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div class="upload-area">
                  <el-input v-model="cookiesContent" type="textarea" :rows="10" placeholder="请粘贴cookies.txt文件内容..."
                    class="cookies-textarea" />

                  <div class="upload-actions">
                    <el-button type="primary" @click="uploadCookies" :loading="uploadingCookies"
                      :disabled="!cookiesContent.trim()">
                      <i class="fas fa-upload"></i>
                      上传Cookies
                    </el-button>

                    <el-button @click="cookiesContent = ''">
                      <i class="fas fa-trash"></i>
                      清空
                    </el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <!-- 当前状态 -->
            <el-tab-pane label="当前状态" name="status">
              <div class="cookies-status-detail">
                <div v-if="cookiesStatus.exists" class="status-success">
                  <div class="status-header">
                    <i class="fas fa-check-circle"></i>
                    <h4>Cookies已配置</h4>
                  </div>

                  <div class="status-details">
                    <div class="detail-item">
                      <span class="label">Cookies数量：</span>
                      <span class="value">{{ cookiesStatus.cookieCount }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">文件大小：</span>
                      <span class="value">{{ formatFileSize(cookiesStatus.size) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">最后更新：</span>
                      <span class="value">{{ formatDate(cookiesStatus.modified) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">重要Cookies：</span>
                      <span :class="[
                        'value',
                        cookiesStatus.hasImportantCookies ? 'success' : 'warning'
                      ]">
                        {{ cookiesStatus.hasImportantCookies ? '✅ 已包含' : '⚠️ 缺少' }}
                      </span>
                    </div>
                  </div>

                  <div class="status-actions">
                    <el-button type="danger" @click="deleteCookies" :loading="deletingCookies">
                      <i class="fas fa-trash"></i>
                      删除Cookies
                    </el-button>
                  </div>
                </div>

                <div v-else class="status-empty">
                  <div class="empty-icon">
                    <i class="fas fa-cookie-bite"></i>
                  </div>
                  <h4>未配置Cookies</h4>
                  <p>YouTube可能会限制未认证的访问，配置cookies可以提高下载成功率</p>
                </div>
              </div>
            </el-tab-pane>

            <!-- 帮助说明 -->
            <el-tab-pane label="帮助说明" name="help">
              <div class="cookies-help">
                <div class="help-section">
                  <h4>🤔 为什么需要Cookies？</h4>
                  <p>YouTube对自动化访问有严格限制，使用cookies可以：</p>
                  <ul>
                    <li>绕过"Sign in to confirm you're not a bot"限制</li>
                    <li>避免HTTP 429 (Too Many Requests)错误</li>
                    <li>访问年龄限制或地区限制的视频</li>
                    <li>提高下载成功率和稳定性</li>
                  </ul>
                </div>

                <div class="help-section">
                  <h4>🔒 安全性说明</h4>
                  <ul>
                    <li>Cookies仅存储在您的服务器本地</li>
                    <li>不会上传到任何第三方服务</li>
                    <li>建议定期更新cookies以保持有效性</li>
                    <li>如有安全顾虑，可随时删除cookies</li>
                  </ul>
                </div>

                <div class="help-section">
                  <h4>🛠️ 故障排除</h4>
                  <ul>
                    <li><strong>仍然出现429错误：</strong>cookies可能已过期，请重新获取</li>
                    <li><strong>无法访问某些视频：</strong>确保cookies来自已登录的YouTube账户</li>
                    <li><strong>格式错误：</strong>确保cookies格式为Netscape格式</li>
                    <li><strong>权限问题：</strong>确保账户有访问目标视频的权限</li>
                  </ul>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <template #footer>
        <el-button @click="showCookiesDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  parseVideo as apiParseVideo,
  downloadVideo as apiDownloadVideo,
  parseYouTubeVideo,
  downloadYouTubeVideo,
  checkYouTubeCookiesStatus,
  uploadYouTubeCookies,
  deleteYouTubeCookies,
  parseIqiyiVideo,
  downloadIqiyiVideo
} from '@/api/tools';

import { useToolAnalytics } from '@/composables/useToolAnalytics';

export default {
  name: 'VideoDownloader',
  setup() {
    // 使用工具统计
    const { recordUsage, recordDownload } = useToolAnalytics('video-downloader');

    // Tab状态
    const activeTab = ref('bilibili');

    // Bilibili视频下载状态
    const videoUrl = ref('');
    const parsing = ref(false);
    const downloading = ref(false);
    const videoInfo = ref(null);

    // YouTube视频下载状态
    const youtubeUrl = ref('');
    const youtubeLoading = ref(false);
    const youtubeDownloading = ref(false);
    const youtubeVideoInfo = ref(null);

    // 爱奇艺视频下载状态
    const iqiyiUrl = ref('');
    const iqiyiLoading = ref(false);
    const iqiyiDownloading = ref(false);
    const iqiyiVideoInfo = ref(null);

    // Cookies管理状态
    const showCookiesDialog = ref(false);
    const cookiesTab = ref('upload');
    const cookiesContent = ref('');
    const cookiesStatus = ref({ exists: false });
    const checkingCookies = ref(false);
    const uploadingCookies = ref(false);
    const deletingCookies = ref(false);
    // Bilibili选择状态
    const selectedVideo = ref(null);
    const selectedAudio = ref(null);
    const downloadType = ref('video');

    // YouTube选择状态
    const selectedYouTubeVideo = ref(null);
    const selectedYouTubeAudio = ref(null);
    const selectedYouTubeRecommended = ref(null);
    const youtubeDownloadType = ref('recommended');

    // 计算属性
    const canDownload = computed(() => {
      if (downloadType.value === 'audio') {
        return selectedAudio.value;
      } else if (downloadType.value === 'video') {
        return selectedVideo.value;
      } else if (downloadType.value === 'combine') {
        return selectedVideo.value && selectedAudio.value;
      }
      return false;
    });

    // YouTube计算属性
    const canDownloadYouTube = computed(() => {
      if (youtubeDownloadType.value === 'recommended') {
        return selectedYouTubeRecommended.value;
      } else if (youtubeDownloadType.value === 'audio') {
        return selectedYouTubeAudio.value;
      } else if (youtubeDownloadType.value === 'video') {
        return selectedYouTubeVideo.value;
      }
      return false;
    });

    // 格式化观看次数
    const formatViews = views => {
      if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
      } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
      }
      return views.toString();
    };

    // 方法
    const formatDuration = seconds => {
      if (!seconds) return '未知';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getPlatformName = platform => {
      const names = {
        bilibili: 'Bilibili'
      };
      return names[platform] || platform;
    };

    const selectVideo = video => {
      selectedVideo.value = video;
      downloadType.value = 'video';
    };

    const selectAudio = audio => {
      selectedAudio.value = audio;
      downloadType.value = 'audio';
    };

    // Tab切换方法
    const switchTab = tab => {
      activeTab.value = tab;
      // 切换Tab时重置状态
      if (tab === 'bilibili') {
        videoUrl.value = '';
        videoInfo.value = null;
        selectedVideo.value = null;
        selectedAudio.value = null;
        downloadType.value = 'video';
      } else if (tab === 'youtube') {
        youtubeUrl.value = '';
        youtubeVideoInfo.value = null;
        selectedYouTubeVideo.value = null;
        selectedYouTubeAudio.value = null;
        selectedYouTubeRecommended.value = null;
        youtubeDownloadType.value = 'recommended';
      }
    };

    const getDownloadButtonText = () => {
      if (downloadType.value === 'audio') {
        return '下载音频';
      } else if (downloadType.value === 'video') {
        return '下载视频';
      } else if (downloadType.value === 'combine') {
        return '合并下载';
      }
      return '下载';
    };

    const setExampleUrl = url => {
      videoUrl.value = url;
      ElMessage.info('已填入示例链接，点击解析视频试试吧！');
    };

    // 解析视频 - 简化版本
    const parseVideo = async () => {
      if (!videoUrl.value.trim()) {
        ElMessage.warning('请输入视频链接');
        return;
      }

      try {
        parsing.value = true;
        videoInfo.value = null; // 清空之前的结果

        // 使用统一的API调用
        const response = await apiParseVideo(videoUrl.value.trim());

        if (response.success) {
          const result = response.result;
          videoInfo.value = result;

          // 自动选择最佳格式
          if (result.best.video) {
            selectedVideo.value = result.available.videos.find(v => v.id === result.best.video.id);
          }
          if (result.best.audio) {
            selectedAudio.value = result.available.audios.find(a => a.id === result.best.audio.id);
          }

          ElMessage.success('视频解析成功');

          // 记录解析成功
          recordUsage('use', {
            action: 'parse_video',
            platform: result.platform,
            videoTitle: result.title,
            videoDuration: result.duration
          });
        } else {
          ElMessage.error(response.error || '解析失败');
          videoInfo.value = null;
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.error || error.message || '解析视频失败');
        videoInfo.value = null;
      } finally {
        parsing.value = false;
      }
    };

    // 下载视频 - 简化版本
    const downloadVideo = async () => {
      if (!canDownload.value) {
        ElMessage.warning('请选择要下载的格式');
        return;
      }

      try {
        downloading.value = true;

        let format;
        let audioOnly = false;

        if (downloadType.value === 'audio') {
          format = selectedAudio.value.id;
          audioOnly = true;
        } else if (downloadType.value === 'video') {
          format = selectedVideo.value.id;
          audioOnly = false;
        } else if (downloadType.value === 'combine') {
          format = `${selectedVideo.value.id}+${selectedAudio.value.id}`;
          audioOnly = false;
        }

        const response = await apiDownloadVideo(videoUrl.value.trim(), format, audioOnly);

        if (response.success) {
          const result = response.result;

          ElMessage.success('下载完成！');

          // 记录下载成功
          recordDownload(result.fileName, result.fileSize);

          // 自动触发浏览器下载
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = result.downloadPath;
            link.download = result.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, 500);
        } else {
          ElMessage.error(response.error || '下载失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.error || error.message || '下载失败');
      } finally {
        downloading.value = false;
      }
    };

    // YouTube相关方法
    const handleParseYouTubeVideo = async () => {
      if (!youtubeUrl.value.trim()) {
        ElMessage.warning('请输入YouTube视频链接');
        return;
      }

      youtubeLoading.value = true;
      youtubeVideoInfo.value = null;

      try {
        const response = await parseYouTubeVideo(youtubeUrl.value.trim());

        if (response.success) {
          youtubeVideoInfo.value = response.result;
          ElMessage.success('YouTube视频解析成功');

          // 自动选择推荐格式
          if (response.result.available.recommended && response.result.available.recommended.length > 0) {
            selectedYouTubeRecommended.value = response.result.available.recommended[0];
            youtubeDownloadType.value = 'recommended';
          }

          // 记录YouTube解析成功
          recordUsage('use', {
            action: 'parse_youtube_video',
            platform: 'youtube',
            videoTitle: response.result.title,
            videoDuration: response.result.duration
          });
        } else {
          ElMessage.error(response.error || 'YouTube视频解析失败');
        }
      } catch (error) {
        console.error('YouTube解析失败:', error);
        ElMessage.error(error.response?.data?.error || error.message || 'YouTube解析失败');
      } finally {
        youtubeLoading.value = false;
      }
    };

    const selectYouTubeVideo = video => {
      selectedYouTubeVideo.value = video;
      youtubeDownloadType.value = 'video';
    };

    const selectYouTubeAudio = audio => {
      selectedYouTubeAudio.value = audio;
      youtubeDownloadType.value = 'audio';
    };

    const selectYouTubeRecommended = recommended => {
      selectedYouTubeRecommended.value = recommended;
      youtubeDownloadType.value = 'recommended';
    };

    const getYouTubeDownloadButtonText = () => {
      if (youtubeDownloadType.value === 'recommended') {
        return '下载推荐格式';
      } else if (youtubeDownloadType.value === 'audio') {
        return '下载音频';
      } else if (youtubeDownloadType.value === 'video') {
        return '下载视频';
      }
      return '下载';
    };

    const setYouTubeExampleUrl = url => {
      youtubeUrl.value = url;
    };

    const handleDownloadYouTubeVideo = async () => {
      if (!canDownloadYouTube.value) {
        ElMessage.warning('请先选择要下载的格式');
        return;
      }

      youtubeDownloading.value = true;

      try {
        let format;
        let audioOnly = false;

        if (youtubeDownloadType.value === 'recommended') {
          format = selectedYouTubeRecommended.value.itag;
          audioOnly = false;
        } else if (youtubeDownloadType.value === 'audio') {
          format = selectedYouTubeAudio.value.itag;
          audioOnly = true;
        } else if (youtubeDownloadType.value === 'video') {
          format = selectedYouTubeVideo.value.itag;
          audioOnly = false;
        }

        const response = await downloadYouTubeVideo(youtubeUrl.value.trim(), format, audioOnly);

        if (response.success) {
          ElMessage.success('YouTube视频下载成功');

          // 触发浏览器下载
          const link = document.createElement('a');
          link.href = response.result.downloadPath;
          link.download = response.result.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          ElMessage.error(response.error || 'YouTube下载失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.error || error.message || 'YouTube下载失败');
      } finally {
        youtubeDownloading.value = false;
      }
    };

    // Cookies管理方法
    const checkCookiesStatus = async () => {
      checkingCookies.value = true;
      try {
        const response = await checkYouTubeCookiesStatus();

        if (response.success) {
          cookiesStatus.value = response.cookies;
        } else {
          ElMessage.error('检查cookies状态失败');
        }
      } catch (error) {
        ElMessage.error('检查cookies状态失败');
      } finally {
        checkingCookies.value = false;
      }
    };

    const uploadCookies = async () => {
      if (!cookiesContent.value.trim()) {
        ElMessage.warning('请输入cookies内容');
        return;
      }

      uploadingCookies.value = true;
      try {
        const response = await uploadYouTubeCookies(cookiesContent.value);

        if (response.success) {
          ElMessage.success(`Cookies上传成功！包含${response.cookieCount}个cookies`);
          cookiesContent.value = '';
          cookiesTab.value = 'status';
          await checkCookiesStatus();
        } else {
          ElMessage.error(response.error || 'Cookies上传失败');
        }
      } catch (error) {
        ElMessage.error('上传cookies失败');
      } finally {
        uploadingCookies.value = false;
      }
    };

    const deleteCookies = async () => {
      try {
        await ElMessageBox.confirm('确定要删除cookies吗？删除后YouTube访问可能受限。', '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        });

        deletingCookies.value = true;

        const response = await deleteYouTubeCookies();

        if (response.success) {
          ElMessage.success('Cookies已删除');
          await checkCookiesStatus();
        } else {
          ElMessage.error(response.error || 'Cookies删除失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除cookies失败');
        }
      } finally {
        deletingCookies.value = false;
      }
    };

    // 爱奇艺相关方法
    const handleParseIqiyiVideo = async () => {
      if (!iqiyiUrl.value.trim()) {
        ElMessage.warning('请输入爱奇艺视频链接');
        return;
      }

      iqiyiLoading.value = true;
      iqiyiVideoInfo.value = null;

      try {
        const response = await parseIqiyiVideo(iqiyiUrl.value.trim());

        if (response.success) {
          iqiyiVideoInfo.value = response.result;
          ElMessage.success('爱奇艺视频解析成功');
        } else {
          ElMessage.error(response.error || '爱奇艺视频解析失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.error || error.message || '爱奇艺视频解析失败');
      } finally {
        iqiyiLoading.value = false;
      }
    };

    const handleDownloadIqiyiVideo = async () => {
      if (!iqiyiVideoInfo.value) {
        ElMessage.warning('请先解析视频');
        return;
      }

      iqiyiDownloading.value = true;

      try {
        const response = await downloadIqiyiVideo(
          iqiyiUrl.value.trim(),
          iqiyiVideoInfo.value.tvid,
          iqiyiVideoInfo.value.vid
        );

        if (response.success) {
          ElMessage.success('爱奇艺视频下载成功');

          // 触发浏览器下载
          const link = document.createElement('a');
          link.href = response.result.downloadPath;
          link.download = response.result.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          ElMessage.error(response.error || '爱奇艺下载失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.error || error.message || '爱奇艺下载失败');
      } finally {
        iqiyiDownloading.value = false;
      }
    };

    const setIqiyiExampleUrl = url => {
      iqiyiUrl.value = url;
      ElMessage.info('已填入示例链接，点击解析视频试试吧！');
    };

    // 格式化方法
    const formatDate = dateString => {
      if (!dateString) return '未知';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    const formatFileSize = bytes => {
      if (!bytes) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // 初始化时检查cookies状态
    onMounted(() => {
      checkCookiesStatus();
    });

    return {
      // Tab状态
      activeTab,
      switchTab,

      // Bilibili视频下载功能
      videoUrl,
      parsing,
      downloading,
      videoInfo,
      selectedVideo,
      selectedAudio,
      downloadType,
      canDownload,
      formatDuration,
      getPlatformName,
      selectVideo,
      selectAudio,
      getDownloadButtonText,
      setExampleUrl,
      parseVideo,
      downloadVideo,

      // YouTube视频下载功能
      youtubeUrl,
      youtubeLoading,
      youtubeDownloading,
      youtubeVideoInfo,
      selectedYouTubeVideo,
      selectedYouTubeAudio,
      selectedYouTubeRecommended,
      youtubeDownloadType,
      canDownloadYouTube,
      formatViews,
      handleParseYouTubeVideo,
      selectYouTubeVideo,
      selectYouTubeAudio,
      selectYouTubeRecommended,
      getYouTubeDownloadButtonText,
      setYouTubeExampleUrl,
      handleDownloadYouTubeVideo,

      // 爱奇艺功能
      iqiyiUrl,
      iqiyiLoading,
      iqiyiDownloading,
      iqiyiVideoInfo,
      handleParseIqiyiVideo,
      handleDownloadIqiyiVideo,
      setIqiyiExampleUrl,

      // Cookies管理功能
      showCookiesDialog,
      cookiesTab,
      cookiesContent,
      cookiesStatus,
      checkingCookies,
      uploadingCookies,
      deletingCookies,
      checkCookiesStatus,
      uploadCookies,
      deleteCookies,
      formatDate,
      formatFileSize
    };
  }
};
</script>

<style scoped>
.video-downloader {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.tool-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

/* Tab导航样式 */
.platform-tabs {
  margin-bottom: 32px;
}

.tab-header {
  display: flex;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 8px;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  position: relative;
  min-height: 80px;
  flex-direction: column;
  gap: 8px;
}

.tab-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tab-item.active {
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.tab-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tab-item i {
  font-size: 24px;
  margin-bottom: 4px;
}

.tab-item.active i,
.tab-item:hover:not(.disabled) i {
  transform: scale(1.1);
}

.tab-item span {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.tab-status {
  position: absolute;
  top: 8px;
  right: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.available {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-badge.coming-soon {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

/* Tab内容样式 */
.tab-content {
  min-height: 600px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.platform-intro {
  text-align: center;
  margin-bottom: 32px;
  padding: 24px;
  border-radius: 16px;
  color: white;
}

.bilibili-pane .platform-intro {
  background: linear-gradient(135deg, #00a1d6 0%, #00d4aa 100%);
}

.youtube-pane .platform-intro {
  background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
}

.platform-intro h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
}

.platform-intro p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

/* YouTube即将推出样式 */
.coming-soon-content {
  text-align: center;
  padding: 60px 40px;
  background: #f8f9fa;
  border-radius: 16px;
  border: 2px dashed #dee2e6;
}

.coming-soon-icon {
  font-size: 64px;
  color: #6c757d;
  margin-bottom: 24px;
}

.coming-soon-content h3 {
  font-size: 24px;
  color: #495057;
  margin-bottom: 16px;
}

.coming-soon-content>p {
  font-size: 16px;
  color: #6c757d;
  margin-bottom: 24px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 24px 0;
  text-align: left;
  display: inline-block;
}

.feature-list li {
  padding: 8px 0;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-list i {
  color: #28a745;
  font-size: 14px;
}

.notification-signup {
  margin-top: 32px;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.notification-signup p {
  margin-bottom: 16px;
  color: #495057;
}

/* 推荐格式样式 */
.recommended-formats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.recommended-item {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.recommended-item:hover {
  border-color: #007bff;
  background: #e3f2fd;
}

.recommended-item.selected {
  border-color: #007bff;
  background: #e3f2fd;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.rec-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.rec-description {
  color: #666;
  font-size: 14px;
  margin-left: 32px;
}

/* Cookies管理样式 */
.cookies-management {
  margin-bottom: 32px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.cookies-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.status-info {
  flex: 1;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-item.success i {
  color: #28a745;
}

.status-item.warning i {
  color: #ffc107;
}

.status-item small {
  display: block;
  color: #6c757d;
  font-size: 12px;
  margin-top: 4px;
}

.cookies-actions {
  display: flex;
  gap: 8px;
}

/* 帮助内容样式 */
.help-content {
  margin-top: 24px;
}

/* 快速示例样式 */
.quick-examples {
  margin-bottom: 24px;
}

.quick-examples h3 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 1.1rem;
}

/* 平台功能特色样式 */
.platform-features {
  margin-bottom: 24px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.feature-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.feature-card h4 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 1rem;
  font-weight: 600;
}

.feature-card p {
  margin: 0;
  color: #6c757d;
  font-size: 0.85rem;
  line-height: 1.4;
}

/* 使用说明网格样式 */
.tips-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.tip-number {
  background: #007bff;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.tip-content h4 {
  margin: 0 0 6px 0;
  color: #495057;
  font-size: 0.95rem;
  font-weight: 600;
}

.tip-content p {
  margin: 0;
  color: #6c757d;
  font-size: 0.85rem;
  line-height: 1.4;
}

.usage-notes {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.usage-notes h4 {
  margin: 0 0 12px 0;
  color: #856404;
  font-size: 0.95rem;
}

.usage-notes ul {
  margin: 0;
  padding-left: 20px;
}

.usage-notes li {
  color: #856404;
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 4px;
}

/* 示例链接样式优化 */
.platform-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
}

.platform-tag.iqiyi {
  background: linear-gradient(135deg, #00c851 0%, #00a085 100%);
  color: white;
}

.example-url {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.example-desc {
  font-size: 0.8rem;
  color: #6c757d;
  font-style: italic;
}

.example-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.example-item:hover {
  background: #e9ecef;
  border-color: #007bff;
}

.example-item code {
  background: #e9ecef;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
  word-break: break-all;
  flex: 1;
}

.example-item code:hover {
  background: #007bff;
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .feature-card {
    padding: 12px;
  }

  .feature-icon {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }

  .tip-item {
    padding: 12px;
    gap: 10px;
  }

  .tip-number {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
  }

  .example-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .example-item code {
    width: 100%;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .help-content {
    margin-top: 16px;
  }

  .platform-features {
    margin-bottom: 16px;
  }

  .usage-tips h3,
  .quick-examples h3 {
    font-size: 1rem;
  }
}

/* Cookies对话框样式 */
.cookies-dialog {
  min-height: 500px;
}

.upload-instructions {
  margin-bottom: 24px;
  padding: 16px;
  background: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.upload-instructions h4 {
  margin: 0 0 12px 0;
  color: #1976d2;
}

.upload-instructions ol {
  margin: 0;
  padding-left: 20px;
}

.upload-instructions li {
  margin-bottom: 8px;
}

.upload-instructions ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.upload-area {
  margin-top: 16px;
}

.cookies-textarea {
  margin-bottom: 16px;
}

.upload-actions {
  display: flex;
  gap: 12px;
}

.cookies-status-detail {
  padding: 24px;
}

.status-success {
  text-align: center;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.status-header i {
  font-size: 24px;
  color: #28a745;
}

.status-header h4 {
  margin: 0;
  color: #28a745;
}

.status-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.detail-item .label {
  font-weight: 500;
  color: #495057;
}

.detail-item .value {
  color: #212529;
}

.detail-item .value.success {
  color: #28a745;
}

.detail-item .value.warning {
  color: #ffc107;
}

.status-empty {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  font-size: 48px;
  color: #dee2e6;
  margin-bottom: 16px;
}

.empty-icon i {
  font-size: 48px;
}

.status-empty h4 {
  margin: 0 0 12px 0;
  color: #6c757d;
}

.status-empty p {
  margin: 0;
  color: #6c757d;
}

.cookies-help {
  padding: 24px;
}

.help-section {
  margin-bottom: 32px;
}

.help-section h4 {
  margin: 0 0 12px 0;
  color: #495057;
}

.help-section p {
  margin: 0 0 12px 0;
  color: #6c757d;
}

.help-section ul {
  margin: 0;
  padding-left: 20px;
}

.help-section li {
  margin-bottom: 8px;
  color: #6c757d;
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tool-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-details h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.tool-details p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
  color: #f8f9fa;
}

.url-input-section {
  margin-bottom: 32px;
}

.video-info-section {
  margin-bottom: 32px;
}

.video-preview {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.video-thumbnail {
  flex-shrink: 0;
  width: 200px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-details {
  flex: 1;
}

.video-details h2 {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #666;
}

.format-group {
  margin-bottom: 24px;
}

.format-group h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.format-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 80px 120px 80px 80px 80px 1fr;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.table-header span,
.table-row span {
  padding: 12px 8px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 80px 120px 80px 80px 80px 1fr;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background: #f0f0f0;
}

.table-row.selected {
  background: #e3f2fd;
}

.format-id {
  font-family: monospace;
  font-weight: 600;
}

.download-options {
  margin: 24px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.download-actions {
  text-align: center;
  margin: 24px 0;
}

.usage-tips {
  margin-top: 40px;
  padding: 20px;
  background: #e8f5e8;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.usage-tips h3 {
  margin: 0 0 12px 0;
  color: #2e7d32;
  font-size: 16px;
}

.usage-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #424242;
}

.usage-tips li {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.example-links {
  margin-top: 24px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.example-links h3 {
  margin: 0 0 12px 0;
  color: #1976d2;
  font-size: 16px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.platform {
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.example-item code {
  background: #e3f2fd;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  min-width: 300px;
}

.example-item code:hover {
  background: #bbdefb;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .video-downloader {
    padding: 16px;
  }

  .tool-header {
    padding: 20px;
  }

  .tool-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .tool-icon {
    width: 60px;
    height: 60px;
    font-size: 32px;
  }

  .tool-details h1 {
    font-size: 24px;
  }

  .video-preview {
    flex-direction: column;
    padding: 16px;
  }

  .video-thumbnail {
    width: 100%;
    height: 200px;
  }

  .video-meta {
    flex-direction: column;
    gap: 8px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 50px 60px 80px 60px 60px 60px 1fr;
    font-size: 12px;
  }

  .table-header span,
  .table-row span {
    padding: 8px 4px;
  }

  .download-options {
    padding: 12px;
  }

  .usage-tips {
    padding: 16px;
  }
}
</style>
