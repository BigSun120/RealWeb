#!/usr/bin/env python3
"""
爱奇艺视频解析器 - 简化但稳定版本
支持execjs但不依赖复杂的认证逻辑
"""

import requests
import re
import time
import json
import sys
import traceback
import os
import io

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class IqiyiParserSimple:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # 检查是否支持execjs
        self.has_execjs = False
        try:
            import execjs
            self.has_execjs = True
            print("✅ 检测到execjs支持")
        except ImportError:
            print("⚠️ 未安装execjs，使用基础解析模式")

    def extract_video_id(self, url):
        """从URL中提取视频ID"""
        try:
            # 方法1: 从URL路径提取
            vid_match = re.search(r'v_([a-zA-Z0-9]+)\.html', url)
            if vid_match:
                return vid_match.group(1)
            
            # 方法2: 从URL参数提取
            vid_match = re.search(r'vid=([a-zA-Z0-9]+)', url)
            if vid_match:
                return vid_match.group(1)
            
            return None
        except:
            return None

    def get_tvid_vid_from_page(self, url):
        """从页面源码获取tvid和vid"""
        try:
            headers = self.headers.copy()
            headers["Referer"] = "https://www.iqiyi.com/"
            
            res = requests.get(url, headers=headers, timeout=15)
            res.encoding = 'utf-8'
            
            # 尝试多种正则表达式
            patterns = [
                (r'"tvId":"([^"]+)"', r'"vid":"([^"]+)"'),
                (r'tvid["\']?\s*[:=]\s*["\']?([A-Za-z0-9]+)', r'vid["\']?\s*[:=]\s*["\']?([A-Za-z0-9]+)'),
                (r'data-player-tvid="([^"]+)"', r'data-player-videoid="([^"]+)"'),
                (r'"albumId":([0-9]+)', r'"tvId":([0-9]+)'),
            ]
            
            for tvid_pattern, vid_pattern in patterns:
                tvid_match = re.search(tvid_pattern, res.text)
                vid_match = re.search(vid_pattern, res.text)
                
                if tvid_match and vid_match:
                    return tvid_match.group(1), vid_match.group(1)
            
            # 如果都失败了，尝试从URL提取
            vid_from_url = self.extract_video_id(url)
            if vid_from_url:
                return vid_from_url, vid_from_url
            
            return None, None
            
        except Exception as e:
            print(f"从页面获取ID失败: {e}")
            return None, None

    def get_page_info(self, url):
        """从页面获取视频信息"""
        try:
            headers = self.headers.copy()
            headers["Referer"] = "https://www.iqiyi.com/"
            
            res = requests.get(url, headers=headers, timeout=15)
            res.encoding = 'utf-8'
            
            result = {}
            
            # 提取标题
            title_patterns = [
                r'<title[^>]*>([^<]+)</title>',
                r'"albumName":"([^"]+)"',
                r'"name":"([^"]+)"',
                r'data-player-name="([^"]+)"'
            ]
            
            for pattern in title_patterns:
                title_match = re.search(pattern, res.text)
                if title_match:
                    title = title_match.group(1).strip()
                    # 清理标题
                    title = re.sub(r'[-_].*?爱奇艺.*$', '', title).strip()
                    title = re.sub(r'_高清视频在线观看.*$', '', title).strip()
                    if title and title != '爱奇艺' and len(title) > 2:
                        result['title'] = title
                        break
            
            # 提取描述
            desc_patterns = [
                r'"description":"([^"]+)"',
                r'<meta name="description" content="([^"]+)"'
            ]
            
            for pattern in desc_patterns:
                desc_match = re.search(pattern, res.text)
                if desc_match:
                    description = desc_match.group(1).strip()
                    if description and len(description) > 10:
                        result['description'] = description[:200] + '...' if len(description) > 200 else description
                        break
            
            # 提取缩略图
            thumb_patterns = [
                r'"img":"([^"]+)"',
                r'data-player-poster="([^"]+)"',
                r'"albumImg":"([^"]+)"'
            ]
            
            for pattern in thumb_patterns:
                thumb_match = re.search(pattern, res.text)
                if thumb_match:
                    thumbnail = thumb_match.group(1).strip()
                    if thumbnail.startswith('http'):
                        result['thumbnail'] = thumbnail
                        break
            
            return result
            
        except Exception as e:
            print(f"获取页面信息失败: {e}")
            return {}

    def parse_video(self, url):
        """解析爱奇艺视频"""
        try:
            # 获取tvid和vid
            tvid, vid = self.get_tvid_vid_from_page(url)
            
            if not tvid or not vid:
                return {
                    'success': False,
                    'error': '无法获取视频ID，可能是私有视频或链接无效',
                    'error_type': 'id_extraction_failed'
                }

            # 构建基本信息
            video_info = {
                'success': True,
                'platform': 'iqiyi',
                'tvid': tvid,
                'vid': vid,
                'title': '爱奇艺视频',
                'thumbnail': '',
                'duration': 0,
                'uploader': '爱奇艺',
                'description': '',
                'url': url,
                'streams': {
                    'available': [],
                    'recommended': []
                }
            }

            # 获取页面信息
            try:
                page_info = self.get_page_info(url)
                if page_info:
                    video_info.update(page_info)
            except:
                pass

            return video_info

        except Exception as e:
            return {
                'success': False,
                'error': f'解析失败: {str(e)}',
                'error_type': 'parsing_failed',
                'details': traceback.format_exc()
            }


def main():
    """命令行接口"""
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python iqiyi_parser_simple.py <iqiyi_url>'
        }, ensure_ascii=False))
        sys.exit(1)
    
    url = sys.argv[1]
    
    # 验证是否为爱奇艺链接
    if 'iqiyi.com' not in url:
        print(json.dumps({
            'success': False,
            'error': '不是有效的爱奇艺链接',
            'error_type': 'invalid_url'
        }, ensure_ascii=False))
        sys.exit(1)
    
    parser = IqiyiParserSimple()
    result = parser.parse_video(url)
    
    # 确保中文字符正确输出
    output = json.dumps(result, ensure_ascii=False, indent=2)
    print(output)


if __name__ == '__main__':
    main()
