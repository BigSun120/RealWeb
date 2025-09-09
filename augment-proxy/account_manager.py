"""
账号管理模块
负责令牌的存储、切换和编辑器配置
"""

import os
import json
import glob
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

from config import Config
from utils import Logger

class AccountManager:
    def __init__(self):
        self.config = Config()
        self.logger = Logger()
        self.accounts_file = self.config.get_temp_dir() / 'augment-accounts.json'
        self.current_account_file = self.config.get_temp_dir() / 'augment-current-account.json'
        
        # 确保文件存在
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """确保必要的文件存在"""
        if not self.accounts_file.exists():
            self._save_accounts({})
        
        if not self.current_account_file.exists():
            self._save_current_account(None)
    
    def _load_accounts(self) -> Dict:
        """加载账号数据"""
        try:
            with open(self.accounts_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load accounts: {e}")
            return {}
    
    def _save_accounts(self, accounts: Dict):
        """保存账号数据"""
        try:
            with open(self.accounts_file, 'w', encoding='utf-8') as f:
                json.dump(accounts, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Failed to save accounts: {e}")
    
    def _load_current_account(self) -> Optional[str]:
        """加载当前账号ID"""
        try:
            with open(self.current_account_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('current_account_id')
        except Exception as e:
            self.logger.error(f"Failed to load current account: {e}")
            return None
    
    def _save_current_account(self, account_id: Optional[str]):
        """保存当前账号ID"""
        try:
            data = {
                'current_account_id': account_id,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.current_account_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Failed to save current account: {e}")
    
    def add_account(self, token_data: Dict) -> str:
        """添加账号"""
        accounts = self._load_accounts()
        
        # 生成账号ID
        account_id = f"account_{len(accounts) + 1}_{int(datetime.now().timestamp())}"
        
        # 保存账号数据
        accounts[account_id] = {
            'id': account_id,
            'access_token': token_data.get('access_token'),
            'tenant_url': token_data.get('tenant_url'),
            'portal_url': token_data.get('portal_url'),
            'email_note': token_data.get('email_note'),
            'created_at': datetime.now().isoformat(),
            'last_used': None
        }
        
        self._save_accounts(accounts)
        self.logger.info(f"Account added: {account_id}")
        
        return account_id
    
    def get_account(self, account_id: str) -> Optional[Dict]:
        """获取指定账号"""
        accounts = self._load_accounts()
        return accounts.get(account_id)
    
    def get_all_accounts(self) -> List[Dict]:
        """获取所有账号"""
        accounts = self._load_accounts()
        return list(accounts.values())
    
    def get_current_account(self) -> Optional[Dict]:
        """获取当前账号"""
        current_id = self._load_current_account()
        if current_id:
            return self.get_account(current_id)
        return None
    
    def switch_account(self, account_id: str, editor_type: str) -> Dict:
        """切换账号"""
        account = self.get_account(account_id)
        if not account:
            raise ValueError(f"Account not found: {account_id}")
        
        editor_config = self.config.get_editor_config(editor_type)
        if not editor_config:
            raise ValueError(f"Unsupported editor: {editor_type}")
        
        # 根据编辑器类型执行不同的切换逻辑
        if editor_config['type'] == 'vscode':
            result = self._switch_vscode_account(account, editor_config)
        elif editor_config['type'] == 'jetbrains':
            result = self._switch_jetbrains_account(account, editor_config)
        else:
            raise ValueError(f"Unknown editor type: {editor_config['type']}")
        
        # 更新当前账号
        self._save_current_account(account_id)
        
        # 更新最后使用时间
        accounts = self._load_accounts()
        accounts[account_id]['last_used'] = datetime.now().isoformat()
        self._save_accounts(accounts)
        
        self.logger.info(f"Account switched to {account_id} for {editor_type}")
        
        return result

    def switch_account_with_data(self, token_data: Dict, editor_type: str) -> Dict:
        """使用令牌数据直接切换账号"""
        editor_config = self.config.get_editor_config(editor_type)
        if not editor_config:
            raise ValueError(f"Unsupported editor: {editor_type}")

        # 构造账号数据格式
        account = {
            'id': token_data.get('id', ''),
            'email': token_data.get('email', ''),
            'token': token_data.get('token', ''),
            'created_at': token_data.get('created_at', ''),
            'last_used': datetime.now().isoformat()
        }

        # 根据编辑器类型执行不同的切换逻辑
        if editor_config['type'] == 'vscode':
            result = self._switch_vscode_account(account, editor_config)
        elif editor_config['type'] == 'jetbrains':
            result = self._switch_jetbrains_account(account, editor_config)
        else:
            raise ValueError(f"Unknown editor type: {editor_config['type']}")

        self.logger.info(f"Account switched with token data for {editor_type}")

        return {
            'token_id': account['id'],
            'editor_type': editor_type,
            'switched_at': datetime.now().isoformat()
        }

    def _switch_vscode_account(self, account: Dict, editor_config: Dict) -> Dict:
        """切换VSCode系编辑器账号"""
        try:
            config_path = editor_config.get('config_path')
            if not config_path or not config_path.exists():
                raise FileNotFoundError(f"Editor config path not found: {config_path}")
            
            # VSCode扩展配置文件路径
            settings_file = config_path / 'settings.json'
            
            # 读取现有配置
            settings = {}
            if settings_file.exists():
                try:
                    with open(settings_file, 'r', encoding='utf-8') as f:
                        settings = json.load(f)
                except json.JSONDecodeError:
                    settings = {}
            
            # 更新Augment配置
            settings.update({
                'augment.accessToken': account['token'],
                'augment.tenantUrl': account.get('tenant_url', ''),
                'augment.portalUrl': account.get('portal_url', ''),
                'augment.lastUpdated': datetime.now().isoformat()
            })
            
            # 保存配置
            with open(settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=2, ensure_ascii=False)
            
            return {
                'method': 'settings_file',
                'config_file': str(settings_file),
                'account_id': account['id'],
                'editor': editor_config['name']
            }
            
        except Exception as e:
            self.logger.error(f"Failed to switch VSCode account: {e}")
            raise
    
    def _switch_jetbrains_account(self, account: Dict, editor_config: Dict) -> Dict:
        """切换JetBrains系编辑器账号"""
        try:
            ide_name = editor_config.get('ide_name')
            config_path_pattern = self.config.get_jetbrains_config_path(ide_name)
            
            if not config_path_pattern:
                raise ValueError(f"Unknown JetBrains IDE: {ide_name}")
            
            # 查找实际的配置目录
            config_dirs = glob.glob(str(config_path_pattern))
            if not config_dirs:
                raise FileNotFoundError(f"JetBrains config directory not found: {config_path_pattern}")
            
            # 使用最新的配置目录
            config_dir = Path(max(config_dirs, key=os.path.getctime))
            
            # 创建Augment插件配置目录
            plugin_config_dir = config_dir / 'options'
            plugin_config_dir.mkdir(parents=True, exist_ok=True)
            
            # Augment插件配置文件
            augment_config_file = plugin_config_dir / 'augment.xml'
            
            # 生成XML配置内容
            xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<application>
  <component name="AugmentSettings">
    <option name="accessToken" value="{account['token']}" />
    <option name="tenantUrl" value="{account.get('tenant_url', '')}" />
    <option name="portalUrl" value="{account.get('portal_url', '')}" />
    <option name="lastUpdated" value="{datetime.now().isoformat()}" />
  </component>
</application>'''
            
            # 保存配置文件
            with open(augment_config_file, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            return {
                'method': 'xml_config',
                'config_file': str(augment_config_file),
                'config_dir': str(config_dir),
                'account_id': account['id'],
                'editor': editor_config['name']
            }
            
        except Exception as e:
            self.logger.error(f"Failed to switch JetBrains account: {e}")
            raise
    
    def remove_account(self, account_id: str) -> bool:
        """删除账号"""
        accounts = self._load_accounts()
        if account_id in accounts:
            del accounts[account_id]
            self._save_accounts(accounts)
            
            # 如果删除的是当前账号，清除当前账号
            current_id = self._load_current_account()
            if current_id == account_id:
                self._save_current_account(None)
            
            self.logger.info(f"Account removed: {account_id}")
            return True
        
        return False
    
    def sync_from_web(self, web_accounts: List[Dict]) -> Dict:
        """从Web端同步账号数据"""
        try:
            # 转换Web端数据格式
            accounts = {}
            for web_account in web_accounts:
                account_id = web_account.get('id') or web_account.get('tokenId')
                if account_id:
                    accounts[account_id] = {
                        'id': account_id,
                        'access_token': web_account.get('accessToken') or web_account.get('access_token'),
                        'tenant_url': web_account.get('tenantUrl') or web_account.get('tenant_url'),
                        'portal_url': web_account.get('portalUrl') or web_account.get('portal_url'),
                        'email_note': web_account.get('emailNote') or web_account.get('email_note'),
                        'created_at': web_account.get('createdAt') or web_account.get('created_at') or datetime.now().isoformat(),
                        'last_used': web_account.get('lastUsed') or web_account.get('last_used')
                    }
            
            # 保存同步的数据
            self._save_accounts(accounts)
            
            self.logger.info(f"Synced {len(accounts)} accounts from web")
            
            return {
                'synced_count': len(accounts),
                'accounts': list(accounts.keys())
            }
            
        except Exception as e:
            self.logger.error(f"Failed to sync from web: {e}")
            raise
