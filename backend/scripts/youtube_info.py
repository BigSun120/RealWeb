#!/usr/bin/env python3
"""
YouTube视频信息获取脚本
使用pytube获取YouTube视频的详细信息
"""

import sys
import json
import os
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

def get_video_info(url):
    """获取YouTube视频信息"""
    try:
        # 检查cookies文件
        cookies_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'cookies.txt')

        # 创建YouTube对象，添加一些配置来处理限制
        yt_kwargs = {
            'use_oauth': False,
            'allow_oauth_cache': False
        }

        # 如果有cookies文件，尝试使用（注意：pytube本身不直接支持cookies文件）
        # 这里我们先创建基本的YouTube对象
        yt = YouTube(url, **yt_kwargs)

        # 获取基本信息
        video_info = {
            'success': True,
            'title': yt.title,
            'length': yt.length,
            'views': yt.views,
            'rating': getattr(yt, 'rating', None),
            'author': yt.author,
            'description': yt.description[:500] + '...' if len(yt.description) > 500 else yt.description,
            'thumbnail_url': yt.thumbnail_url,
            'publish_date': yt.publish_date.isoformat() if yt.publish_date else None,
            'video_id': yt.video_id,
            'channel_url': yt.channel_url,
            'keywords': yt.keywords[:10] if yt.keywords else [],  # 限制关键词数量
        }

        # 获取流信息
        streams_data = []
        audio_streams = []
        video_streams = []

        for stream in yt.streams:
            stream_info = {
                'itag': stream.itag,
                'mime_type': stream.mime_type,
                'type': stream.type,
                'subtype': stream.subtype,
                'filesize': stream.filesize,
                'filesize_mb': round(stream.filesize / 1024 / 1024, 2) if stream.filesize else 0,
                'is_progressive': not stream.is_adaptive,
                'includes_audio_track': stream.includes_audio_track,
                'includes_video_track': stream.includes_video_track,
            }

            # 视频流信息
            if stream.includes_video_track:
                stream_info.update({
                    'resolution': stream.resolution,
                    'fps': getattr(stream, 'fps', None),
                    'video_codec': getattr(stream, 'video_codec', None),
                })
                video_streams.append(stream_info)

            # 音频流信息
            if stream.includes_audio_track and not stream.includes_video_track:
                stream_info.update({
                    'abr': getattr(stream, 'abr', None),
                    'audio_codec': getattr(stream, 'audio_codec', None),
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

        # 推荐1：最佳progressive流（音视频合并）
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

        # 推荐2：720p progressive（如果有）
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

    except VideoUnavailable as e:
        return {
            'success': False,
            'error': 'Video is unavailable',
            'error_type': 'unavailable',
            'details': str(e)
        }
    except AgeRestrictedError as e:
        return {
            'success': False,
            'error': 'Video is age restricted and requires login',
            'error_type': 'age_restricted',
            'details': str(e)
        }
    except LiveStreamError as e:
        return {
            'success': False,
            'error': 'Cannot download live streams',
            'error_type': 'live_stream',
            'details': str(e)
        }
    except VideoPrivate as e:
        return {
            'success': False,
            'error': 'Video is private',
            'error_type': 'private',
            'details': str(e)
        }
    except VideoRegionBlocked as e:
        return {
            'success': False,
            'error': 'Video is blocked in your region',
            'error_type': 'region_blocked',
            'details': str(e)
        }
    except MembersOnly as e:
        return {
            'success': False,
            'error': 'Video is members-only',
            'error_type': 'members_only',
            'details': str(e)
        }
    except RecordingUnavailable as e:
        return {
            'success': False,
            'error': 'Recording is unavailable',
            'error_type': 'recording_unavailable',
            'details': str(e)
        }
    except PytubeError as e:
        return {
            'success': False,
            'error': f'PyTube error: {str(e)}',
            'error_type': 'pytube_error',
            'details': str(e)
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
            'error': 'Usage: python youtube_info.py <youtube_url>'
        }))
        sys.exit(1)

    url = sys.argv[1]
    result = get_video_info(url)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
