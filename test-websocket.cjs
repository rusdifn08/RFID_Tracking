/**
 * Script Testing WebSocket untuk API Wira Detail (CommonJS Version)
 * 
 * Usage:
 *   node test-websocket.cjs
 * 
 * Atau dengan parameter custom:
 *   node test-websocket.cjs --host 10.5.0.106 --port 7000 --line 10 --status GOOD
 */

const WebSocket = require('ws');

// Konfigurasi default
const DEFAULT_CONFIG = {
    host: '10.5.0.106',
    port: 7000,
    path: '/ws/wira-dashboard',
    line: 10,
    status: 'GOOD'
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = { ...DEFAULT_CONFIG };
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            if (key === 'host') config.host = value;
            else if (key === 'port') config.port = parseInt(value);
            else if (key === 'line') config.line = parseInt(value);
            else if (key === 'status') config.status = value;
        }
    }
    
    return config;
}

// Format timestamp
function getTimestamp() {
    return new Date().toISOString();
}

// Format message untuk display
function formatMessage(type, message, data = null) {
    const timestamp = getTimestamp();
    const prefix = type === 'INFO' ? '✅' : type === 'ERROR' ? '❌' : type === 'WARN' ? '⚠️' : '📨';
    console.log(`[${timestamp}] ${prefix} [${type}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Main function
function testWebSocket() {
    const config = parseArgs();
    
    // Build WebSocket URL
    const wsUrl = `ws://${config.host}:${config.port}${config.path}`;
    
    formatMessage('INFO', `Connecting to WebSocket: ${wsUrl}`);
    formatMessage('INFO', `Parameters:`, {
        host: config.host,
        port: config.port,
        line: config.line,
        status: config.status
    });
    
    // Create WebSocket connection
    const ws = new WebSocket(wsUrl, {
        headers: {
            'User-Agent': 'WebSocket-Test-Client/1.0'
        }
    });
    
    // Connection opened
    ws.on('open', () => {
        formatMessage('INFO', 'WebSocket connection established!');
        formatMessage('INFO', 'Ready to receive messages...');
        
        // Send test message (jika server support)
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const testMessage = {
                    type: 'ping',
                    timestamp: Date.now(),
                    line: config.line,
                    status: config.status
                };
                formatMessage('INFO', 'Sending test message:', testMessage);
                ws.send(JSON.stringify(testMessage));
            }
        }, 1000);
    });
    
    // Message received
    ws.on('message', (data) => {
        try {
            // Try to parse as JSON
            const message = JSON.parse(data.toString());
            formatMessage('MESSAGE', 'Received JSON message:', message);
        } catch (e) {
            // If not JSON, display as text
            formatMessage('MESSAGE', 'Received text message:', {
                raw: data.toString(),
                length: data.length
            });
        }
    });
    
    // Error handling
    ws.on('error', (error) => {
        formatMessage('ERROR', 'WebSocket error occurred:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    });
    
    // Connection closed
    ws.on('close', (code, reason) => {
        formatMessage('WARN', 'WebSocket connection closed:', {
            code: code,
            reason: reason.toString(),
            codeMeaning: getCloseCodeMeaning(code)
        });
        
        // Auto reconnect setelah 3 detik
        formatMessage('INFO', 'Attempting to reconnect in 3 seconds...');
        setTimeout(() => {
            formatMessage('INFO', 'Reconnecting...');
            testWebSocket();
        }, 3000);
    });
    
    // Ping/Pong untuk keep-alive
    let pingInterval;
    if (ws.readyState === WebSocket.OPEN) {
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
                formatMessage('INFO', 'Sent ping');
            }
        }, 30000); // Ping setiap 30 detik
    }
    
    // Cleanup on exit
    process.on('SIGINT', () => {
        formatMessage('INFO', 'Shutting down...');
        if (pingInterval) clearInterval(pingInterval);
        ws.close();
        process.exit(0);
    });
}

// Helper function untuk close code meaning
function getCloseCodeMeaning(code) {
    const codes = {
        1000: 'Normal Closure',
        1001: 'Going Away',
        1002: 'Protocol Error',
        1003: 'Unsupported Data',
        1004: 'Reserved',
        1005: 'No Status Received',
        1006: 'Abnormal Closure',
        1007: 'Invalid Frame Payload Data',
        1008: 'Policy Violation',
        1009: 'Message Too Big',
        1010: 'Mandatory Extension',
        1011: 'Internal Server Error',
        1012: 'Service Restart',
        1013: 'Try Again Later',
        1014: 'Bad Gateway',
        1015: 'TLS Handshake'
    };
    return codes[code] || 'Unknown';
}

// Run test
if (require.main === module) {
    console.log('='.repeat(60));
    console.log('WebSocket Test Client untuk Wira Detail API');
    console.log('='.repeat(60));
    console.log('');
    
    testWebSocket();
}

module.exports = { testWebSocket, parseArgs };
