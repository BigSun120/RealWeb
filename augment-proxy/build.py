#!/usr/bin/env python3
"""
构建脚本 - 使用PyInstaller打包成exe
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def build_exe():
    """构建exe文件"""
    print("🔨 开始构建Augment Token Manager配套程序...")
    
    # 检查PyInstaller
    try:
        import PyInstaller
        print(f"✅ PyInstaller版本: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller未安装，正在安装...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
    
    # 构建参数
    build_args = [
        'pyinstaller',
        '--onefile',                    # 单文件模式
        '--windowed',                   # 无控制台窗口
        '--name=AugmentTokenManager',   # 输出文件名
        '--icon=icon.ico',              # 图标文件（如果存在）
        '--add-data=config.py;.',       # 包含配置文件
        '--hidden-import=flask',        # 隐式导入
        '--hidden-import=flask_cors',
        '--hidden-import=requests',
        '--hidden-import=psutil',
        '--hidden-import=winreg',
        '--clean',                      # 清理临时文件
        'main.py'                       # 主文件
    ]
    
    # 检查图标文件
    if not Path('icon.ico').exists():
        print("⚠️  图标文件icon.ico不存在，跳过图标设置")
        build_args = [arg for arg in build_args if not arg.startswith('--icon')]
    
    try:
        # 执行构建
        print("🔄 正在构建...")
        result = subprocess.run(build_args, check=True, capture_output=True, text=True)
        
        # 检查输出文件
        exe_path = Path('dist/AugmentTokenManager.exe')
        if exe_path.exists():
            file_size = exe_path.stat().st_size / (1024 * 1024)  # MB
            print(f"✅ 构建成功！")
            print(f"📁 输出文件: {exe_path}")
            print(f"📊 文件大小: {file_size:.1f} MB")
            
            # 复制到根目录
            shutil.copy2(exe_path, 'AugmentTokenManager.exe')
            print(f"📋 已复制到: AugmentTokenManager.exe")
            
        else:
            print("❌ 构建失败：找不到输出文件")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ 构建失败: {e}")
        print(f"错误输出: {e.stderr}")
        return False
    
    return True

def clean_build():
    """清理构建文件"""
    print("🧹 清理构建文件...")
    
    dirs_to_remove = ['build', 'dist', '__pycache__']
    files_to_remove = ['*.spec']
    
    for dir_name in dirs_to_remove:
        if Path(dir_name).exists():
            shutil.rmtree(dir_name)
            print(f"🗑️  删除目录: {dir_name}")
    
    import glob
    for pattern in files_to_remove:
        for file_path in glob.glob(pattern):
            os.remove(file_path)
            print(f"🗑️  删除文件: {file_path}")

def create_installer():
    """创建安装程序（可选）"""
    print("📦 创建安装程序...")
    
    # 这里可以集成NSIS或其他安装程序生成器
    # 暂时跳过
    print("⚠️  安装程序生成功能待实现")

def main():
    """主函数"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'clean':
            clean_build()
        elif command == 'installer':
            create_installer()
        elif command == 'build':
            build_exe()
        else:
            print(f"未知命令: {command}")
            print("可用命令: build, clean, installer")
    else:
        # 默认构建
        build_exe()

if __name__ == '__main__':
    main()
