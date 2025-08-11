#!/usr/bin/env python3
"""
爱奇艺视频解析器
基于原始爱奇艺解析代码，适配到我们的视频下载器项目
"""

import requests
import execjs
import re
import time
import json
import sys
import traceback
from urllib.parse import quote, unquote
import hashlib
import os


class IqiyiParser:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36"
        }

        # 尝试加载JS文件（可选）
        self.authkey = None
        self.cmd5js = None

        try:
            self.authkey = self.load_auth_js()
            self.cmd5js = self.load_cmd5x_js()
            if self.authkey and self.cmd5js:
                print("✅ JS认证文件加载成功，启用完整解析功能")
            else:
                print("⚠️ JS文件加载失败，使用简化解析模式")
        except Exception as e:
            print(f"⚠️ JS文件加载失败: {e}，使用简化解析模式")

    def load_auth_js(self):
        """加载认证JS文件"""
        js_path = os.path.join(os.path.dirname(__file__), 'js', 'iqiyi.js')
        if os.path.exists(js_path):
            with open(js_path, 'r', encoding='utf-8') as f:
                return execjs.compile(f.read())
        return None

    def load_cmd5x_js(self):
        """加载MD5 JS文件"""
        js_path = os.path.join(os.path.dirname(__file__), 'js', 'cmd5x.js')
        if os.path.exists(js_path):
            with open(js_path, 'r', encoding='utf-8') as f:
                return execjs.compile(f.read())
        return None

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

    def get_tvid_vid(self, url):
        """获取tvid和vid"""
        try:
            # 尝试从加速器接口获取
            accelerator = "https://mesh.if.iqiyi.com/player/lw/lwplay/accelerator.js"
            headers = self.headers.copy()
            headers["Referer"] = url.split("?")[0]

            res = requests.get(accelerator, headers=headers, timeout=10)

            tvid_match = re.search(r'"tvid":([A-Za-z0-9]+)', res.text)
            vid_match = re.search(r'"vid":"([A-Za-z0-9]+)"', res.text)

            if tvid_match and vid_match:
                return tvid_match.group(1), vid_match.group(1)

            # 如果失败，尝试从页面获取
            return self.get_tvid_from_page(url)

        except Exception as e:
            # 备用方案：从页面获取
            return self.get_tvid_from_page(url)

    def get_tvid_from_page(self, url):
        """从页面源码获取tvid和vid"""
        try:
            headers = self.headers.copy()
            headers["Referer"] = "https://www.iqiyi.com/"

            res = requests.get(url, headers=headers, timeout=15)

            # 尝试多种正则表达式
            patterns = [
                (r'"tvId":"([^"]+)"', r'"vid":"([^"]+)"'),
                (r'tvid["\']?\s*[:=]\s*["\']?([A-Za-z0-9]+)', r'vid["\']?\s*[:=]\s*["\']?([A-Za-z0-9]+)'),
                (r'data-player-tvid="([^"]+)"', r'data-player-videoid="([^"]+)"'),
            ]

            for tvid_pattern, vid_pattern in patterns:
                tvid_match = re.search(tvid_pattern, res.text)
                vid_match = re.search(vid_pattern, res.text)

                if tvid_match and vid_match:
                    return tvid_match.group(1), vid_match.group(1)

            return None, None

        except:
            return None, None

    def parse_video(self, url):
        """解析爱奇艺视频"""
        try:
            # 获取tvid和vid
            tvid, vid = self.get_tvid_vid(url)

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
                'url': url
            }

            # 尝试获取更多信息
            try:
                page_info = self.get_page_info(url)
                if page_info:
                    video_info.update(page_info)
            except:
                pass  # 如果获取失败，返回基本信息

            # 如果有JS认证文件，尝试获取视频流信息
            if self.authkey and self.cmd5js:
                try:
                    stream_info = self.get_stream_info(url, tvid, vid)
                    if stream_info:
                        video_info.update(stream_info)
                except Exception as e:
                    print(f"获取流信息失败: {e}")
                    pass  # 如果流信息获取失败，返回基本信息

            return video_info

        except Exception as e:
            return {
                'success': False,
                'error': f'解析失败: {str(e)}',
                'error_type': 'parsing_failed',
                'details': traceback.format_exc()
            }

    def get_page_info(self, url):
        """从页面获取更多视频信息"""
        try:
            headers = self.headers.copy()
            headers["Referer"] = "https://www.iqiyi.com/"

            res = requests.get(url, headers=headers, timeout=15)
            res.encoding = 'utf-8'  # 确保正确的编码

            result = {}

            # 尝试提取标题
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
                    if title and title != '爱奇艺':
                        result['title'] = title
                        break

            # 尝试提取描述
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

            # 尝试提取缩略图
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
            return {}

    def get_stream_info(self, url, tvid, vid):
        """获取视频流信息（使用JS认证）"""
        try:
            _time = int(time.time() * 1000)

            # 构建完整的参数字典
            params = {
                "tvid": tvid,
                "bid": "300",
                "vid": vid,
                "src": "01080031010000000000",
                "vt": "0",
                "rs": "1",
                "uid": "",
                "ori": "pcw",
                "ps": "1",
                "k_uid": "1bf80ab6e72de7ab4a42f4db91bd530b",
                "pt": "0",
                "d": "0",
                "s": "",
                "lid": "0",
                "cf": "0",
                "ct": "0",
                "k_tag": "1",
                "dfp": "a05f71a09d3d594d61999d8de6456cae27c93252e9ce61cd4246848a76eafcb3ec",
                "locale": "zh_cn",
                "pck": "38Dklg6YLDVPnQ2URa80m1AvEn7v0bVvq4MgAHwm3m1Vm3ai5115qb9dHm1vNXAv4ytm2qAF17",
                "k_err_retries": "0",
                "up": "",
                "qd_v": "a1",
                "tm": _time,
                "k_ft1": "706436220846084",
                "k_ft4": "1162321298202628",
                "k_ft5": "137573171201",
                "k_ft6": "128",
                "k_ft7": "671612932",
                "fr_300": "120_120_120_120_120_120",
                "fr_500": "120_120_120_120_120_120",
                "fr_600": "120_120_120_120_120_120",
                "fr_800": "120_120_120_120_120_120",
                "fr_1020": "120_120_120_120_120_120",
                "bop": quote(
                    '{"version":"10.0","dfp":"a05f71a09d3d594d61999d8de6456cae27c93252e9ce61cd4246848a76eafcb3ec"},"b_ft1":24'),
                "ut": "0"
            }

            # 使用JS生成认证密钥
            auth_base = self.authkey.call("auth", "")
            auth_string = f"{auth_base}{_time}{tvid}"
            params["authKey"] = self.authkey.call("auth", auth_string)

            # 构建URL参数字符串
            temp = "/dash?"
            for k, v in params.items():
                temp += k + "=" + str(v) + "&"

            # 使用JS生成验证字符串
            vf_str = self.authkey.call("addChar", temp[:-1])
            vf = hashlib.md5(vf_str.encode("utf-8")).hexdigest()
            params['vf'] = vf
            params["bop"] = unquote(params["bop"])

            # 调用爱奇艺API
            response = requests.get("https://cache.video.iqiyi.com/dash",
                                  params=params,
                                  headers=self.headers,
                                  timeout=15)

            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "A00000" and data.get("data"):
                    program_data = data["data"].get("program", {})
                    video_data = program_data.get("video", [])

                    if video_data:
                        # 处理视频流信息
                        streams = {
                            'available': [],
                            'recommended': []
                        }

                        for stream in video_data:
                            stream_info = {
                                'quality': stream.get('scrsz', 'Unknown'),
                                'format': stream.get('vtype', 'mp4'),
                                'url': stream.get('l'),
                                'size': stream.get('vsize', 0),
                                'duration': stream.get('dur', 0)
                            }
                            streams['available'].append(stream_info)

                        # 添加推荐流
                        if streams['available']:
                            # 推荐最高质量的流
                            streams['recommended'] = [streams['available'][0]]

                        return {
                            'streams': streams,
                            'duration': program_data.get('duration', 0)
                        }

            return {}

        except Exception as e:
            print(f"获取流信息异常: {e}")
            return {}


def main():
    """命令行接口"""
    # 设置输出编码为UTF-8
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python iqiyi_parser.py <iqiyi_url>'
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

    parser = IqiyiParser()
    result = parser.parse_video(url)

    # 确保中文字符正确输出
    output = json.dumps(result, ensure_ascii=False, indent=2)
    print(output)


if __name__ == '__main__':
    main()
