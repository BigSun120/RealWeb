# Augment Token Manager - 配套代理程序

这是Augment Token Manager的配套代理程序，提供编辑器令牌切换和协议处理功能。

## 功能特性

### 🔄 编辑器集成
- **VSCode系编辑器支持**：VS Code、Cursor、VSCodium、Windsurf、Kiro、Trae、Qoder、CodeBuddy
- **JetBrains系编辑器支持**：IntelliJ IDEA、PyCharm、GoLand、WebStorm、PhpStorm、RustRover、CLion、Rider、DataGrip、Android Studio、RubyMine、Aqua
- **无感切换**：点击Web端编辑器图标，自动配置编辑器中的Augment插件令牌

### 🌐 HTTP服务
- **服务发现**：Web端可检测本地代理服务是否运行
- **账号管理**：提供REST API管理令牌账号
- **协议处理**：处理自定义协议调用

### 🔧 协议注册
- **自定义协议**：注册 `augment-vscode://`、`augment-cursor://`、`augment-jetbrains://` 协议
- **系统集成**：浏览器可直接调用本地程序
- **参数传递**：通过协议URL传递令牌和配置信息

## 安装使用

### 环境要求
- Windows 10/11
- Python 3.8+ (开发环境)

### 开发环境安装
```bash
# 克隆代码
git clone <repository>
cd augment-proxy

# 安装依赖
pip install -r requirements.txt

# 运行程序
python main.py
```

### 构建exe文件
```bash
# 安装构建依赖
pip install pyinstaller

# 构建exe
python build.py build

# 清理构建文件
python build.py clean
```

## API接口

### 服务状态检测
```
GET http://localhost:8899/ping
```

### 获取当前账号
```
GET http://localhost:8899/current-account
```

### 获取账号列表
```
GET http://localhost:8899/accounts
```

### 切换账号
```
POST http://localhost:8899/switch-account
Content-Type: application/json

{
  "tokenId": "account_id",
  "editorType": "vscode"
}
```

### 处理协议调用
```
POST http://localhost:8899/protocol-handler
Content-Type: application/json

{
  "protocolUrl": "vscode://Augment.vscode-augment/autoAuth?token=xxx&url=xxx"
}
```

## 协议格式

### VSCode系编辑器
```
vscode://Augment.vscode-augment/autoAuth?token=<access_token>&url=<tenant_url>&portal=<portal_url>
cursor://Augment.vscode-augment/autoAuth?token=<access_token>&url=<tenant_url>&portal=<portal_url>
```

### JetBrains系编辑器
```
jetbrains://idea/plugin/Augment.jetbrains-augment/autoAuth?token=<access_token>&url=<tenant_url>
jetbrains://pycharm/plugin/Augment.jetbrains-augment/autoAuth?token=<access_token>&url=<tenant_url>
```

## 配置文件

### VSCode系编辑器配置
程序会修改编辑器的 `settings.json` 文件：
```json
{
  "augment.accessToken": "your_token",
  "augment.tenantUrl": "your_tenant_url",
  "augment.portalUrl": "your_portal_url",
  "augment.lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### JetBrains系编辑器配置
程序会创建 `augment.xml` 配置文件：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<application>
  <component name="AugmentSettings">
    <option name="accessToken" value="your_token" />
    <option name="tenantUrl" value="your_tenant_url" />
    <option name="portalUrl" value="your_portal_url" />
    <option name="lastUpdated" value="2024-01-01T00:00:00.000Z" />
  </component>
</application>
```

## 文件结构

```
augment-proxy/
├── main.py              # 主程序入口
├── config.py            # 配置管理
├── account_manager.py   # 账号管理
├── protocol_handler.py  # 协议处理
├── utils.py            # 工具函数
├── requirements.txt    # Python依赖
├── build.py           # 构建脚本
└── README.md          # 说明文档
```

## 日志文件

程序运行日志保存在：
- `%USERPROFILE%\.augment-proxy\logs\augment-proxy-YYYYMMDD.log`

## 服务信息文件

程序运行时会在临时目录创建服务信息文件：
- `%TEMP%\augment-proxy-service.json`

Web端通过检测此文件来判断代理服务是否可用。

## 故障排除

### 协议注册失败
- 确保以管理员权限运行程序
- 检查Windows注册表权限

### 编辑器配置失败
- 确保编辑器已安装
- 检查配置文件路径权限

### 端口占用
- 程序会自动在8899-8903端口范围内查找可用端口
- 如果所有端口都被占用，程序会启动失败

## 开发说明

### 添加新编辑器支持
1. 在 `config.py` 中添加编辑器配置
2. 在 `account_manager.py` 中实现配置逻辑
3. 在 `protocol_handler.py` 中添加协议处理

### 调试模式
```bash
# 启用详细日志
python main.py --debug

# 测试协议注册
python -c "from protocol_handler import ProtocolHandler; ph = ProtocolHandler(); ph.register_protocols()"
```
