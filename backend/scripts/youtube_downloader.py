#!/usr/bin/env python3
"""
YouTube视频下载脚本
使用pytube下载YouTube视频
"""

import sys
import json
import os
import time
import traceback
from pytube import YouTube
from pytube.exceptions import (
    VideoUnavailable, 
    AgeRestrictedError, 
    LiveStreamError,
    VideoPrivate,
    VideoRegionBlocked,
    MembersOnly,
    RecordingUnavailable,
    PytubeError
)

class ProgressTracker:
    """下载进度追踪器"""
    
    def __init__(self):
        self.start_time = time.time()
        self.last_update = 0
        
    def on_progress(self, stream, chunk, bytes_remaining):
        """进度回调函数"""
        total_size = stream.filesize
        bytes_downloaded = total_size - bytes_remaining
        percentage = (bytes_downloaded / total_size) * 100
        
        # 计算下载速度
        current_time = time.time()
        elapsed_time = current_time - self.start_time
        speed = bytes_downloaded / elapsed_time if elapsed_time > 0 else 0
        
        # 计算剩余时间
        if speed > 0:
            eta = bytes_remaining / speed
        else:
            eta = 0
        
        # 限制更新频率（每0.5秒更新一次）
        if current_time - self.last_update >= 0.5:
            progress_data = {
                'type': 'progress',
                'percentage': round(percentage, 2),
                'bytes_downloaded': bytes_downloaded,
                'total_size': total_size,
                'speed_mbps': round(speed / 1024 / 1024, 2),
                'eta_seconds': round(eta),
                'eta_formatted': self.format_time(eta)
            }
            
            print(json.dumps(progress_data), flush=True)
            self.last_update = current_time
    
    def format_time(self, seconds):
        """格式化时间显示"""
        if seconds < 60:
            return f"{int(seconds)}秒"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}分{secs}秒"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}小时{minutes}分钟"

def download_video(url, itag, output_path, filename_prefix="youtube"):
    """下载YouTube视频"""
    try:
        # 创建进度追踪器
        progress_tracker = ProgressTracker()
        
        # 创建YouTube对象
        yt = YouTube(url, on_progress_callback=progress_tracker.on_progress)
        
        # 获取指定的流
        stream = yt.streams.get_by_itag(int(itag))
        if not stream:
            return {
                'success': False,
                'error': f'Stream with itag {itag} not found',
                'error_type': 'stream_not_found'
            }
        
        # 确保输出目录存在
        os.makedirs(output_path, exist_ok=True)
        
        # 生成文件名
        safe_title = "".join(c for c in yt.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title[:50]  # 限制文件名长度
        
        timestamp = int(time.time())
        filename = f"{filename_prefix}_{timestamp}_{safe_title}.{stream.subtype}"
        
        # 发送开始下载信号
        start_info = {
            'type': 'start',
            'title': yt.title,
            'filename': filename,
            'filesize': stream.filesize,
            'filesize_mb': round(stream.filesize / 1024 / 1024, 2) if stream.filesize else 0
        }
        print(json.dumps(start_info), flush=True)
        
        # 下载文件
        file_path = stream.download(
            output_path=output_path,
            filename=filename
        )
        
        # 发送完成信号
        complete_info = {
            'type': 'complete',
            'success': True,
            'file_path': file_path,
            'filename': filename,
            'title': yt.title,
            'filesize': os.path.getsize(file_path),
            'download_time': time.time() - progress_tracker.start_time
        }
        print(json.dumps(complete_info), flush=True)
        
        return complete_info
        
    except VideoUnavailable as e:
        error_info = {
            'success': False,
            'error': 'Video is unavailable',
            'error_type': 'unavailable',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except AgeRestrictedError as e:
        error_info = {
            'success': False,
            'error': 'Video is age restricted and requires login',
            'error_type': 'age_restricted',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except LiveStreamError as e:
        error_info = {
            'success': False,
            'error': 'Cannot download live streams',
            'error_type': 'live_stream',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except VideoPrivate as e:
        error_info = {
            'success': False,
            'error': 'Video is private',
            'error_type': 'private',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except VideoRegionBlocked as e:
        error_info = {
            'success': False,
            'error': 'Video is blocked in your region',
            'error_type': 'region_blocked',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except PytubeError as e:
        error_info = {
            'success': False,
            'error': f'PyTube error: {str(e)}',
            'error_type': 'pytube_error',
            'details': str(e)
        }
        print(json.dumps(error_info), flush=True)
        return error_info
        
    except Exception as e:
        error_info = {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'error_type': 'unknown',
            'details': traceback.format_exc()
        }
        print(json.dumps(error_info), flush=True)
        return error_info

def main():
    """主函数"""
    if len(sys.argv) != 4:
        error_info = {
            'success': False,
            'error': 'Usage: python youtube_downloader.py <youtube_url> <itag> <output_path>'
        }
        print(json.dumps(error_info))
        sys.exit(1)
    
    url = sys.argv[1]
    itag = sys.argv[2]
    output_path = sys.argv[3]
    
    result = download_video(url, itag, output_path)
    
    # 如果下载失败，确保返回错误信息
    if not result.get('success'):
        sys.exit(1)

if __name__ == '__main__':
    main()
