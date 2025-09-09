"""
配置管理模块
"""

import os
import json
from pathlib import Path

class Config:
    def __init__(self):
        self.app_name = "Augment Token Manager"
        self.service_name = "augment-proxy"
        self.version = "1.0.0"
        
        # 端口范围
        self.port_range = (8899, 8903)
        
        # 支持的编辑器
        self.supported_editors = {
            # VSCode系编辑器
            'vscode': {
                'name': 'Visual Studio Code',
                'protocol': 'vscode',
                'type': 'vscode',
                'config_path': self._get_vscode_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'cursor': {
                'name': 'Cursor',
                'protocol': 'cursor',
                'type': 'vscode',
                'config_path': self._get_cursor_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'vscodium': {
                'name': 'VSCodium',
                'protocol': 'vscodium',
                'type': 'vscode',
                'config_path': self._get_vscodium_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'windsurf': {
                'name': 'Windsurf',
                'protocol': 'windsurf',
                'type': 'vscode',
                'config_path': self._get_windsurf_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'kiro': {
                'name': 'Kiro',
                'protocol': 'kiro',
                'type': 'vscode',
                'config_path': self._get_kiro_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'trae': {
                'name': 'Trae',
                'protocol': 'trae',
                'type': 'vscode',
                'config_path': self._get_trae_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'qoder': {
                'name': 'Qoder',
                'protocol': 'qoder',
                'type': 'vscode',
                'config_path': self._get_qoder_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            'codebuddy': {
                'name': 'CodeBuddy',
                'protocol': 'codebuddy',
                'type': 'vscode',
                'config_path': self._get_codebuddy_config_path(),
                'extension_id': 'Augment.vscode-augment'
            },
            
            # JetBrains系编辑器
            'idea': {
                'name': 'IntelliJ IDEA',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'idea',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'pycharm': {
                'name': 'PyCharm',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'pycharm',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'goland': {
                'name': 'GoLand',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'goland',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'webstorm': {
                'name': 'WebStorm',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'webstorm',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'phpstorm': {
                'name': 'PhpStorm',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'phpstorm',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'rustrover': {
                'name': 'RustRover',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'rustrover',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'clion': {
                'name': 'CLion',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'clion',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'rider': {
                'name': 'Rider',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'rider',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'datagrip': {
                'name': 'DataGrip',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'datagrip',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'androidstudio': {
                'name': 'Android Studio',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'androidstudio',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'rubymine': {
                'name': 'RubyMine',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'rubymine',
                'extension_id': 'Augment.jetbrains-augment'
            },
            'aqua': {
                'name': 'Aqua',
                'protocol': 'jetbrains',
                'type': 'jetbrains',
                'ide_name': 'aqua',
                'extension_id': 'Augment.jetbrains-augment'
            }
        }
        
        # 协议映射
        self.protocol_mapping = {
            'augment-vscode': 'vscode',
            'augment-cursor': 'cursor',
            'augment-jetbrains': 'jetbrains'
        }
    
    def _get_user_home(self):
        """获取用户主目录"""
        return Path.home()
    
    def _get_appdata_roaming(self):
        """获取AppData/Roaming目录"""
        return Path(os.environ.get('APPDATA', self._get_user_home() / 'AppData' / 'Roaming'))
    
    def _get_appdata_local(self):
        """获取AppData/Local目录"""
        return Path(os.environ.get('LOCALAPPDATA', self._get_user_home() / 'AppData' / 'Local'))
    
    def _get_vscode_config_path(self):
        """获取VSCode配置路径"""
        return self._get_appdata_roaming() / 'Code' / 'User'
    
    def _get_cursor_config_path(self):
        """获取Cursor配置路径"""
        return self._get_appdata_roaming() / 'Cursor' / 'User'
    
    def _get_vscodium_config_path(self):
        """获取VSCodium配置路径"""
        return self._get_appdata_roaming() / 'VSCodium' / 'User'
    
    def _get_windsurf_config_path(self):
        """获取Windsurf配置路径"""
        return self._get_appdata_roaming() / 'Windsurf' / 'User'
    
    def _get_kiro_config_path(self):
        """获取Kiro配置路径"""
        return self._get_appdata_roaming() / 'Kiro' / 'User'
    
    def _get_trae_config_path(self):
        """获取Trae配置路径"""
        return self._get_appdata_roaming() / 'Trae' / 'User'
    
    def _get_qoder_config_path(self):
        """获取Qoder配置路径"""
        return self._get_appdata_roaming() / 'Qoder' / 'User'
    
    def _get_codebuddy_config_path(self):
        """获取CodeBuddy配置路径"""
        return self._get_appdata_roaming() / 'CodeBuddy' / 'User'
    
    def get_jetbrains_config_path(self, ide_name):
        """获取JetBrains IDE配置路径"""
        appdata = self._get_appdata_roaming()
        
        # JetBrains IDE配置路径映射
        jetbrains_paths = {
            'idea': 'JetBrains/IntelliJIdea*/config',
            'pycharm': 'JetBrains/PyCharm*/config',
            'goland': 'JetBrains/GoLand*/config',
            'webstorm': 'JetBrains/WebStorm*/config',
            'phpstorm': 'JetBrains/PhpStorm*/config',
            'rustrover': 'JetBrains/RustRover*/config',
            'clion': 'JetBrains/CLion*/config',
            'rider': 'JetBrains/Rider*/config',
            'datagrip': 'JetBrains/DataGrip*/config',
            'androidstudio': 'Google/AndroidStudio*/config',
            'rubymine': 'JetBrains/RubyMine*/config',
            'aqua': 'JetBrains/Aqua*/config'
        }
        
        path_pattern = jetbrains_paths.get(ide_name)
        if path_pattern:
            return appdata / path_pattern
        
        return None
    
    def get_temp_dir(self):
        """获取临时目录"""
        return Path(os.environ.get('TEMP', '/tmp'))
    
    def get_editor_config(self, editor_type):
        """获取编辑器配置"""
        return self.supported_editors.get(editor_type)
