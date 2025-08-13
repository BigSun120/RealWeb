#!/bin/bash

# 临时邮箱系统快速部署脚本
# 使用方法: ./quick-deploy.sh your-domain.com

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 检查参数
if [ $# -eq 0 ]; then
    print_message "使用方法: ./quick-deploy.sh your-domain.com" $RED
    exit 1
fi

DOMAIN=$1
print_message "🚀 开始部署临时邮箱系统到域名: $DOMAIN" $BLUE

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    print_message "请不要使用root用户运行此脚本" $RED
    exit 1
fi

# 步骤1: 检查系统环境
print_message "📋 检查系统环境..." $YELLOW

# 检查操作系统
if ! grep -q "Ubuntu" /etc/os-release; then
    print_message "警告: 此脚本针对Ubuntu系统优化，其他系统可能需要手动调整" $YELLOW
fi

# 检查Docker
if ! command -v docker &> /dev/null; then
    print_message "🐳 安装Docker..." $YELLOW
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_message "✅ Docker安装完成" $GREEN
else
    print_message "✅ Docker已安装" $GREEN
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_message "🔧 安装Docker Compose..." $YELLOW
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_message "✅ Docker Compose安装完成" $GREEN
else
    print_message "✅ Docker Compose已安装" $GREEN
fi

# 步骤2: 配置防火墙
print_message "🔥 配置防火墙..." $YELLOW
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 25/tcp
print_message "✅ 防火墙配置完成" $GREEN

# 步骤3: 创建项目目录结构
print_message "📁 创建目录结构..." $YELLOW
mkdir -p logs ssl nginx

# 步骤4: 配置环境变量
print_message "⚙️ 配置环境变量..." $YELLOW
cat > .env.prod << EOF
NODE_ENV=production
DOMAIN=$DOMAIN
SMTP_DOMAINS=$DOMAIN,localhost,test.local
EOF

# 步骤5: 更新配置文件中的域名
print_message "🔧 更新配置文件..." $YELLOW
if [ -f "docker-compose.prod.yml" ]; then
    sed -i "s/godaug\.fun/$DOMAIN/g" docker-compose.prod.yml
fi

if [ -f "frontend/nginx.conf" ]; then
    sed -i "s/godaug\.fun/$DOMAIN/g" frontend/nginx.conf
fi

# 步骤6: SSL证书配置
print_message "🔒 配置SSL证书..." $YELLOW
if command -v certbot &> /dev/null; then
    print_message "Certbot已安装，可以获取SSL证书" $GREEN
else
    print_message "安装Certbot..." $YELLOW
    sudo apt update
    sudo apt install -y certbot
fi

print_message "请手动运行以下命令获取SSL证书:" $YELLOW
print_message "sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN" $BLUE
print_message "然后复制证书文件:" $YELLOW
print_message "sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/" $BLUE
print_message "sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/" $BLUE
print_message "sudo chown -R \$USER:\$USER ssl/" $BLUE

# 步骤7: 启动服务
print_message "🚀 启动服务..." $YELLOW
if [ -f "docker-compose.prod.yml" ]; then
    docker-compose -f docker-compose.prod.yml up -d --build
    print_message "✅ 服务启动完成" $GREEN
else
    print_message "❌ 未找到docker-compose.prod.yml文件" $RED
    exit 1
fi

# 步骤8: 验证部署
print_message "🔍 验证部署..." $YELLOW
sleep 10

# 检查服务状态
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_message "✅ 服务运行正常" $GREEN
else
    print_message "❌ 服务启动异常，请检查日志" $RED
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# 步骤9: 设置定时任务
print_message "⏰ 设置定时任务..." $YELLOW
if [ -f "scripts/health-check.sh" ]; then
    chmod +x scripts/*.sh
    # 添加健康检查定时任务
    (crontab -l 2>/dev/null; echo "0 * * * * $(pwd)/scripts/health-check.sh >> /var/log/health-check.log 2>&1") | crontab -
    # 添加备份定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/backup.sh >> /var/log/backup.log 2>&1") | crontab -
    print_message "✅ 定时任务设置完成" $GREEN
fi

# 完成部署
print_message "🎉 部署完成!" $GREEN
print_message "===========================================" $BLUE
print_message "🌐 网站地址: https://$DOMAIN" $GREEN
print_message "📧 管理后台: https://$DOMAIN/admin" $GREEN
print_message "🔧 Inbucket: http://$DOMAIN:9000" $GREEN
print_message "===========================================" $BLUE

print_message "📋 接下来的步骤:" $YELLOW
print_message "1. 配置域名DNS解析指向此服务器IP" $BLUE
print_message "2. 获取SSL证书（如上面提示的命令）" $BLUE
print_message "3. 重启服务以应用SSL证书" $BLUE
print_message "4. 测试邮箱功能" $BLUE

print_message "📝 常用命令:" $YELLOW
print_message "查看服务状态: docker-compose -f docker-compose.prod.yml ps" $BLUE
print_message "查看日志: docker-compose -f docker-compose.prod.yml logs -f" $BLUE
print_message "重启服务: docker-compose -f docker-compose.prod.yml restart" $BLUE
print_message "停止服务: docker-compose -f docker-compose.prod.yml down" $BLUE

print_message "🆘 如遇问题，请查看 DEPLOYMENT.md 文档" $YELLOW
