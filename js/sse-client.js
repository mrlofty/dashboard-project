/**
 * SSE Client for Dashboard Real-Time Updates
 * 
 * Establishes a persistent EventSource connection to /api/dashboard/stream
 * and dispatches custom events when data changes.
 * 
 * Usage:
 *   import { initSSE } from './sse-client.js';
 *   
 *   initSSE({
 *     onStatus: (data) => updateStatusCard(data),
 *     onGoals: (data) => updateGoalsList(data),
 *     onConnected: () => console.log('SSE connected'),
 *     onError: (err) => console.error('SSE error', err)
 *   });
 */

let eventSource = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max

const SSE_EVENTS = {
    STATUS: 'status',
    GOALS: 'goals',
    TOPICS: 'topics',
    CONTACTS: 'contacts',
    AGENTS: 'agents',
    ALERTS: 'alerts',
    RESEARCH: 'research',
    COLLABORATION: 'collaboration',
};

/**
 * Initialize SSE connection with event handlers
 * @param {Object} handlers - Event handlers { onStatus, onGoals, onTopics, etc. }
 */
export function initSSE(handlers = {}) {
    const {
        onStatus,
        onGoals,
        onTopics,
        onContacts,
        onAgents,
        onAlerts,
        onResearch,
        onCollaboration,
        onConnected,
        onError,
        onDisconnected
    } = handlers;

    // Close existing connection
    if (eventSource) {
        eventSource.close();
    }

    try {
        eventSource = new EventSource('/api/dashboard/stream');

        // Connection opened
        eventSource.addEventListener('open', () => {
            console.log('[SSE] Connected to dashboard stream');
            reconnectAttempts = 0;
            if (onConnected) onConnected();
        });

        // Register handlers for named events
        if (onStatus) {
            eventSource.addEventListener(SSE_EVENTS.STATUS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onStatus(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse status event:', err);
                }
            });
        }

        if (onGoals) {
            eventSource.addEventListener(SSE_EVENTS.GOALS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onGoals(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse goals event:', err);
                }
            });
        }

        if (onTopics) {
            eventSource.addEventListener(SSE_EVENTS.TOPICS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onTopics(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse topics event:', err);
                }
            });
        }

        if (onContacts) {
            eventSource.addEventListener(SSE_EVENTS.CONTACTS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onContacts(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse contacts event:', err);
                }
            });
        }

        if (onAgents) {
            eventSource.addEventListener(SSE_EVENTS.AGENTS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onAgents(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse agents event:', err);
                }
            });
        }

        if (onAlerts) {
            eventSource.addEventListener(SSE_EVENTS.ALERTS, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onAlerts(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse alerts event:', err);
                }
            });
        }

        if (onResearch) {
            eventSource.addEventListener(SSE_EVENTS.RESEARCH, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onResearch(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse research event:', err);
                }
            });
        }

        if (onCollaboration) {
            eventSource.addEventListener(SSE_EVENTS.COLLABORATION, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    onCollaboration(data);
                } catch (err) {
                    console.error('[SSE] Failed to parse collaboration event:', err);
                }
            });
        }

        // Error handling
        eventSource.addEventListener('error', (e) => {
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log('[SSE] Connection closed, attempting reconnect...');
                if (onDisconnected) onDisconnected();
                scheduleReconnect(handlers);
            } else {
                console.error('[SSE] Connection error:', e);
                if (onError) onError(e);
            }
        });

    } catch (err) {
        console.error('[SSE] Failed to create EventSource:', err);
        if (onError) onError(err);
        scheduleReconnect(handlers);
    }
}

/**
 * Schedule automatic reconnection with exponential backoff
 */
function scheduleReconnect(handlers) {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
    
    reconnectTimer = setTimeout(() => {
        console.log('[SSE] Attempting to reconnect...');
        initSSE(handlers);
    }, delay);
}

/**
 * Close SSE connection
 */
export function closeSSE() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log('[SSE] Connection closed');
    }
}

/**
 * Get current connection state
 * @returns {number} EventSource.CONNECTING (0), EventSource.OPEN (1), or EventSource.CLOSED (2)
 */
export function getConnectionState() {
    return eventSource ? eventSource.readyState : EventSource.CLOSED;
}

/**
 * Check if SSE is connected
 * @returns {boolean}
 */
export function isConnected() {
    return eventSource && eventSource.readyState === EventSource.OPEN;
}
