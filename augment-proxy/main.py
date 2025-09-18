#!/usr/bin/env python3
"""
Augment Token Manager - 配套代理程序
提供编辑器令牌切换和协议处理功能
"""

import sys
import os
import json
import threading
import time
import tempfile
import winreg
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from config import Config
from account_manager import AccountManager
from protocol_handler import ProtocolHandler
from utils import Logger, find_available_port

class AugmentProxy:
    def __init__(self):
        self.config = Config()
        self.logger = Logger()
        self.account_manager = AccountManager()
        self.protocol_handler = ProtocolHandler()
        self.app = Flask(__name__)
        self.port = None
        self.server_thread = None
        self.running = False
        
        # 配置CORS
        CORS(self.app, origins=[
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8001',
            'http://127.0.0.1:8001'
        ])
        
        self._setup_routes()
    
    def _setup_routes(self):
        """设置Flask路由"""
        
        @self.app.route('/ping', methods=['GET'])
        def ping():
            """服务状态检测"""
            return jsonify({
                'status': 'ok',
                'service': 'augment-proxy',
                'version': '1.0.0',
                'port': self.port
            })
        
        @self.app.route('/current-account', methods=['GET'])
        def get_current_account():
            """获取当前账号"""
            try:
                account = self.account_manager.get_current_account()
                return jsonify({
                    'success': True,
                    'data': account
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/accounts', methods=['GET'])
        def get_accounts():
            """获取账号列表"""
            try:
                accounts = self.account_manager.get_all_accounts()
                return jsonify({
                    'success': True,
                    'data': accounts
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/switch-account', methods=['POST'])
        def switch_account():
            """切换账号"""
            try:
                data = request.get_json()
                token_data = data.get('tokenData')
                editor_type = data.get('editorType')

                if not token_data or not editor_type:
                    return jsonify({
                        'success': False,
                        'error': 'Missing tokenData or editorType'
                    }), 400

                result = self.account_manager.switch_account_with_data(token_data, editor_type)
                return jsonify({
                    'success': True,
                    'data': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/protocol-handler', methods=['POST'])
        def handle_protocol():
            """处理协议调用"""
            try:
                data = request.get_json()
                protocol_url = data.get('protocolUrl')
                
                if not protocol_url:
                    return jsonify({
                        'success': False,
                        'error': 'Missing protocolUrl'
                    }), 400
                
                result = self.protocol_handler.handle_protocol(protocol_url)
                return jsonify({
                    'success': True,
                    'data': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
    
    def start_server(self):
        """启动HTTP服务器"""
        try:
            # 查找可用端口
            self.port = find_available_port(8899, 8903)
            if not self.port:
                raise Exception("No available port found in range 8899-8903")
            
            self.logger.info(f"Starting server on port {self.port}")
            
            # 创建服务信息文件
            self._create_service_info_file()
            
            # 启动服务器线程
            self.server_thread = threading.Thread(
                target=self._run_server,
                daemon=True
            )
            self.server_thread.start()
            
            self.running = True
            self.logger.info(f"Server started successfully on http://localhost:{self.port}")
            
        except Exception as e:
            self.logger.error(f"Failed to start server: {e}")
            raise
    
    def _run_server(self):
        """运行Flask服务器"""
        self.app.run(
            host='127.0.0.1',
            port=self.port,
            debug=False,
            use_reloader=False,
            threaded=True
        )
    
    def _create_service_info_file(self):
        """创建服务信息文件供Web端检测"""
        try:
            temp_dir = tempfile.gettempdir()
            service_file = os.path.join(temp_dir, 'augment-proxy-service.json')
            
            service_info = {
                'status': 'running',
                'port': self.port,
                'pid': os.getpid(),
                'start_time': time.time(),
                'endpoints': {
                    'ping': f'http://localhost:{self.port}/ping',
                    'current_account': f'http://localhost:{self.port}/current-account',
                    'accounts': f'http://localhost:{self.port}/accounts',
                    'switch_account': f'http://localhost:{self.port}/switch-account',
                    'protocol_handler': f'http://localhost:{self.port}/protocol-handler'
                }
            }
            
            with open(service_file, 'w', encoding='utf-8') as f:
                json.dump(service_info, f, indent=2)
            
            self.logger.info(f"Service info file created: {service_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to create service info file: {e}")
    
    def stop_server(self):
        """停止服务器"""
        self.running = False
        
        # 删除服务信息文件
        try:
            temp_dir = tempfile.gettempdir()
            service_file = os.path.join(temp_dir, 'augment-proxy-service.json')
            if os.path.exists(service_file):
                os.remove(service_file)
        except Exception as e:
            self.logger.error(f"Failed to remove service info file: {e}")
        
        self.logger.info("Server stopped")
    
    def run(self):
        """主运行循环"""
        try:
            # 注册协议处理器
            self.protocol_handler.register_protocols()
            
            # 启动HTTP服务器
            self.start_server()
            
            # 保持运行
            while self.running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            self.logger.info("Received interrupt signal")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
        finally:
            self.stop_server()

def main():
    """主函数"""
    if len(sys.argv) > 1:
        # 处理协议调用
        protocol_url = sys.argv[1]
        handler = ProtocolHandler()
        handler.handle_protocol(protocol_url)
    else:
        # 启动代理服务
        proxy = AugmentProxy()
        proxy.run()

if __name__ == '__main__':
    main()
