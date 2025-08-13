#!/bin/bash

# 自动备份脚本

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="temp-email-backup-$DATE"

echo "🗄️ 开始备份 - $DATE"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份Docker数据卷
echo "📦 备份Docker数据..."
docker run --rm -v temp-email_inbucket-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/$BACKUP_NAME-inbucket.tar.gz -C /data .

# 备份配置文件
echo "⚙️ 备份配置文件..."
tar czf $BACKUP_DIR/$BACKUP_NAME-config.tar.gz \
    docker-compose.prod.yml \
    frontend/nginx.conf \
    .env.prod \
    ssl/ \
    2>/dev/null || true

# 备份日志
echo "📝 备份日志..."
tar czf $BACKUP_DIR/$BACKUP_NAME-logs.tar.gz logs/ 2>/dev/null || true

# 清理旧备份（保留7天）
echo "🧹 清理旧备份..."
find $BACKUP_DIR -name "temp-email-backup-*" -mtime +7 -delete

echo "✅ 备份完成: $BACKUP_NAME"
echo "📁 备份位置: $BACKUP_DIR"
ls -lh $BACKUP_DIR/$BACKUP_NAME-*
