#!/usr/bin/env python3
"""
从浏览器自动提取YouTube Cookies
支持Chrome、Firefox、Edge等主流浏览器
"""

import os
import sys
import json
import sqlite3
import shutil
from pathlib import Path
import platform

def find_browser_cookies():
    """查找并提取浏览器中的YouTube cookies"""
    
    system = platform.system()
    cookies_data = []
    
    # Chrome/Chromium cookies路径
    chrome_paths = []
    if system == "Windows":
        chrome_paths = [
            os.path.expanduser("~\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cookies"),
            os.path.expanduser("~\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cookies"),
            os.path.expanduser("~\\AppData\\Local\\Chromium\\User Data\\Default\\Cookies"),
        ]
    elif system == "Darwin":  # macOS
        chrome_paths = [
            os.path.expanduser("~/Library/Application Support/Google/Chrome/Default/Cookies"),
            os.path.expanduser("~/Library/Application Support/Microsoft Edge/Default/Cookies"),
        ]
    elif system == "Linux":
        chrome_paths = [
            os.path.expanduser("~/.config/google-chrome/Default/Cookies"),
            os.path.expanduser("~/.config/chromium/Default/Cookies"),
        ]
    
    # Firefox cookies路径
    firefox_paths = []
    if system == "Windows":
        firefox_profile_path = os.path.expanduser("~\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles")
    elif system == "Darwin":
        firefox_profile_path = os.path.expanduser("~/Library/Application Support/Firefox/Profiles")
    elif system == "Linux":
        firefox_profile_path = os.path.expanduser("~/.mozilla/firefox")
    
    if os.path.exists(firefox_profile_path):
        for profile in os.listdir(firefox_profile_path):
            if profile.endswith('.default') or profile.endswith('.default-release'):
                firefox_paths.append(os.path.join(firefox_profile_path, profile, "cookies.sqlite"))
    
    print("🔍 搜索浏览器cookies...")
    
    # 提取Chrome系列浏览器cookies
    for chrome_path in chrome_paths:
        if os.path.exists(chrome_path):
            print(f"📁 找到Chrome cookies: {chrome_path}")
            try:
                cookies_data.extend(extract_chrome_cookies(chrome_path))
            except Exception as e:
                print(f"❌ 提取Chrome cookies失败: {e}")
    
    # 提取Firefox cookies
    for firefox_path in firefox_paths:
        if os.path.exists(firefox_path):
            print(f"📁 找到Firefox cookies: {firefox_path}")
            try:
                cookies_data.extend(extract_firefox_cookies(firefox_path))
            except Exception as e:
                print(f"❌ 提取Firefox cookies失败: {e}")
    
    return cookies_data

def extract_chrome_cookies(cookies_path):
    """从Chrome cookies数据库提取YouTube相关cookies"""
    cookies = []
    
    # 复制cookies文件到临时位置（避免锁定问题）
    temp_path = cookies_path + ".temp"
    try:
        shutil.copy2(cookies_path, temp_path)
        
        conn = sqlite3.connect(temp_path)
        cursor = conn.cursor()
        
        # 查询YouTube相关cookies
        query = """
        SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly
        FROM cookies 
        WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google%'
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        for row in rows:
            host_key, name, value, path, expires_utc, is_secure, is_httponly = row
            
            # 重要的YouTube cookies
            important_cookies = [
                'VISITOR_INFO1_LIVE', 'YSC', 'PREF', 'CONSENT', 'SOCS',
                '__Secure-3PSID', '__Secure-3PAPISID', '__Secure-3PSIDCC',
                'HSID', 'SSID', 'APISID', 'SAPISID', 'SID', 'SIDCC', 'LOGIN_INFO'
            ]
            
            if any(important in name for important in important_cookies):
                cookies.append({
                    'domain': host_key,
                    'name': name,
                    'value': value,
                    'path': path,
                    'expires': expires_utc,
                    'secure': bool(is_secure),
                    'httponly': bool(is_httponly)
                })
        
        conn.close()
        
    finally:
        # 清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    return cookies

def extract_firefox_cookies(cookies_path):
    """从Firefox cookies数据库提取YouTube相关cookies"""
    cookies = []
    
    try:
        conn = sqlite3.connect(cookies_path)
        cursor = conn.cursor()
        
        query = """
        SELECT host, name, value, path, expiry, isSecure, isHttpOnly
        FROM moz_cookies 
        WHERE host LIKE '%youtube%' OR host LIKE '%google%'
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        for row in rows:
            host, name, value, path, expiry, is_secure, is_httponly = row
            
            important_cookies = [
                'VISITOR_INFO1_LIVE', 'YSC', 'PREF', 'CONSENT', 'SOCS',
                '__Secure-3PSID', '__Secure-3PAPISID', '__Secure-3PSIDCC',
                'HSID', 'SSID', 'APISID', 'SAPISID', 'SID', 'SIDCC', 'LOGIN_INFO'
            ]
            
            if any(important in name for important in important_cookies):
                cookies.append({
                    'domain': host,
                    'name': name,
                    'value': value,
                    'path': path,
                    'expires': expiry,
                    'secure': bool(is_secure),
                    'httponly': bool(is_httponly)
                })
        
        conn.close()
        
    except Exception as e:
        print(f"Firefox cookies提取失败: {e}")
    
    return cookies

def save_cookies_txt(cookies, output_path):
    """将cookies保存为Netscape格式的cookies.txt文件"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Netscape HTTP Cookie File\n")
        f.write("# This is a generated file! Do not edit.\n\n")
        
        for cookie in cookies:
            domain = cookie['domain']
            if not domain.startswith('.'):
                domain = '.' + domain
            
            flag = 'TRUE'
            path = cookie['path']
            secure = 'TRUE' if cookie['secure'] else 'FALSE'
            expires = cookie['expires'] if cookie['expires'] else 0
            name = cookie['name']
            value = cookie['value']
            
            f.write(f"{domain}\t{flag}\t{path}\t{secure}\t{expires}\t{name}\t{value}\n")
    
    print(f"✅ Cookies已保存到: {output_path}")

def main():
    """主函数"""
    print("🍪 YouTube Cookies 自动提取工具")
    print("=" * 50)
    
    # 检查是否有浏览器在运行
    print("⚠️  请确保：")
    print("1. 您已在浏览器中登录YouTube")
    print("2. 关闭所有浏览器窗口（避免数据库锁定）")
    print("3. 运行此脚本")
    
    input("\n按Enter键继续...")
    
    # 提取cookies
    cookies = find_browser_cookies()
    
    if not cookies:
        print("❌ 未找到YouTube cookies，请确保：")
        print("1. 已在浏览器中登录YouTube")
        print("2. 浏览器已完全关闭")
        return
    
    print(f"✅ 找到 {len(cookies)} 个YouTube相关cookies")
    
    # 保存cookies
    output_dir = Path(__file__).parent.parent / "config"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "cookies.txt"
    
    save_cookies_txt(cookies, output_path)
    
    print("\n🎉 Cookies提取完成！")
    print(f"📁 文件位置: {output_path}")
    print("\n下一步：")
    print("1. 重启您的应用服务器")
    print("2. 测试YouTube视频下载功能")

if __name__ == "__main__":
    main()
