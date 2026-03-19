/**
 * SSE Integration for topics.html
 * Real-time topic updates
 */

import { initSSE } from './sse-client.js';

initSSE({
    onTopics: (data) => {
        if (window.renderTopics) {
            window.renderTopics(data);
        } else {
            window.location.reload();
        }
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for topics page');
    }
});
