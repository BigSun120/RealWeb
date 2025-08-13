# 🚀 临时邮箱系统部署指南

## 📋 目录

- [系统要求](#系统要求)
- [服务器选择](#服务器选择)
- [部署步骤](#部署步骤)
- [域名配置](#域名配置)
- [SSL证书](#ssl证书)
- [监控维护](#监控维护)
- [故障排除](#故障排除)
- [成本估算](#成本估算)

## 🖥️ 系统要求

### 最低配置（测试环境）
- **CPU**: 1核
- **内存**: 2GB
- **存储**: 20GB SSD
- **带宽**: 1Mbps
- **系统**: Ubuntu 20.04 LTS

### 推荐配置（生产环境）
- **CPU**: 2核
- **内存**: 4GB
- **存储**: 40GB SSD
- **带宽**: 3-5Mbps
- **系统**: Ubuntu 20.04 LTS

### 高性能配置（大量用户）
- **CPU**: 4核
- **内存**: 8GB
- **存储**: 80GB SSD
- **带宽**: 5Mbps+
- **系统**: Ubuntu 20.04 LTS

## ☁️ 服务器选择

### 推荐云服务商

| 服务商 | 优势 | 价格区间 |
|--------|------|----------|
| 阿里云ECS | 国内访问快，稳定性好 | 60-200元/月 |
| 腾讯云CVM | 价格实惠，新用户优惠多 | 50-180元/月 |
| 华为云ECS | 企业级稳定 | 70-220元/月 |
| Vultr | 海外用户，价格便宜 | $5-20/月 |
| DigitalOcean | 开发者友好 | $5-20/月 |

## 🛠️ 部署步骤

### 步骤1：服务器初始化

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装必要软件
sudo apt install -y curl wget git vim ufw htop

# 3. 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. 重新登录以应用Docker组权限
exit
# 重新SSH登录

# 6. 验证安装
docker --version
docker-compose --version
```

### 步骤2：配置防火墙

```bash
# 配置UFW防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 25/tcp    # SMTP
sudo ufw enable

# 检查防火墙状态
sudo ufw status
```

### 步骤3：克隆项目代码

```bash
# 克隆项目（替换为你的仓库地址）
git clone https://github.com/your-username/temp-email-system.git
cd temp-email-system

# 给脚本执行权限
chmod +x scripts/*.sh
```

### 步骤4：环境配置

```bash
# 创建生产环境配置文件
cat > .env.prod << EOF
NODE_ENV=production
DOMAIN=your-domain.com
SMTP_DOMAINS=your-domain.com,localhost,test.local
EOF

# 创建必要目录
mkdir -p logs ssl nginx
```

## 🌐 域名配置

### DNS记录配置

在你的域名注册商管理面板中添加以下DNS记录：

```dns
# A记录 - 主域名指向服务器
your-domain.com.        A     你的服务器IP
www.your-domain.com.    A     你的服务器IP
mail.your-domain.com.   A     你的服务器IP

# MX记录 - 邮件交换
your-domain.com.        MX    10    mail.your-domain.com.

# TXT记录 - SPF防垃圾邮件（可选）
your-domain.com.        TXT   "v=spf1 a mx ~all"

# TXT记录 - DMARC（可选）
_dmarc.your-domain.com. TXT   "v=DMARC1; p=none; rua=mailto:admin@your-domain.com"
```

### 常见域名注册商配置入口

- **Namecheap**: Domain List → Manage → Advanced DNS
- **GoDaddy**: 我的产品 → 域名 → DNS管理
- **阿里云**: 控制台 → 域名 → 解析设置
- **腾讯云**: 控制台 → 域名注册 → 解析
- **Cloudflare**: Dashboard → 域名 → DNS

### DNS生效检查

```bash
# 检查A记录
nslookup your-domain.com

# 检查MX记录
nslookup -type=MX your-domain.com

# 使用在线工具检查
# https://mxtoolbox.com/
# https://dnschecker.org/
```

## 🔒 SSL证书

### 方法1：Let's Encrypt（推荐，免费）

```bash
# 安装Certbot
sudo apt install -y certbot

# 获取SSL证书
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/

# 设置自动续期
echo "0 3 1 * * certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart frontend" | crontab -
```

### 方法2：购买商业证书

如果使用商业SSL证书，将证书文件放置在 `ssl/` 目录：
- `ssl/fullchain.pem` - 完整证书链
- `ssl/privkey.pem` - 私钥文件

## 🚀 启动服务

### 生产环境部署

```bash
# 修改配置文件中的域名
sed -i 's/godaug.fun/your-domain.com/g' docker-compose.prod.yml
sed -i 's/godaug.fun/your-domain.com/g' frontend/nginx.conf

# 启动服务
docker-compose -f docker-compose.prod.yml up -d --build

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 开发环境部署

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 访问地址
# 前端: http://localhost:3000
# 后端: http://localhost:5000
# Inbucket: http://localhost:9000
```

## 📊 监控维护

### 健康检查

```bash
# 运行健康检查脚本
./scripts/health-check.sh

# 设置定时健康检查
echo "0 * * * * /path/to/project/scripts/health-check.sh >> /var/log/health-check.log 2>&1" | crontab -
```

### 自动备份

```bash
# 运行备份脚本
./scripts/backup.sh

# 设置定时备份（每天凌晨2点）
echo "0 2 * * * /path/to/project/scripts/backup.sh >> /var/log/backup.log 2>&1" | crontab -
```

### 日志管理

```bash
# 查看实时日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f inbucket

# 清理日志
docker system prune -f
```

## 🔧 故障排除

### 常见问题

#### 1. 服务无法启动

```bash
# 检查端口占用
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :25

# 检查Docker状态
sudo systemctl status docker

# 重启Docker
sudo systemctl restart docker
```

#### 2. 邮件发送失败

```bash
# 检查SMTP端口
sudo netstat -tlnp | grep :2500

# 检查Inbucket日志
docker-compose -f docker-compose.prod.yml logs inbucket

# 测试SMTP连接
telnet localhost 2500
```

#### 3. SSL证书问题

```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 检查证书文件
ls -la ssl/
openssl x509 -in ssl/fullchain.pem -text -noout
```

#### 4. 内存不足

```bash
# 检查内存使用
free -h
htop

# 添加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 性能优化

#### 1. 启用Gzip压缩

已在 `frontend/nginx.conf` 中配置

#### 2. 配置缓存

```nginx
# 在nginx.conf中已配置静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 3. 限制资源使用

```yaml
# 在docker-compose.prod.yml中添加
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 💰 成本估算

### 基础配置（2核4G）
- **云服务器**: 60-100元/月
- **域名**: 50-100元/年
- **SSL证书**: 免费（Let's Encrypt）
- **总计**: 约70-110元/月

### 高性能配置（4核8G）
- **云服务器**: 150-300元/月
- **CDN加速**: 20-50元/月（可选）
- **监控服务**: 免费-50元/月（可选）
- **总计**: 约170-400元/月

## 📋 部署检查清单

### 部署前准备
- [ ] 购买云服务器
- [ ] 注册域名
- [ ] 配置DNS解析
- [ ] 准备SSL证书

### 服务器配置
- [ ] 系统更新
- [ ] 安装Docker
- [ ] 配置防火墙
- [ ] 创建项目目录

### 应用部署
- [ ] 克隆代码
- [ ] 配置环境变量
- [ ] 修改域名配置
- [ ] 启动服务

### 部署验证
- [ ] 访问网站首页
- [ ] 测试邮箱生成
- [ ] 测试邮件发送
- [ ] 测试管理后台

### 运维配置
- [ ] 配置监控脚本
- [ ] 设置自动备份
- [ ] 配置SSL自动续期
- [ ] 设置日志轮转

## 🎯 快速部署

如果你想快速部署，可以使用以下一键脚本：

```bash
# 1. 下载项目
git clone https://github.com/your-username/temp-email-system.git
cd temp-email-system

# 2. 修改域名配置
sed -i 's/godaug.fun/your-domain.com/g' docker-compose.prod.yml
sed -i 's/godaug.fun/your-domain.com/g' frontend/nginx.conf

# 3. 一键部署
chmod +x deploy-temp-email.sh
./deploy-temp-email.sh prod
```

## 📞 技术支持

如果在部署过程中遇到问题，可以：

1. 查看项目 [Issues](https://github.com/your-username/temp-email-system/issues)
2. 运行健康检查脚本诊断问题
3. 查看详细的服务日志
4. 参考故障排除章节

## 🔄 更新和维护

### 应用更新

```bash
# 1. 备份当前版本
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建并启动
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 4. 验证更新
./scripts/health-check.sh
```

### 数据迁移

```bash
# 导出邮件数据
docker run --rm -v temp-email_inbucket-data:/data -v $(pwd):/backup alpine tar czf /backup/emails-backup.tar.gz -C /data .

# 导入邮件数据
docker run --rm -v temp-email_inbucket-data:/data -v $(pwd):/backup alpine tar xzf /backup/emails-backup.tar.gz -C /data
```

### 扩容指南

当用户量增长时，可以考虑以下扩容方案：

#### 垂直扩容（升级服务器配置）
```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 停止服务
docker-compose -f docker-compose.prod.yml down

# 3. 升级服务器配置（在云服务商控制台操作）

# 4. 重启服务
docker-compose -f docker-compose.prod.yml up -d
```

#### 水平扩容（多服务器部署）
- 使用负载均衡器（如Nginx、HAProxy）
- 配置共享存储（如NFS、对象存储）
- 使用Redis集群进行缓存

## 🛡️ 安全加固

### 系统安全

```bash
# 1. 禁用root登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# 2. 配置fail2ban防暴力破解
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 3. 定期更新系统
echo "0 4 * * 1 apt update && apt upgrade -y" | sudo crontab -
```

### 应用安全

```bash
# 1. 限制管理后台访问IP（可选）
# 在nginx.conf中添加：
# location /admin/ {
#     allow 你的IP地址;
#     deny all;
# }

# 2. 配置HTTPS强制跳转
# 已在nginx.conf中配置

# 3. 设置安全头
# 已在nginx.conf中配置
```

## 📈 监控告警

### 基础监控

```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 创建监控脚本
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash
# 系统监控脚本

CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)

# 告警阈值
CPU_THRESHOLD=80
MEM_THRESHOLD=80
DISK_THRESHOLD=85

if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    echo "警告: CPU使用率过高 ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > $MEM_THRESHOLD" | bc -l) )); then
    echo "警告: 内存使用率过高 ${MEM_USAGE}%"
fi

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "警告: 磁盘使用率过高 ${DISK_USAGE}%"
fi
EOF

chmod +x scripts/monitor.sh

# 设置定时监控
echo "*/5 * * * * /path/to/project/scripts/monitor.sh" | crontab -
```

### 高级监控（可选）

可以集成以下监控方案：
- **Prometheus + Grafana**: 专业监控方案
- **Zabbix**: 企业级监控
- **云监控**: 使用云服务商提供的监控服务

## 🌍 多域名支持

如果你有多个域名，可以这样配置：

```bash
# 1. 修改环境变量
cat > .env.prod << EOF
NODE_ENV=production
SMTP_DOMAINS=domain1.com,domain2.com,domain3.com
EOF

# 2. 更新Docker配置
# 在docker-compose.prod.yml中修改INBUCKET_SMTP_DOMAIN

# 3. 配置Nginx支持多域名
# 在nginx.conf中添加多个server块
```

## 📱 移动端优化

前端已经是响应式设计，在移动端也能良好显示。如需进一步优化：

```css
/* 在前端CSS中添加移动端优化 */
@media (max-width: 768px) {
    .email-list {
        font-size: 14px;
    }

    .card-header {
        flex-direction: column;
        gap: 10px;
    }
}
```

## 🔍 SEO优化

```html
<!-- 在前端index.html中添加SEO标签 -->
<meta name="description" content="免费临时邮箱服务，保护您的隐私">
<meta name="keywords" content="临时邮箱,一次性邮箱,匿名邮箱">
<meta property="og:title" content="临时邮箱 - 保护隐私的邮箱服务">
<meta property="og:description" content="免费的临时邮箱服务">
```

---

**祝你部署成功！🎉**

如有问题，请查看 [故障排除](#故障排除) 章节或提交 Issue。
