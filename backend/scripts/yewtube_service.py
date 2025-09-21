#!/usr/bin/env python3
"""
基于yewtube技术的YouTube服务
使用yt-dlp和youtube-search-python，无需API密钥和cookies
"""

import json
import os
import sys
import traceback
import time
from urllib.parse import parse_qs, urlparse

import yt_dlp
from youtubesearchpython import VideosSearch, Video


class YouTubeLogger:
    """自定义yt-dlp日志处理器"""

    def debug(self, msg):
        pass

    def info(self, msg):
        pass

    def warning(self, msg):
        pass

    def error(self, msg):
        pass


def extract_video_id(url):
    """从YouTube URL中提取视频ID"""
    try:
        if 'youtu.be/' in url:
            return url.split('youtu.be/')[-1].split('?')[0]
        elif 'youtube.com/watch' in url:
            parsed = urlparse(url)
            return parse_qs(parsed.query)['v'][0]
        elif len(url) == 11:  # 直接是视频ID
            return url
        else:
            return None
    except:
        return None


def get_video_info(url_or_id):
    """获取YouTube视频信息"""
    try:
        video_id = extract_video_id(url_or_id)
        if not video_id:
            return {
                'success': False,
                'error': 'Invalid YouTube URL or video ID',
                'error_type': 'invalid_url'
            }

        # 使用youtube-search-python获取基本信息（无API限制）
        video_basic_info = None
        try:
            video_basic_info = Video.getInfo(f"https://www.youtube.com/watch?v={video_id}")
        except Exception:
            pass

        # 使用yt-dlp获取详细信息和流
        ydl_opts = {
            'logger': YouTubeLogger(),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }

        # 检查cookies文件
        cookies_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'cookies.txt')
        if os.path.exists(cookies_path):
            ydl_opts['cookiefile'] = cookies_path

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info_dict = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            except yt_dlp.utils.DownloadError as e:
                error_msg = str(e)
                if "429" in error_msg or "Too Many Requests" in error_msg:
                    return {
                        'success': False,
                        'error': 'YouTube is rate limiting requests. Please try again later.',
                        'error_type': 'rate_limited',
                        'details': error_msg
                    }
                elif "Sign in to confirm" in error_msg:
                    return {
                        'success': False,
                        'error': 'YouTube requires verification. This video may be restricted.',
                        'error_type': 'verification_required',
                        'details': error_msg
                    }
                else:
                    return {
                        'success': False,
                        'error': f'Failed to extract video info: {error_msg}',
                        'error_type': 'extraction_failed',
                        'details': error_msg
                    }

        # 处理视频信息
        video_info = {
            'success': True,
            'title': info_dict.get('title', 'Unknown'),
            'length': info_dict.get('duration', 0),
            'views': info_dict.get('view_count', 0),
            'rating': info_dict.get('average_rating'),
            'author': info_dict.get('uploader', 'Unknown'),
            'description': (info_dict.get('description', '') or '')[:500] + '...' if info_dict.get('description') else '',
            'thumbnail_url': info_dict.get('thumbnail'),
            'publish_date': info_dict.get('upload_date'),
            'video_id': video_id,
            'channel_url': info_dict.get('uploader_url'),
            'keywords': info_dict.get('tags', [])[:10] if info_dict.get('tags') else [],
        }

        # 处理格式信息
        formats = info_dict.get('formats', [])

        # 过滤掉storyboard等无用格式
        valid_formats = [f for f in formats if f.get('format_note') != 'storyboard']

        streams_data = []
        audio_streams = []
        video_streams = []

        for fmt in valid_formats:
            if not fmt.get('url'):
                continue

            stream_info = {
                'itag': fmt.get('format_id'),
                'mime_type': fmt.get('ext'),
                'type': 'video' if fmt.get('vcodec') != 'none' else 'audio',
                'subtype': fmt.get('ext'),
                'filesize': fmt.get('filesize') or fmt.get('filesize_approx', 0),
                'filesize_mb': round((fmt.get('filesize') or fmt.get('filesize_approx', 0)) / 1024 / 1024, 2) if (fmt.get('filesize') or fmt.get('filesize_approx')) else 0,
                'is_progressive': fmt.get('acodec') != 'none' and fmt.get('vcodec') != 'none',
                'includes_audio_track': fmt.get('acodec') != 'none',
                'includes_video_track': fmt.get('vcodec') != 'none',
                'url': fmt.get('url'),  # 添加URL用于下载
            }

            # 视频流信息
            if fmt.get('vcodec') != 'none':
                stream_info.update({
                    'resolution': f"{fmt.get('height', 0)}p" if fmt.get('height') else 'Unknown',
                    'fps': fmt.get('fps'),
                    'video_codec': fmt.get('vcodec'),
                })
                video_streams.append(stream_info)

            # 音频流信息
            if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                stream_info.update({
                    'abr': f"{fmt.get('abr', 0)}kbps" if fmt.get('abr') else 'Unknown',
                    'audio_codec': fmt.get('acodec'),
                })
                audio_streams.append(stream_info)

            streams_data.append(stream_info)

        # 按质量排序
        video_streams.sort(key=lambda x: int(x['resolution'][:-1]) if x['resolution'] != 'Unknown' and x['resolution'][:-1].isdigit() else 0, reverse=True)
        audio_streams.sort(key=lambda x: int(x['abr'][:-4]) if x['abr'] != 'Unknown' and x['abr'][:-4].isdigit() else 0, reverse=True)

        video_info['streams'] = {
            'all': streams_data,
            'video_only': [s for s in video_streams if not s['includes_audio_track']],
            'audio_only': audio_streams,
            'progressive': [s for s in video_streams if s['is_progressive']],
        }

        # 推荐格式
        recommended = []

        # 推荐1：最佳progressive流
        progressive_streams = [s for s in video_streams if s['is_progressive']]
        if progressive_streams:
            best_progressive = progressive_streams[0]
            recommended.append({
                'id': 'best_progressive',
                'name': '推荐：最佳质量（音视频合并）',
                'itag': best_progressive['itag'],
                'description': f"{best_progressive['resolution']} {best_progressive['subtype']}格式",
                'type': 'progressive'
            })

        # 推荐2：720p progressive
        for stream in progressive_streams:
            if stream['resolution'] == '720p':
                recommended.append({
                    'id': '720p_progressive',
                    'name': '推荐：720p高清',
                    'itag': stream['itag'],
                    'description': f"720p {stream['subtype']}格式，兼容性好",
                    'type': 'progressive'
                })
                break

        # 推荐3：最佳音频
        if audio_streams:
            best_audio = audio_streams[0]
            recommended.append({
                'id': 'best_audio',
                'name': '推荐：最佳音质',
                'itag': best_audio['itag'],
                'description': f"{best_audio['abr']} {best_audio['subtype']}格式",
                'type': 'audio'
            })

        video_info['recommended'] = recommended

        return video_info

    except Exception as e:
        error_msg = str(e)
        return {
            'success': False,
            'error': f'Unexpected error: {error_msg}',
            'error_type': 'unknown',
            'details': traceback.format_exc()
        }


