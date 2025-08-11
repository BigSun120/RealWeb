#!/usr/bin/env python3
"""
使用yt-dlp和cookies获取YouTube视频信息
这是pytube的替代方案，支持cookies认证
"""

import sys
import json
import os
import subprocess
import traceback
from pathlib import Path

def get_video_info_with_ytdlp(url):
    """使用yt-dlp获取YouTube视频信息"""
    try:
        # 检查yt-dlp是否可用
        try:
            subprocess.run(['python', '-m', 'yt_dlp', '--version'],
                         capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return {
                'success': False,
                'error': 'yt-dlp not available',
                'error_type': 'tool_unavailable',
                'details': 'Please install yt-dlp: pip install yt-dlp'
            }

        # 构建yt-dlp命令
        cmd = ['python', '-m', 'yt_dlp', '--print-json', '--skip-download']

        # 检查cookies文件
        cookies_path = Path(__file__).parent.parent / 'config' / 'cookies.txt'
        if cookies_path.exists():
            cmd.extend(['--cookies', str(cookies_path)])
            print(f"使用cookies文件: {cookies_path}")
        else:
            print("未找到cookies文件，使用无认证模式")

        # 添加其他选项来避免限制
        cmd.extend([
            '--no-check-certificate',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--sleep-interval', '1',
            '--max-sleep-interval', '5',
            '--extractor-retries', '3',
            '--fragment-retries', '3',
            '--retry-sleep', 'linear=1::2',
            url
        ])

        print(f"执行命令: {' '.join(cmd)}")

        # 执行命令
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            error_output = result.stderr
            print(f"yt-dlp错误输出: {error_output}")

            # 分析错误类型
            if 'HTTP Error 429' in error_output:
                return {
                    'success': False,
                    'error': 'Too many requests. Please try again later or use cookies.',
                    'error_type': 'rate_limited',
                    'details': error_output
                }
            elif 'Sign in to confirm' in error_output:
                return {
                    'success': False,
                    'error': 'YouTube requires sign-in. Please provide valid cookies.',
                    'error_type': 'auth_required',
                    'details': error_output
                }
            elif 'Video unavailable' in error_output:
                return {
                    'success': False,
                    'error': 'Video is unavailable',
                    'error_type': 'unavailable',
                    'details': error_output
                }
            else:
                return {
                    'success': False,
                    'error': f'yt-dlp failed: {error_output}',
                    'error_type': 'ytdlp_error',
                    'details': error_output
                }

        # 解析JSON输出
        try:
            video_data = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Failed to parse yt-dlp output: {e}',
                'error_type': 'parse_error',
                'details': result.stdout
            }

        # 转换为统一格式
        video_info = {
            'success': True,
            'title': video_data.get('title', 'Unknown'),
            'length': video_data.get('duration', 0),
            'views': video_data.get('view_count', 0),
            'rating': video_data.get('average_rating'),
            'author': video_data.get('uploader', 'Unknown'),
            'description': video_data.get('description', '')[:500] + '...' if video_data.get('description', '') else '',
            'thumbnail_url': video_data.get('thumbnail'),
            'publish_date': video_data.get('upload_date'),
            'video_id': video_data.get('id'),
            'channel_url': video_data.get('uploader_url'),
            'keywords': video_data.get('tags', [])[:10],
        }

        # 处理格式信息
        formats = video_data.get('formats', [])

        streams_data = []
        audio_streams = []
        video_streams = []

        for fmt in formats:
            stream_info = {
                'itag': fmt.get('format_id'),
                'mime_type': fmt.get('ext'),
                'type': 'video' if fmt.get('vcodec') != 'none' else 'audio',
                'subtype': fmt.get('ext'),
                'filesize': fmt.get('filesize', 0),
                'filesize_mb': round(fmt.get('filesize', 0) / 1024 / 1024, 2) if fmt.get('filesize') else 0,
                'is_progressive': fmt.get('acodec') != 'none' and fmt.get('vcodec') != 'none',
                'includes_audio_track': fmt.get('acodec') != 'none',
                'includes_video_track': fmt.get('vcodec') != 'none',
            }

            # 视频流信息
            if fmt.get('vcodec') != 'none':
                stream_info.update({
                    'resolution': f"{fmt.get('height', 0)}p" if fmt.get('height') else None,
                    'fps': fmt.get('fps'),
                    'video_codec': fmt.get('vcodec'),
                })
                video_streams.append(stream_info)

            # 音频流信息
            if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                stream_info.update({
                    'abr': f"{fmt.get('abr', 0)}kbps" if fmt.get('abr') else None,
                    'audio_codec': fmt.get('acodec'),
                })
                audio_streams.append(stream_info)

            streams_data.append(stream_info)

        # 按质量排序
        video_streams.sort(key=lambda x: int(x['resolution'][:-1]) if x['resolution'] else 0, reverse=True)
        audio_streams.sort(key=lambda x: int(x['abr'][:-4]) if x['abr'] else 0, reverse=True)

        video_info['streams'] = {
            'all': streams_data,
            'video_only': [s for s in video_streams if not s['includes_audio_track']],
            'audio_only': audio_streams,
            'progressive': [s for s in video_streams if s['is_progressive']],
        }

        # 推荐格式
        recommended = []

        # 推荐1：最佳progressive流
        best_progressive = None
        for stream in video_streams:
            if stream['is_progressive'] and stream['resolution']:
                best_progressive = stream
                break

        if best_progressive:
            recommended.append({
                'id': 'best_progressive',
                'name': '推荐：最佳质量（音视频合并）',
                'itag': best_progressive['itag'],
                'description': f"{best_progressive['resolution']} {best_progressive['subtype']}格式",
                'type': 'progressive'
            })

        # 推荐2：720p progressive
        for stream in video_streams:
            if stream['is_progressive'] and stream['resolution'] == '720p':
                recommended.append({
                    'id': '720p_progressive',
                    'name': '推荐：720p高清',
                    'itag': stream['itag'],
                    'description': f"720p {stream['subtype']}格式，兼容性好",
                    'type': 'progressive'
                })
                break

        video_info['recommended'] = recommended

        return video_info

    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Request timeout. YouTube may be blocking requests.',
            'error_type': 'timeout',
            'details': 'The request took too long to complete'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'error_type': 'unknown',
            'details': traceback.format_exc()
        }

def main():
    """主函数"""
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python youtube_info_ytdlp.py <youtube_url>'
        }))
        sys.exit(1)

    url = sys.argv[1]
    result = get_video_info_with_ytdlp(url)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
