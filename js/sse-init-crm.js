/**
 * SSE Integration for crm.html
 * Real-time contact updates
 */

import { initSSE } from './sse-client.js';

initSSE({
    onContacts: (data) => {
        if (window.loadContacts) {
            window.loadContacts();
        } else {
            window.location.reload();
        }
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for CRM page');
    }
});