def search_videos(query, max_results=20):
    """搜索YouTube视频"""
    try:
        videos_search = VideosSearch(query, limit=max_results)
        results = videos_search.result()

        if not results or 'result' not in results:
            return {
                'success': False,
                'error': 'No search results found',
                'error_type': 'no_results'
            }

        videos = []
        for video in results['result']:
            video_info = {
                'video_id': video.get('id'),
                'title': video.get('title'),
                'duration': video.get('duration'),
                'views': video.get('viewCount', {}).get('text', '0'),
                'author': video.get('channel', {}).get('name', 'Unknown'),
                'thumbnail': video.get('thumbnails', [{}])[-1].get('url') if video.get('thumbnails') else None,
                'url': video.get('link'),
                'publish_time': video.get('publishedTime'),
                'description': video.get('descriptionSnippet', [{}])[0].get('text', '') if video.get('descriptionSnippet') else ''
            }
            videos.append(video_info)

        return {
            'success': True,
            'results': videos,
            'total': len(videos)
        }

    except Exception as e:
        error_msg = str(e)
        return {
            'success': False,
            'error': f'Search failed: {error_msg}',
            'error_type': 'search_failed',
            'details': traceback.format_exc()
        }


def download_video(url_or_id, output_dir, format_id=None, audio_only=False, progress_callback=None):
    """下载YouTube视频"""
    try:
        video_id = extract_video_id(url_or_id)
        if not video_id:
            return {
                'success': False,
                'error': 'Invalid YouTube URL or video ID',
                'error_type': 'invalid_url'
            }

        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)

        # 配置yt-dlp选项
        ydl_opts = {
            'logger': YouTubeLogger(),
            'outtmpl': os.path.join(output_dir, '%(title)s-%(id)s.%(ext)s'),
        }

        # 检查cookies文件
        cookies_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'cookies.txt')
        if os.path.exists(cookies_path):
            ydl_opts['cookiefile'] = cookies_path

        # 根据参数设置格式
        if audio_only:
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif format_id:
            ydl_opts['format'] = format_id
        else:
            ydl_opts['format'] = 'best[height<=720]/best'

        # 进度回调
        if progress_callback:
            def progress_hook(d):
                if d['status'] == 'downloading':
                    progress_callback({
                        'type': 'progress',
                        'percentage': float(d.get('_percent_str', '0%').replace('%', '')),
                        'speed': d.get('_speed_str', 'Unknown'),
                        'eta': d.get('_eta_str', 'Unknown'),
                        'downloaded': d.get('downloaded_bytes', 0),
                        'total': d.get('total_bytes', 0)
                    })
                elif d['status'] == 'finished':
                    progress_callback({
                        'type': 'complete',
                        'filename': d['filename']
                    })

            ydl_opts['progress_hooks'] = [progress_hook]

        # 执行下载
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 先获取信息
            info_dict = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            title = info_dict.get('title', 'Unknown')

            # 执行下载
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            # 查找下载的文件
            pattern = os.path.join(output_dir, f"*{video_id}*")
            import glob
            downloaded_files = glob.glob(pattern)

            if downloaded_files:
                filename = os.path.basename(downloaded_files[0])
                filesize = os.path.getsize(downloaded_files[0])

                return {
                    'success': True,
                    'title': title,
                    'filename': filename,
                    'file_path': downloaded_files[0],
                    'filesize': filesize
                }
            else:
                return {
                    'success': False,
                    'error': 'Download completed but file not found',
                    'error_type': 'file_not_found'
                }

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)

        if "429" in error_msg or "Too Many Requests" in error_msg:
            return {
                'success': False,
                'error': 'YouTube is rate limiting requests. Please try again later.',
                'error_type': 'rate_limited',
                'details': error_msg
            }
        else:
            return {
                'success': False,
                'error': f'Download failed: {error_msg}',
                'error_type': 'download_failed',
                'details': error_msg
            }

    except Exception as e:
        error_msg = str(e)
        return {
            'success': False,
            'error': f'Unexpected error: {error_msg}',
            'error_type': 'unknown',
            'details': traceback.format_exc()
        }


