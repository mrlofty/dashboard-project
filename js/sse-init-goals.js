/**
 * SSE Integration for goals.html
 * Real-time goal updates
 */

import { initSSE } from './sse-client.js';

initSSE({
    onGoals: (data) => {
        if (window.renderGoals) {
            window.renderGoals(data);
        } else if (window.location.reload) {
            // If render function not exposed, just reload
            window.location.reload();
        }
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for goals page');
    }
});
