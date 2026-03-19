/**
 * SSE Integration for agents.html
 * Real-time agent status updates
 */

import { initSSE } from './sse-client.js';

initSSE({
    onAgents: (data) => {
        if (window.loadDashboardData) {
            window.loadDashboardData();
        }
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for agents page');
    }
});
