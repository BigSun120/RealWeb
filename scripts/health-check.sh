#!/bin/bash

# 系统健康检查脚本

echo " 系统健康检查 - $(date)"
echo "================================"

# 检查服务状态
echo "📊 Docker服务状态:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "💾 系统资源使用:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "内存使用: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "磁盘使用: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "🌐 服务连通性检查:"

# 检查前端
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
fi

# 检查后端API
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/temp-email/status | grep -q "200"; then
    echo "✅ 后端API正常"
else
    echo "❌ 后端API异常"
fi

# 检查Inbucket
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9000 | grep -q "200"; then
    echo "✅ 邮件服务正常"
else
    echo "❌ 邮件服务异常"
fi

# 检查SMTP端口
if nc -z localhost 2500; then
    echo "✅ SMTP端口正常"
else
    echo "❌ SMTP端口异常"
fi

echo ""
echo "📧 邮件统计:"
# 这里可以添加邮件数量统计
TOTAL_EMAILS=$(curl -s http://localhost:8001/api/temp-email/all-emails | jq '.data.totalMessages' 2>/dev/null || echo "N/A")
echo "总邮件数: $TOTAL_EMAILS"

echo ""
echo "🔄 最近错误日志:"
docker-compose -f docker-compose.prod.yml logs --tail=5 | grep -i error || echo "无错误日志"

echo ""
echo "================================"
echo "检查完成 - $(date)"
