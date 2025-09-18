#!/bin/bash

# Postfix域名同步部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署Postfix域名同步功能..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 此脚本需要root权限运行"
    echo "请使用: sudo $0"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查Postfix
if ! command -v postfix &> /dev/null; then
    echo "❌ Postfix 未安装"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "📁 项目根目录: $PROJECT_ROOT"

# 检查同步脚本是否存在
SYNC_SCRIPT="$SCRIPT_DIR/sync-postfix-domains.js"
if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "❌ 同步脚本不存在: $SYNC_SCRIPT"
    exit 1
fi

# 设置脚本权限
chmod +x "$SYNC_SCRIPT"
echo "✅ 同步脚本权限已设置"

# 创建配置目录
CONFIG_DIR="$PROJECT_ROOT/backend/src/config"
mkdir -p "$CONFIG_DIR"
echo "✅ 配置目录已创建: $CONFIG_DIR"

# 创建Postfix备份目录
BACKUP_DIR="/etc/postfix/backups"
mkdir -p "$BACKUP_DIR"
echo "✅ Postfix备份目录已创建: $BACKUP_DIR"

# 测试同步脚本
echo "🧪 测试同步脚本..."
if node "$SYNC_SCRIPT"; then
    echo "✅ 同步脚本测试成功"
else
    echo "❌ 同步脚本测试失败"
    exit 1
fi

# 创建systemd服务文件（可选）
SERVICE_FILE="/etc/systemd/system/postfix-domain-sync.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Postfix Domain Sync Service
After=network.target postfix.service

[Service]
Type=oneshot
ExecStart=/usr/bin/node $SYNC_SCRIPT
User=root
Group=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd服务文件已创建: $SERVICE_FILE"

# 创建定时任务（每5分钟检查一次）
CRON_FILE="/etc/cron.d/postfix-domain-sync"
cat > "$CRON_FILE" << EOF
# Postfix域名配置同步定时任务
# 每5分钟检查一次域名配置变化
*/5 * * * * root /usr/bin/node $SYNC_SCRIPT >> /var/log/postfix-domain-sync.log 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "✅ 定时任务已创建: $CRON_FILE"

# 创建日志文件
LOG_FILE="/var/log/postfix-domain-sync.log"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
echo "✅ 日志文件已创建: $LOG_FILE"

# 重启cron服务
systemctl restart cron
echo "✅ Cron服务已重启"

# 显示部署结果
echo ""
echo "🎉 Postfix域名同步功能部署完成！"
echo ""
echo "📋 部署信息："
echo "   同步脚本: $SYNC_SCRIPT"
echo "   配置目录: $CONFIG_DIR"
echo "   备份目录: $BACKUP_DIR"
echo "   日志文件: $LOG_FILE"
echo "   定时任务: $CRON_FILE"
echo ""
echo "🔧 管理命令："
echo "   手动同步: node $SYNC_SCRIPT"
echo "   查看日志: tail -f $LOG_FILE"
echo "   查看定时任务: crontab -l"
echo "   测试定时任务: systemctl start postfix-domain-sync"
echo ""
echo "⚠️  注意事项："
echo "   1. 确保Node.js应用有权限读写配置文件"
echo "   2. 确保Postfix配置文件可写"
echo "   3. 定时任务每5分钟执行一次同步检查"
echo "   4. 可以通过管理界面手动触发同步"
echo ""
echo "✅ 部署完成，系统将自动保持Postfix域名配置同步！"
