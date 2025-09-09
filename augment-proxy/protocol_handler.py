"""
协议处理模块
负责注册和处理自定义协议
"""

import os
import sys
import winreg
import subprocess
from urllib.parse import urlparse, parse_qs
from pathlib import Path

from config import Config
from utils import Logger

class ProtocolHandler:
    def __init__(self):
        self.config = Config()
        self.logger = Logger()
        self.executable_path = self._get_executable_path()
    
    def _get_executable_path(self) -> str:
        """获取当前可执行文件路径"""
        if getattr(sys, 'frozen', False):
            # 打包后的exe文件
            return sys.executable
        else:
            # 开发环境
            return f'"{sys.executable}" "{os.path.abspath(__file__)}"'
    
    def register_protocols(self):
        """注册所有协议"""
        protocols = [
            'augment-vscode',
            'augment-cursor', 
            'augment-jetbrains'
        ]
        
        for protocol in protocols:
            try:
                self._register_protocol(protocol)
                self.logger.info(f"Protocol registered: {protocol}")
            except Exception as e:
                self.logger.error(f"Failed to register protocol {protocol}: {e}")
    
    def _register_protocol(self, protocol_name: str):
        """注册单个协议"""
        try:
            # 打开注册表键
            key_path = f"SOFTWARE\\Classes\\{protocol_name}"
            
            # 创建协议键
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, f"URL:{protocol_name} Protocol")
                winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            
            # 创建shell/open/command键
            command_path = f"{key_path}\\shell\\open\\command"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, command_path) as key:
                command = f'"{self.executable_path}" "%1"'
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, command)
            
            # 创建DefaultIcon键
            icon_path = f"{key_path}\\DefaultIcon"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, icon_path) as key:
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, f"{self.executable_path},0")
                
        except Exception as e:
            self.logger.error(f"Failed to register protocol {protocol_name}: {e}")
            raise
    
    def unregister_protocols(self):
        """注销所有协议"""
        protocols = [
            'augment-vscode',
            'augment-cursor',
            'augment-jetbrains'
        ]
        
        for protocol in protocols:
            try:
                self._unregister_protocol(protocol)
                self.logger.info(f"Protocol unregistered: {protocol}")
            except Exception as e:
                self.logger.error(f"Failed to unregister protocol {protocol}: {e}")
    
    def _unregister_protocol(self, protocol_name: str):
        """注销单个协议"""
        try:
            key_path = f"SOFTWARE\\Classes\\{protocol_name}"
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
        except FileNotFoundError:
            # 协议不存在，忽略
            pass
        except Exception as e:
            self.logger.error(f"Failed to unregister protocol {protocol_name}: {e}")
            raise
    
    def handle_protocol(self, protocol_url: str) -> dict:
        """处理协议调用"""
        try:
            self.logger.info(f"Handling protocol URL: {protocol_url}")
            
            # 解析URL
            parsed = urlparse(protocol_url)
            protocol = parsed.scheme
            path = parsed.path.lstrip('/')
            params = parse_qs(parsed.query)
            
            # 提取参数
            token = params.get('token', [None])[0]
            url = params.get('url', [None])[0]
            portal = params.get('portal', [None])[0]
            
            if not token or not url:
                raise ValueError("Missing required parameters: token and url")
            
            # 根据协议类型处理
            if protocol in ['vscode', 'cursor', 'kiro', 'trae', 'windsurf', 'qoder', 'vscodium', 'codebuddy']:
                return self._handle_vscode_protocol(protocol, token, url, portal)
            elif protocol == 'jetbrains':
                ide_name = path.split('/')[0] if '/' in path else 'idea'
                return self._handle_jetbrains_protocol(ide_name, token, url, portal)
            else:
                raise ValueError(f"Unknown protocol: {protocol}")
                
        except Exception as e:
            self.logger.error(f"Failed to handle protocol: {e}")
            raise
    
    def _handle_vscode_protocol(self, editor_type: str, token: str, url: str, portal: str = None) -> dict:
        """处理VSCode系编辑器协议"""
        try:
            from account_manager import AccountManager
            
            # 创建临时账号数据
            account_data = {
                'access_token': token,
                'tenant_url': url,
                'portal_url': portal or '',
                'email_note': f'Protocol import - {editor_type}'
            }
            
            # 添加账号
            account_manager = AccountManager()
            account_id = account_manager.add_account(account_data)
            
            # 切换到该账号
            result = account_manager.switch_account(account_id, editor_type)
            
            return {
                'success': True,
                'method': 'protocol_handler',
                'editor_type': editor_type,
                'account_id': account_id,
                'result': result
            }
            
        except Exception as e:
            self.logger.error(f"Failed to handle VSCode protocol: {e}")
            raise
    
    def _handle_jetbrains_protocol(self, ide_name: str, token: str, url: str, portal: str = None) -> dict:
        """处理JetBrains编辑器协议"""
        try:
            from account_manager import AccountManager
            
            # 创建临时账号数据
            account_data = {
                'access_token': token,
                'tenant_url': url,
                'portal_url': portal or '',
                'email_note': f'Protocol import - {ide_name}'
            }
            
            # 添加账号
            account_manager = AccountManager()
            account_id = account_manager.add_account(account_data)
            
            # 切换到该账号
            result = account_manager.switch_account(account_id, ide_name)
            
            return {
                'success': True,
                'method': 'protocol_handler',
                'editor_type': ide_name,
                'account_id': account_id,
                'result': result
            }
            
        except Exception as e:
            self.logger.error(f"Failed to handle JetBrains protocol: {e}")
            raise
    
    def create_jetbrains_token_file(self, editor_type: str, token_data: dict) -> str:
        """为JetBrains编辑器创建令牌文件"""
        try:
            # 获取临时目录
            temp_dir = self.config.get_temp_dir()
            
            # 创建文件名
            filename = f"augment-{editor_type}-token.json"
            file_path = temp_dir / filename
            
            # 写入文件
            import json
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(token_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"JetBrains token file created: {file_path}")
            
            return str(file_path)
            
        except Exception as e:
            self.logger.error(f"Failed to create JetBrains token file: {e}")
            raise
    
    def open_editor_with_protocol(self, protocol_url: str):
        """通过协议打开编辑器"""
        try:
            # 在Windows上使用start命令打开协议URL
            if os.name == 'nt':
                subprocess.run(['start', protocol_url], shell=True, check=True)
            else:
                # Linux/Mac上使用xdg-open或open
                if sys.platform.startswith('linux'):
                    subprocess.run(['xdg-open', protocol_url], check=True)
                elif sys.platform == 'darwin':
                    subprocess.run(['open', protocol_url], check=True)
                else:
                    raise OSError(f"Unsupported platform: {sys.platform}")
            
            self.logger.info(f"Editor opened with protocol: {protocol_url}")
            
        except Exception as e:
            self.logger.error(f"Failed to open editor with protocol: {e}")
            raise
    
    def test_protocol(self, protocol_name: str) -> bool:
        """测试协议是否正确注册"""
        try:
            key_path = f"SOFTWARE\\Classes\\{protocol_name}"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path):
                return True
        except FileNotFoundError:
            return False
        except Exception as e:
            self.logger.error(f"Failed to test protocol {protocol_name}: {e}")
            return False