def main():
    """主函数 - 命令行接口"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python yewtube_service.py <command> [args...]'
        }))
        sys.exit(1)

    command = sys.argv[1]

    if command == 'info':
        if len(sys.argv) != 3:
            print(json.dumps({
                'success': False,
                'error': 'Usage: python yewtube_service.py info <youtube_url_or_id>'
            }))
            sys.exit(1)

        url_or_id = sys.argv[2]
        result = get_video_info(url_or_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif command == 'search':
        if len(sys.argv) < 3:
            print(json.dumps({
                'success': False,
                'error': 'Usage: python yewtube_service.py search <query> [max_results]'
            }))
            sys.exit(1)

        query = ' '.join(sys.argv[2:-1]) if len(sys.argv) > 3 else sys.argv[2]
        max_results = int(sys.argv[-1]) if len(sys.argv) > 3 and sys.argv[-1].isdigit() else 20

        result = search_videos(query, max_results)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif command == 'download':
        if len(sys.argv) < 4:
            print(json.dumps({
                'success': False,
                'error': 'Usage: python yewtube_service.py download <youtube_url_or_id> <output_dir> [format_id] [audio_only]'
            }))
            sys.exit(1)

        url_or_id = sys.argv[2]
        output_dir = sys.argv[3]
        format_id = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'audio' else None
        audio_only = len(sys.argv) > 4 and 'audio' in sys.argv[4:]

        def progress_callback(data):
            print(json.dumps(data), flush=True)

        result = download_video(url_or_id, output_dir, format_id, audio_only, progress_callback)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    else:
        print(json.dumps({
            'success': False,
            'error': f'Unknown command: {command}. Available commands: info, search, download'
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
