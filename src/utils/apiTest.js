/**
 * API Test Utility
 * Test koneksi ke backend API
 */

import { getApiUrl, getWebSocketUrl } from '../config/api';

export const testApiConnection = async () => {
    console.log('🧪 Testing API Connection...');

    try {
        // Test health endpoint
        const healthUrl = getApiUrl('/health');
        console.log(`📡 Testing: ${healthUrl}`);

        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Health check successful:', data);
            return { success: true, data };
        } else {
            console.error('❌ Health check failed:', response.status, response.statusText);
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
    } catch (error) {
        console.error('❌ API connection test failed:', error);
        return { success: false, error: error.message };
    }
};

export const testWebSocketConnection = () => {
    console.log('🧪 Testing WebSocket Connection...');

    return new Promise((resolve) => {
        try {
            const wsUrl = getWebSocketUrl();
            console.log(`📡 Testing WebSocket: ${wsUrl}`);

            const ws = new WebSocket(wsUrl);
            let resolved = false;

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    ws.close();
                    console.error('❌ WebSocket connection timeout');
                    resolve({ success: false, error: 'Connection timeout' });
                }
            }, 5000);

            ws.onopen = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    console.log('✅ WebSocket connection successful');
                    ws.close();
                    resolve({ success: true });
                }
            };

            ws.onerror = (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    console.error('❌ WebSocket connection failed:', error);
                    resolve({ success: false, error: 'WebSocket connection failed' });
                }
            };

        } catch (error) {
            console.error('❌ WebSocket test failed:', error);
            resolve({ success: false, error: error.message });
        }
    });
};

export const testProductionApi = async () => {
    console.log('🧪 Testing Production API...');

    try {
        const url = getApiUrl('/api/production/statistics');
        console.log(`📡 Testing: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Production API successful:', data);
            return { success: true, data };
        } else {
            console.error('❌ Production API failed:', response.status, response.statusText);
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
    } catch (error) {
        console.error('❌ Production API test failed:', error);
        return { success: false, error: error.message };
    }
};

export const testLineApi = async () => {
    console.log('🧪 Testing Line API...');

    try {
        const url = getApiUrl('/api/line1');
        console.log(`📡 Testing: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Line API successful:', data);
            return { success: true, data };
        } else {
            console.error('❌ Line API failed:', response.status, response.statusText);
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
    } catch (error) {
        console.error('❌ Line API test failed:', error);
        return { success: false, error: error.message };
    }
};

export const runAllTests = async () => {
    console.log('🚀 Running All API Tests...\n');

    const results = {
        health: await testApiConnection(),
        websocket: await testWebSocketConnection(),
        production: await testProductionApi(),
        line: await testLineApi()
    };

    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));

    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.toUpperCase()}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;

    console.log('='.repeat(50));
    console.log(`📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount / totalCount * 100)}%)`);

    return results;
};
