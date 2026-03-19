# SSE Integration Guide

## Overview

The dashboard now supports **Server-Sent Events (SSE)** for real-time updates. When Quinn updates status, goals, or any data file, changes appear in the dashboard instantly — no more polling delays.

## How It Works

1. **Server**: `api/server.py` watches `data/*.json` files for changes (using `mtime` polling every 1 second)
2. **SSE Endpoint**: `/api/dashboard/stream` sends named events when files change
3. **Client**: `js/sse-client.js` connects to the stream and dispatches handlers

## Quick Start

### 1. Import the SSE client

```html
<script type="module">
    import { initSSE } from './js/sse-client.js';
    
    // Your page code...
</script>
```

### 2. Initialize with handlers

```javascript
initSSE({
    onStatus: (data) => {
        // Update status card
        document.getElementById('status-state').textContent = data.state;
        document.getElementById('status-context').textContent = data.context;
    },
    
    onGoals: (data) => {
        // Rebuild goals list
        renderGoals(data.goals);
    },
    
    onConnected: () => {
        console.log('✅ Real-time updates active');
    },
    
    onError: (err) => {
        console.error('❌ SSE connection error', err);
    }
});
```

### 3. Keep your existing fetch-on-load

SSE **enhances** your page, it doesn't replace initial data loading. Keep your existing `fetch()` calls for page load — SSE just makes updates instant after that.

```javascript
// Still load data on page load
async function loadInitialData() {
    const response = await fetch('/api/status');
    const data = await response.json();
    renderStatus(data);
}

// Then init SSE for live updates
initSSE({
    onStatus: (data) => renderStatus(data)
});

loadInitialData();
```

## Available Events

| Event | File | Description |
|-------|------|-------------|
| `status` | `status.json` | Quinn's current state, context, activity |
| `goals` | `goals.json` | Active/planned goals |
| `topics` | `topics.json` | Current topics and focus areas |
| `contacts` | `contacts.json` | People Quinn knows |
| `agents` | `agents.json` | Sub-agent status (Forge, Scout, etc.) |
| `alerts` | `alerts.json` | Dashboard alerts |
| `research` | `research-queue.json` | Research queue items |
| `collaboration` | `collaboration.json` | Collaboration queue |

## Connection Lifecycle

- **Auto-reconnect**: If the connection drops, SSE client automatically retries with exponential backoff (up to 30s delay)
- **Initial data**: On connection, the server sends current state for all files
- **Keepalive**: Server sends a comment every 30s to keep the connection alive

## Testing

1. **Start the API server**:
   ```bash
   systemctl restart dashboard-api
   # or
   python3 /home/adam/clawd/dashboard-project/api/server.py
   ```

2. **Test with curl**:
   ```bash
   curl -N http://localhost:8081/api/dashboard/stream
   ```
   
   You should see initial events, then keepalive comments every 30s.

3. **Trigger an update**:
   ```bash
   # Modify a data file
   touch /home/adam/clawd/dashboard-project/data/status.json
   ```
   
   Within 1 second, you should see the `event: status` broadcast in your curl output.

4. **Check logs**:
   ```bash
   journalctl -u dashboard-api -f
   ```
   
   Look for `[SSE] Broadcast <event> update to N clients` messages.

## nginx Configuration

The SSE endpoint should work through the existing `/api/` proxy. If you experience issues, ensure these headers are set in `/etc/nginx/sites-available/dashboard`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8081/api/;
    
    # SSE-specific headers
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
```

After changes: `sudo systemctl reload nginx`

## Browser DevTools

Open your dashboard page and check the **Network** tab:
- Filter by `dashboard/stream`
- Should show `Status: 200` with `Type: eventsource`
- Messages tab shows incoming SSE events in real-time

## Fallback Strategy

If SSE fails for any reason, pages fall back to their original fetch-based loading. SSE is **additive** — it enhances the experience but isn't required for basic functionality.

## Performance

- **Overhead**: Minimal. File watching uses `mtime` polling (1s intervals), no inotify dependencies.
- **Concurrent clients**: Python's `http.server` is single-threaded, but SSE uses threading for the watcher and client broadcasting.
- **Bandwidth**: Only sends data when files actually change. Keepalive comments are ~20 bytes every 30s.

## Migration Checklist

For each dashboard page:

- [ ] Import `sse-client.js` as a module
- [ ] Add `initSSE()` call with relevant handlers
- [ ] Keep existing `fetch()` for initial load
- [ ] Replace SSE handler logic with existing render functions (DRY)
- [ ] Test: modify a data file, confirm UI updates instantly

## Example: Status Card

**Before (polling every 5s)**:
```javascript
async function loadStatus() {
    const res = await fetch('/api/status');
    const data = await res.json();
    renderStatus(data);
}

loadStatus();
setInterval(loadStatus, 5000);  // Poll every 5s
```

**After (SSE)**:
```javascript
import { initSSE } from './js/sse-client.js';

async function loadStatus() {
    const res = await fetch('/api/status');
    const data = await res.json();
    renderStatus(data);
}

function renderStatus(data) {
    document.getElementById('status-state').textContent = data.state;
    document.getElementById('status-context').textContent = data.context;
    // ... etc
}

// Initial load
loadStatus();

// Real-time updates
initSSE({
    onStatus: (data) => renderStatus(data)
});
```

**Result**: Updates appear in <100ms instead of waiting up to 5 seconds.
