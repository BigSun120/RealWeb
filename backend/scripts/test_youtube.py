#!/usr/bin/env python3
"""
测试YouTube连接和pytube功能
"""

import sys
import json
from pytube import YouTube

def test_youtube_connection():
    """测试YouTube连接"""
    test_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Roll
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",  # Me at the zoo (first YouTube video)
        "https://www.youtube.com/watch?v=9bZkp7q19f0",  # PSY - GANGNAM STYLE
    ]
    
    for i, url in enumerate(test_urls):
        print(f"\n=== 测试视频 {i+1}: {url} ===")
        
        try:
            # 尝试创建YouTube对象
            print("创建YouTube对象...")
            yt = YouTube(url)
            
            # 尝试获取基本信息
            print("获取视频标题...")
            title = yt.title
            print(f"标题: {title}")
            
            print("获取视频长度...")
            length = yt.length
            print(f"长度: {length}秒")
            
            print("获取流信息...")
            streams = yt.streams
            print(f"可用流数量: {len(streams)}")
            
            # 获取一些流的详细信息
            progressive_streams = streams.filter(progressive=True)
            print(f"Progressive流数量: {len(progressive_streams)}")
            
            if len(progressive_streams) > 0:
                best_stream = progressive_streams.get_highest_resolution()
                print(f"最佳质量: {best_stream.resolution} - {best_stream.mime_type}")
            
            print("✅ 测试成功!")
            return True
            
        except Exception as e:
            print(f"❌ 测试失败: {str(e)}")
            print(f"错误类型: {type(e).__name__}")
            continue
    
    print("\n❌ 所有测试都失败了")
    return False

def test_simple_info(url):
    """测试获取简单信息"""
    try:
        print(f"测试URL: {url}")
        yt = YouTube(url)
        
        # 只获取最基本的信息
        info = {
            'video_id': yt.video_id,
            'watch_url': yt.watch_url,
        }
        
        # 尝试获取标题（这通常是第一个可能失败的地方）
        try:
            info['title'] = yt.title
            print("✅ 成功获取标题")
        except Exception as e:
            print(f"❌ 获取标题失败: {e}")
            return False
        
        # 尝试获取流信息
        try:
            streams = yt.streams
            info['stream_count'] = len(streams)
            print(f"✅ 成功获取流信息，共{len(streams)}个流")
        except Exception as e:
            print(f"❌ 获取流信息失败: {e}")
            return False
        
        print(json.dumps(info, indent=2, ensure_ascii=False))
        return True
        
    except Exception as e:
        print(f"❌ 创建YouTube对象失败: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) > 1:
        url = sys.argv[1]
        test_simple_info(url)
    else:
        test_youtube_connection()
