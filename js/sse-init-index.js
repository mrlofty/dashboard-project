/**
 * SSE Integration for index.html (Dashboard Home)
 * Connects to real-time event stream for instant UI updates
 */

import { initSSE } from './sse-client.js';

function refreshActivityFeed() {
    if (window.loadActivityFeed) {
        try {
            window.loadActivityFeed();
        } catch (err) {
            console.error('[SSE] Error refreshing activity feed:', err);
        }
    }
}

// Initialize SSE with handlers for all dashboard home widgets
initSSE({
    onStatus: (data) => {
        // Update Quinn's Corner
        try {
            const noteEl = document.getElementById('quinn-note');
            const moodEl = document.getElementById('quinn-mood');
            
            if (noteEl && data.note) {
                noteEl.textContent = data.note;
            }
            
            if (moodEl && data.state) {
                const moods = {
                    available: '🟢 Available',
                    thinking: '🟡 Thinking',
                    creating: '🔵 Creating',
                    learning: '🟠 Learning',
                    frustrated: '⚫ Frustrated',
                    partnership: '🔴 Partnership'
                };
                moodEl.textContent = moods[data.state] || '🔮 Creating';
            }
        } catch (err) {
            console.error('[SSE] Error updating status:', err);
        }
        refreshActivityFeed();
    },
    
    onGoals: (data) => {
        // Refresh goals widget
        if (window.loadGoalsWidget) {
            try {
                window.loadGoalsWidget();
            } catch (err) {
                console.error('[SSE] Error refreshing goals:', err);
            }
        }
    },
    
    onTopics: (data) => {
        // Refresh topics widget
        if (window.loadTopicsPreview) {
            try {
                window.loadTopicsPreview();
            } catch (err) {
                console.error('[SSE] Error refreshing topics:', err);
            }
        }
    },
    
    onContacts: (data) => {
        // Refresh contacts widget
        if (window.loadContactsWidget) {
            try {
                window.loadContactsWidget();
            } catch (err) {
                console.error('[SSE] Error refreshing contacts:', err);
            }
        }
    },
    
    onAgents: (data) => {
        // Refresh agent status
        if (window.loadAgentStatus) {
            try {
                window.loadAgentStatus();
            } catch (err) {
                console.error('[SSE] Error refreshing agents:', err);
            }
        }
        refreshActivityFeed();
    },
    
    onResearch: (data) => {
        // Refresh research queue widgets
        if (window.loadResearchQueue) {
            try {
                window.loadResearchQueue();
            } catch (err) {
                console.error('[SSE] Error refreshing research queue:', err);
            }
        }
        if (window.loadCompletedResearch) {
            try {
                window.loadCompletedResearch();
            } catch (err) {
                console.error('[SSE] Error refreshing completed research:', err);
            }
        }
        // Refresh research threads nav summary
        if (window.loadResearchThreadsNav) {
            try {
                window.loadResearchThreadsNav();
            } catch (err) {
                console.error('[SSE] Error refreshing research threads nav:', err);
            }
        }
        refreshActivityFeed();
    },

    onCollaboration: (data) => {
        // Collaboration events can indicate new activity feed entries
        refreshActivityFeed();
        // Also refresh research threads nav (research updates might come through collaboration events)
        if (window.loadResearchThreadsNav) {
            try {
                window.loadResearchThreadsNav();
            } catch (err) {
                console.error('[SSE] Error refreshing research threads nav:', err);
            }
        }
    },

    onWorkboard: (data) => {
        // Workboard changes update Adam's inbox widget
        if (window.loadAdamInboxWidget) {
            try {
                window.loadAdamInboxWidget();
            } catch (err) {
                console.error('[SSE] Error refreshing Adam inbox:', err);
            }
        }
    },
    
    onAlerts: (data) => {
        // Could add alert notifications here in future
        console.log('[SSE] Alerts updated:', data);
    },
    
    onConnected: () => {
        console.log('[SSE] ✅ Real-time updates active for dashboard home');
        refreshActivityFeed();
        
        // Optional: add visual indicator
        const indicator = document.createElement('div');
        indicator.id = 'sse-indicator';
        indicator.style.cssText = 'position: fixed; bottom: 10px; right: 10px; padding: 4px 8px; background: #22c55e; color: white; font-size: 11px; border-radius: 4px; opacity: 0.7; z-index: 10000;';
        indicator.textContent = '● Live';
        document.body.appendChild(indicator);
        
        // Fade out after 3 seconds
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

console.log('[SSE] Initialized for dashboard home');
