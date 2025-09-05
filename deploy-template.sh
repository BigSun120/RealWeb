#!/bin/bash

# 🚀 Git 部署模板脚本
# 复制此文件并根据需要自定义

set -e

# ========== 配置区域 ==========
SERVER="root@38.146.30.42"
PROJECT_PATH="~/temp-email-system"
BRANCH="master"
SERVICE_NAME="website-backend"

# 部署选项（设置为 true 启用）
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=false
INSTALL_DEPENDENCIES=false
RUN_TESTS=false

# ========== 函数定义 ==========

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 错误处理
error_exit() {
    log "错误: $1"
    exit 1
}

# 执行远程命令
remote_exec() {
    ssh $SERVER "$1" || error_exit "远程命令执行失败: $1"
}

# ========== 主要流程 ==========

log "开始 Git 部署..."

# 1. 推送本地代码
log "推送本地代码到 GitHub..."
git add . || error_exit "git add 失败"
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || log "没有新的更改需要提交"
git push origin $BRANCH || error_exit "代码推送失败"

# 2. 服务器拉取代码
log "服务器拉取最新代码..."
remote_exec "cd $PROJECT_PATH && git pull origin $BRANCH"

# 3. 检查并安装依赖
if [ "$INSTALL_DEPENDENCIES" = true ]; then
    log "检查依赖更新..."
    if remote_exec "cd $PROJECT_PATH && git diff --name-only HEAD~1 | grep -E 'package.*\.json'" 2>/dev/null; then
        log "发现依赖更新，重新安装..."
        remote_exec "cd $PROJECT_PATH/backend && npm install"
        if [ "$DEPLOY_FRONTEND" = true ]; then
            remote_exec "cd $PROJECT_PATH/frontend && npm install"
        fi
    fi
fi

# 4. 运行测试
if [ "$RUN_TESTS" = true ]; then
    log "运行测试..."
    remote_exec "cd $PROJECT_PATH/backend && npm test" || error_exit "测试失败"
fi

# 5. 前端构建
if [ "$DEPLOY_FRONTEND" = true ]; then
    log "检查前端更改..."
    if remote_exec "cd $PROJECT_PATH && git diff --name-only HEAD~1 | grep -E '^frontend/'" 2>/dev/null; then
        log "发现前端更改，重新构建..."
        remote_exec "cd $PROJECT_PATH/frontend && npm run build"
        remote_exec "rsync -av $PROJECT_PATH/frontend/dist/ /var/www/html/"
    else
        log "前端无更改，跳过构建"
    fi
fi

# 6. 重启后端服务
if [ "$DEPLOY_BACKEND" = true ]; then
    log "重启后端服务..."
    remote_exec "pm2 restart $SERVICE_NAME"
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 5
fi

# 7. 验证部署
log "验证部署..."
HEALTH_CHECK=$(remote_exec "curl -s http://localhost:3001/health")
log "健康检查结果: $HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    log "🎉 部署成功！"
    log ""
    log "🔍 验证地址:"
    log "- 网站首页: https://godaug.fun"
    log "- 健康检查: https://godaug.fun/api/health"
    log "- 管理后台: https://godaug.fun/admin"
else
    error_exit "部署验证失败，请检查日志"
fi

log "🚀 Git 部署完成！"

# ========== 使用示例 ==========
# 
# 1. 复制此文件：
#    cp deploy-template.sh my-deploy.sh
#
# 2. 根据需要修改配置：
#    - 设置 DEPLOY_FRONTEND=true 如果需要部署前端
#    - 设置 INSTALL_DEPENDENCIES=true 如果需要自动安装依赖
#    - 设置 RUN_TESTS=true 如果需要运行测试
#
# 3. 执行部署：
#    chmod +x my-deploy.sh
#    ./my-deploy.sh
#
