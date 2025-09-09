"""
工具函数模块
"""

import os
import sys
import socket
import logging
from datetime import datetime
from pathlib import Path

class Logger:
    """日志管理器"""
    
    def __init__(self, name="augment-proxy"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # 避免重复添加处理器
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """设置日志处理器"""
        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # 文件处理器
        log_dir = Path.home() / '.augment-proxy' / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / f"augment-proxy-{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        
        # 格式化器
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        # 添加处理器
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
    
    def debug(self, message):
        self.logger.debug(message)
    
    def info(self, message):
        self.logger.info(message)
    
    def warning(self, message):
        self.logger.warning(message)
    
    def error(self, message):
        self.logger.error(message)
    
    def critical(self, message):
        self.logger.critical(message)

def find_available_port(start_port: int, end_port: int) -> int:
    """查找可用端口"""
    for port in range(start_port, end_port + 1):
        if is_port_available(port):
            return port
    return None

def is_port_available(port: int) -> bool:
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', port))
            return result != 0
    except Exception:
        return False

def get_process_id() -> int:
    """获取当前进程ID"""
    return os.getpid()

def is_admin() -> bool:
    """检查是否以管理员权限运行"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False

def ensure_directory(path: Path):
    """确保目录存在"""
    path.mkdir(parents=True, exist_ok=True)

def safe_json_load(file_path: Path, default=None):
    """安全加载JSON文件"""
    try:
        if file_path.exists():
            import json
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return default or {}

def safe_json_save(file_path: Path, data):
    """安全保存JSON文件"""
    try:
        import json
        ensure_directory(file_path.parent)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False

def get_system_info() -> dict:
    """获取系统信息"""
    import platform
    
    return {
        'platform': platform.system(),
        'platform_version': platform.version(),
        'architecture': platform.architecture()[0],
        'python_version': platform.python_version(),
        'hostname': platform.node(),
        'user': os.environ.get('USERNAME', os.environ.get('USER', 'unknown'))
    }

def format_file_size(size_bytes: int) -> str:
    """格式化文件大小"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

def validate_url(url: str) -> bool:
    """验证URL格式"""
    try:
        from urllib.parse import urlparse
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False

def validate_token(token: str) -> bool:
    """验证令牌格式"""
    if not token or not isinstance(token, str):
        return False
    
    # 基本长度检查
    if len(token) < 10:
        return False
    
    # 检查是否包含基本字符
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', token):
        return False
    
    return True

def create_backup(file_path: Path) -> Path:
    """创建文件备份"""
    if not file_path.exists():
        return None
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = file_path.with_suffix(f'.backup_{timestamp}{file_path.suffix}')
    
    try:
        import shutil
        shutil.copy2(file_path, backup_path)
        return backup_path
    except Exception:
        return None

def cleanup_old_backups(directory: Path, pattern: str, keep_count: int = 5):
    """清理旧备份文件"""
    try:
        import glob
        backup_files = glob.glob(str(directory / pattern))
        backup_files.sort(key=os.path.getctime, reverse=True)
        
        # 删除超出保留数量的备份
        for backup_file in backup_files[keep_count:]:
            try:
                os.remove(backup_file)
            except Exception:
                pass
    except Exception:
        pass

def get_editor_executable_path(editor_name: str) -> str:
    """获取编辑器可执行文件路径"""
    # 常见编辑器的可执行文件名
    editor_executables = {
        'vscode': 'Code.exe',
        'cursor': 'Cursor.exe',
        'vscodium': 'VSCodium.exe',
        'windsurf': 'Windsurf.exe',
        'kiro': 'Kiro.exe',
        'trae': 'Trae.exe',
        'qoder': 'Qoder.exe',
        'codebuddy': 'CodeBuddy.exe'
    }
    
    executable = editor_executables.get(editor_name.lower())
    if not executable:
        return None
    
    # 在PATH中查找
    import shutil
    return shutil.which(executable)

def is_process_running(process_name: str) -> bool:
    """检查进程是否运行"""
    try:
        import psutil
        for proc in psutil.process_iter(['name']):
            if proc.info['name'] and proc.info['name'].lower() == process_name.lower():
                return True
    except Exception:
        pass
    return False

def kill_process_by_name(process_name: str) -> bool:
    """根据进程名终止进程"""
    try:
        import psutil
        killed = False
        for proc in psutil.process_iter(['name', 'pid']):
            if proc.info['name'] and proc.info['name'].lower() == process_name.lower():
                proc.terminate()
                killed = True
        return killed
    except Exception:
        return False
