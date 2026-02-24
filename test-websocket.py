#!/usr/bin/env python3
"""
Script Testing WebSocket untuk API Wira Detail (Python)

Requirements:
    pip install websocket-client

Usage:
    python test-websocket.py
    
Atau dengan parameter:
    python test-websocket.py --host 10.5.0.106 --port 7000 --line 10 --status GOOD
"""

import websocket
import json
import time
import argparse
import sys
from datetime import datetime
from typing import Optional

# Konfigurasi default
DEFAULT_CONFIG = {
    'host': '10.5.0.106',
    'port': 7000,
    'path': '/ws/wira-dashboard',
    'line': 10,
    'status': 'GOOD'
}

class WebSocketTestClient:
    def __init__(self, host: str, port: int, path: str, line: int, status: str):
        self.host = host
        self.port = port
        self.path = path
        self.line = line
        self.status = status
        self.ws: Optional[websocket.WebSocketApp] = None
        self.message_count = 0
        self.bytes_received = 0
        self.connection_start_time = None
        
    def get_timestamp(self) -> str:
        """Format timestamp untuk logging"""
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def log(self, level: str, message: str, data: dict = None):
        """Log message dengan format yang konsisten"""
        icons = {
            'INFO': '✅',
            'ERROR': '❌',
            'WARN': '⚠️',
            'MESSAGE': '📨'
        }
        icon = icons.get(level, '📝')
        
        print(f"[{self.get_timestamp()}] {icon} [{level}] {message}")
        if data:
            print(json.dumps(data, indent=2, ensure_ascii=False))
    
    def on_open(self, ws):
        """Callback ketika WebSocket connection terbuka"""
        self.connection_start_time = time.time()
        self.log('INFO', 'WebSocket connection established!')
        self.log('INFO', 'Ready to receive messages...')
        
        # Kirim test message setelah 1 detik
        time.sleep(1)
        if ws.sock and ws.sock.connected:
            test_message = {
                'type': 'ping',
                'timestamp': int(time.time() * 1000),
                'line': self.line,
                'status': self.status
            }
            self.log('INFO', 'Sending test message:', test_message)
            ws.send(json.dumps(test_message))
    
    def on_message(self, ws, message):
        """Callback ketika menerima message dari WebSocket"""
        try:
            # Coba parse sebagai JSON
            data = json.loads(message)
            self.log('MESSAGE', 'Received JSON message:', data)
        except json.JSONDecodeError:
            # Jika bukan JSON, tampilkan sebagai text
            self.log('MESSAGE', 'Received text message:', {
                'raw': message,
                'length': len(message)
            })
        
        self.message_count += 1
        self.bytes_received += len(message)
        
        self.log('INFO', f'Total messages: {self.message_count}, Bytes: {self.bytes_received}')
    
    def on_error(self, ws, error):
        """Callback ketika terjadi error"""
        error_info = {
            'message': str(error),
            'type': type(error).__name__
        }
        self.log('ERROR', 'WebSocket error occurred:', error_info)
    
    def on_close(self, ws, close_status_code, close_msg):
        """Callback ketika WebSocket connection ditutup"""
        connection_duration = 0
        if self.connection_start_time:
            connection_duration = time.time() - self.connection_start_time
        
        close_info = {
            'code': close_status_code,
            'reason': close_msg or 'No reason provided',
            'duration': f'{connection_duration:.2f} seconds'
        }
        self.log('WARN', 'WebSocket connection closed:', close_info)
        
        # Auto reconnect setelah 3 detik
        self.log('INFO', 'Attempting to reconnect in 3 seconds...')
        time.sleep(3)
        self.log('INFO', 'Reconnecting...')
        self.connect()
    
    def connect(self):
        """Membuat koneksi WebSocket"""
        ws_url = f"ws://{self.host}:{self.port}{self.path}"
        
        self.log('INFO', f'Connecting to WebSocket: {ws_url}')
        self.log('INFO', 'Parameters:', {
            'host': self.host,
            'port': self.port,
            'line': self.line,
            'status': self.status
        })
        
        # Buat WebSocket connection
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # Run forever dengan auto-reconnect
        self.ws.run_forever()
    
    def disconnect(self):
        """Menutup koneksi WebSocket"""
        if self.ws:
            self.ws.close()
            self.log('INFO', 'WebSocket connection closed by user')


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='WebSocket Test Client untuk Wira Detail API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test-websocket.py
  python test-websocket.py --host 10.5.0.106 --port 7000 --line 10 --status GOOD
  python test-websocket.py --host 192.168.1.100 --port 8080 --line 5 --status REWORK
        """
    )
    
    parser.add_argument('--host', type=str, default=DEFAULT_CONFIG['host'],
                        help=f'Host atau IP address (default: {DEFAULT_CONFIG["host"]})')
    parser.add_argument('--port', type=int, default=DEFAULT_CONFIG['port'],
                        help=f'Port number (default: {DEFAULT_CONFIG["port"]})')
    parser.add_argument('--line', type=int, default=DEFAULT_CONFIG['line'],
                        help=f'Line number (default: {DEFAULT_CONFIG["line"]})')
    parser.add_argument('--status', type=str, default=DEFAULT_CONFIG['status'],
                        choices=['GOOD', 'REWORK', 'REJECT', 'WIRA'],
                        help=f'Status (default: {DEFAULT_CONFIG["status"]})')
    
    return parser.parse_args()


def main():
    """Main function"""
    print('=' * 60)
    print('WebSocket Test Client untuk Wira Detail API (Python)')
    print('=' * 60)
    print('')
    
    # Parse arguments
    args = parse_arguments()
    
    # Buat client instance
    client = WebSocketTestClient(
        host=args.host,
        port=args.port,
        path=DEFAULT_CONFIG['path'],
        line=args.line,
        status=args.status
    )
    
    try:
        # Connect
        client.connect()
    except KeyboardInterrupt:
        print('\n')
        client.log('INFO', 'Shutting down...')
        client.disconnect()
        sys.exit(0)
    except Exception as e:
        client.log('ERROR', f'Unexpected error: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
