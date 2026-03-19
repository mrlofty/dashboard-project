/**
 * SSE Integration for command.html (Mission Control)
 * Connects to real-time event stream for instant agent status and activity updates
 */

import { initSSE } from './sse-client.js';

// Initialize SSE with handlers for Mission Control
initSSE({
    onAgents: (data) => {
        // Refresh agent status - loadData() fetches both agents.json and agent-activity.json
        if (window.loadData && window.renderAgentPanels) {
            try {
                window.loadData().then(() => {
                    window.renderAgentPanels();
                });
            } catch (err) {
                console.error('[SSE] Error refreshing agent panels:', err);
            }
        }
    },
    
    onAlerts: (data) => {
        // Refresh alerts if displayed on command page
        console.log('[SSE] Alerts updated:', data);
    },
    
    onStatus: (data) => {
        // Quinn's status update - might affect agent coordination display
        if (window.loadData) {
            try {
                window.loadData();
            } catch (err) {
                console.error('[SSE] Error refreshing on status change:', err);
            }
        }
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for Mission Control');
        
        // Visual indicator
        const indicator = document.createElement('div');
        indicator.id = 'sse-indicator';
        indicator.style.cssText = 'position: fixed; bottom: 10px; right: 10px; padding: 4px 8px; background: #22c55e; color: #0a0a0f; font-size: 11px; border-radius: 4px; opacity: 0.8; z-index: 10000; font-family: monospace;';
        indicator.textContent = '● LIVE';
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.transition = 'opacity 0.5s';
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.remove();
                    }
                }, 500);
            }
        }, 3000);
    },
    
    onError: (err) => {
        console.error('[SSE] Connection error:', err);
    },
    
    onDisconnected: () => {
        console.log('[SSE] Disconnected, will attempt reconnect...');
    }
});

console.log('[SSE] Initialized for Mission Control');
