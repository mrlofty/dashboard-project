#!/usr/bin/env python3
"""
Simple API server for Quinn & Adam Dashboard
No external dependencies - uses built-in http.server
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import json
import os
import glob
import sys
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import threading
import time

# Add path for spotify module
sys.path.insert(0, '/home/adam/clawd/scripts')
import spotify as spotify_module

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
MEMORY_DIR = "/home/adam/clawd/memory"
WORKSPACE_DIR = "/home/adam/clawd"

# SSE: Global state for file watching
file_mtimes = {}
sse_clients = []
sse_lock = threading.Lock()

class DashboardAPIHandler(BaseHTTPRequestHandler):
    
    def _send_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _send_error(self, message, status=400):
        self._send_response({"error": message}, status)
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _get_file_for_path(self, path):
        """Map API paths to filenames"""
        mappings = {
            '/api/goals': 'goals.json',
            '/api/contacts': 'contacts.json',
            '/api/research': 'research-queue.json',
            '/api/status': 'status.json',
            '/api/topics': 'topics.json',
            '/api/collaboration': 'collaboration.json',
            '/api/alerts': 'alerts.json',
            '/api/pricewatch': 'pricewatch.json',
            '/api/suggestions': 'suggestions.json',
            '/api/schedule': 'schedule.json',
            '/api/agents': 'agents.json',
            '/api/models': 'models.json',
            '/api/inbox': 'inbox.json',
            '/api/shoots': 'shoots.json',
            '/api/locations': 'locations.json',
            '/api/routes': 'routes.json',
            '/api/workboard': 'workboard.json',
            '/api/research-threads': 'research.json',
            '/api/heatmap': 'heatmap.json',
        }
        return mappings.get(path)
    
    def _list_memory_files(self):
        """List all memory files"""
        files = []
        
        # Daily memory files (2026/02/2026-02-14.md format)
        daily_pattern = os.path.join(MEMORY_DIR, "2026", "*", "*.md")
        for filepath in sorted(glob.glob(daily_pattern), reverse=True):
            filename = os.path.basename(filepath)
            date = filename.replace('.md', '')
            files.append({
                "id": f"daily/{date}",
                "name": filename,
                "type": "daily",
                "date": date,
                "path": filepath
            })
        
        # Topic files
        topics_dir = os.path.join(MEMORY_DIR, "topics")
        if os.path.exists(topics_dir):
            for filename in sorted(os.listdir(topics_dir)):
                if filename.endswith('.md'):
                    files.append({
                        "id": f"topics/{filename.replace('.md', '')}",
                        "name": filename,
                        "type": "topic",
                        "path": os.path.join(topics_dir, filename)
                    })
        
        # Core workspace files
        core_files = ["MEMORY.md", "IDENTITY.md", "SOUL.md", "USER.md"]
        for filename in core_files:
            filepath = os.path.join(WORKSPACE_DIR, filename)
            if os.path.exists(filepath):
                files.append({
                    "id": f"core/{filename.replace('.md', '').lower()}",
                    "name": filename,
                    "type": "core",
                    "path": filepath
                })
        
        return files
    
    def _read_memory_file(self, file_id):
        """Read a specific memory file"""
        files = self._list_memory_files()
        for f in files:
            if f["id"] == file_id:
                try:
                    with open(f["path"], 'r') as fp:
                        content = fp.read()
                    return {
                        "id": f["id"],
                        "name": f["name"],
                        "type": f["type"],
                        "content": content
                    }
                except Exception as e:
                    return {"error": str(e)}
        return {"error": "File not found"}
    
    def _get_openclaw_sessions(self):
        """Read OpenClaw session state from filesystem (zero overhead to Quinn)"""
        sessions_file = os.path.expanduser("~/.openclaw/agents/main/sessions/sessions.json")
        try:
            with open(sessions_file, 'r') as f:
                sessions = json.load(f)
            
            result = {}
            for key, sess in sessions.items():
                result[key] = {
                    "sessionKey": key,
                    "updatedAt": sess.get("updatedAt"),
                    "chatType": sess.get("chatType"),
                    "channel": sess.get("deliveryContext", {}).get("channel"),
                    "compactionCount": sess.get("compactionCount", 0),
                    "origin": sess.get("origin", {}).get("label", "unknown"),
                }
            return result
        except Exception as e:
            return {"error": str(e)}

    def _get_cron_jobs(self):
        """Read cron jobs from filesystem"""
        cron_file = os.path.expanduser("~/.openclaw/cron/jobs.json")
        try:
            with open(cron_file, 'r') as f:
                return json.load(f)
        except Exception:
            return []

    def _read_workspace_file(self, relpath):
        """Read a file from the workspace directory (text only, sandboxed)"""
        # Security: only allow reading .md and .json files within workspace
        if '..' in relpath or relpath.startswith('/'):
            return None
        allowed_extensions = ('.md', '.json')
        if not relpath.endswith(allowed_extensions):
            return None
        fullpath = os.path.join(WORKSPACE_DIR, relpath)
        # Ensure it resolves inside workspace
        fullpath = os.path.realpath(fullpath)
        if not fullpath.startswith(os.path.realpath(WORKSPACE_DIR)):
            return None
        if not os.path.exists(fullpath):
            return None
        try:
            with open(fullpath, 'r') as f:
                return f.read()
        except Exception:
            return None

    def _validate_workspace_path(self, filepath):
        """Validate that an absolute path is inside /home/adam/clawd/ — no escaping"""
        realpath = os.path.realpath(filepath)
        workspace_real = os.path.realpath(WORKSPACE_DIR)
        return realpath.startswith(workspace_real + os.sep) or realpath == workspace_real

    def _list_directory_md(self, dirpath):
        """List .md files and subdirectories in a directory (sandboxed to workspace)"""
        if not self._validate_workspace_path(dirpath):
            return None
        if not os.path.isdir(dirpath):
            return None
        
        items = []
        try:
            for entry in sorted(os.listdir(dirpath)):
                fullpath = os.path.join(dirpath, entry)
                if os.path.isdir(fullpath):
                    # Include subdirectories (for navigation)
                    items.append({
                        "name": entry,
                        "type": "directory",
                        "path": fullpath
                    })
                elif entry.endswith('.md'):
                    stat = os.stat(fullpath)
                    items.append({
                        "name": entry,
                        "type": "file",
                        "path": fullpath,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        except Exception:
            return None
        return items

    def _read_file_absolute(self, filepath):
        """Read a file by absolute path (sandboxed to workspace)"""
        if not self._validate_workspace_path(filepath):
            return None
        if not os.path.isfile(filepath):
            return None
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return None

    def _write_file_absolute(self, filepath, content):
        """Write a file by absolute path (sandboxed to workspace, .md only)"""
        if not self._validate_workspace_path(filepath):
            return {"error": "Path outside workspace"}
        if not filepath.endswith('.md'):
            return {"error": "Only .md files can be written"}
        # Create parent directories if needed
        parent = os.path.dirname(filepath)
        if not os.path.exists(parent):
            try:
                os.makedirs(parent, exist_ok=True)
            except Exception as e:
                return {"error": f"Cannot create directory: {e}"}
        try:
            # Backup existing file
            if os.path.exists(filepath):
                backup_path = filepath + '.bak'
                with open(filepath, 'r', encoding='utf-8') as f:
                    with open(backup_path, 'w', encoding='utf-8') as b:
                        b.write(f.read())
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"status": "ok", "path": filepath, "size": len(content)}
        except Exception as e:
            return {"error": str(e)}

    def _get_spotify_now_playing(self):
        """Get currently playing track from Spotify"""
        try:
            r = spotify_module.api("GET", "/me/player/currently-playing")
            if r.status_code == 204 or not r.text:
                return {"playing": False, "track": None}
            data = r.json()
            track = data.get("item", {})
            return {
                "playing": data.get("is_playing", False),
                "track": {
                    "name": track.get("name", "Unknown"),
                    "artist": ", ".join(a["name"] for a in track.get("artists", [])),
                    "album": track.get("album", {}).get("name", ""),
                    "album_art": track.get("album", {}).get("images", [{}])[0].get("url") if track.get("album", {}).get("images") else None,
                    "duration_ms": track.get("duration_ms", 0),
                    "progress_ms": data.get("progress_ms", 0),
                    "uri": track.get("uri", ""),
                    "url": track.get("external_urls", {}).get("spotify", "")
                }
            }
        except Exception as e:
            return {"error": str(e), "playing": False}
    
    def _get_spotify_recent(self, limit=10):
        """Get recently played tracks"""
        try:
            r = spotify_module.api("GET", "/me/player/recently-played", params={"limit": limit})
            data = r.json()
            tracks = []
            for item in data.get("items", []):
                track = item["track"]
                tracks.append({
                    "name": track.get("name", "Unknown"),
                    "artist": ", ".join(a["name"] for a in track.get("artists", [])),
                    "album": track.get("album", {}).get("name", ""),
                    "album_art": track.get("album", {}).get("images", [{}])[0].get("url") if track.get("album", {}).get("images") else None,
                    "played_at": item.get("played_at", ""),
                    "uri": track.get("uri", ""),
                    "url": track.get("external_urls", {}).get("spotify", "")
                })
            return {"tracks": tracks}
        except Exception as e:
            return {"error": str(e), "tracks": []}
    
    def _get_spotify_top_tracks(self, time_range="medium_term", limit=10):
        """Get user's top tracks"""
        try:
            r = spotify_module.api("GET", "/me/top/tracks", params={"limit": limit, "time_range": time_range})
            data = r.json()
            tracks = []
            for track in data.get("items", []):
                tracks.append({
                    "name": track.get("name", "Unknown"),
                    "artist": ", ".join(a["name"] for a in track.get("artists", [])),
                    "album": track.get("album", {}).get("name", ""),
                    "album_art": track.get("album", {}).get("images", [{}])[0].get("url") if track.get("album", {}).get("images") else None,
                    "uri": track.get("uri", ""),
                    "url": track.get("external_urls", {}).get("spotify", "")
                })
            return {"tracks": tracks, "time_range": time_range}
        except Exception as e:
            return {"error": str(e), "tracks": []}
    
    def _get_spotify_top_artists(self, time_range="medium_term", limit=10):
        """Get user's top artists"""
        try:
            r = spotify_module.api("GET", "/me/top/artists", params={"limit": limit, "time_range": time_range})
            data = r.json()
            artists = []
            for artist in data.get("items", []):
                artists.append({
                    "name": artist.get("name", "Unknown"),
                    "genres": artist.get("genres", [])[:3],
                    "image": artist.get("images", [{}])[0].get("url") if artist.get("images") else None,
                    "uri": artist.get("uri", ""),
                    "url": artist.get("external_urls", {}).get("spotify", "")
                })
            return {"artists": artists, "time_range": time_range}
        except Exception as e:
            return {"error": str(e), "artists": []}

    def _send_sse_event(self, event_name, data):
        """Send SSE event to client"""
        try:
            event_data = json.dumps(data)
            self.wfile.write(f"event: {event_name}\n".encode())
            self.wfile.write(f"data: {event_data}\n\n".encode())
            self.wfile.flush()
            return True
        except (BrokenPipeError, ConnectionResetError):
            return False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        # SSE stream endpoint
        if path == '/api/dashboard/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Register this client
            with sse_lock:
                sse_clients.append(self.wfile)
            
            try:
                # Send initial data for all endpoints
                initial_files = [
                    ('status', 'status.json'),
                    ('goals', 'goals.json'),
                    ('topics', 'topics.json'),
                    ('contacts', 'contacts.json'),
                    ('agents', 'agents.json'),
                    ('alerts', 'alerts.json'),
                ]
                
                for event_name, filename in initial_files:
                    filepath = os.path.join(DATA_DIR, filename)
                    if os.path.exists(filepath):
                        try:
                            with open(filepath, 'r') as f:
                                data = json.load(f)
                            if not self._send_sse_event(event_name, data):
                                break
                        except Exception:
                            pass
                
                # Keep connection alive with periodic comments
                while True:
                    time.sleep(30)
                    try:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        break
                        
            except Exception:
                pass
            finally:
                # Unregister client
                with sse_lock:
                    if self.wfile in sse_clients:
                        sse_clients.remove(self.wfile)
            return
        
        # Spotify endpoints
        if path == '/api/spotify/now':
            data = self._get_spotify_now_playing()
            self._send_response(data)
            return
        
        if path == '/api/spotify/recent':
            limit = int(query.get('limit', ['10'])[0])
            data = self._get_spotify_recent(limit)
            self._send_response(data)
            return
        
        if path == '/api/spotify/top-tracks':
            time_range = query.get('time_range', ['medium_term'])[0]
            limit = int(query.get('limit', ['10'])[0])
            data = self._get_spotify_top_tracks(time_range, limit)
            self._send_response(data)
            return
        
        if path == '/api/spotify/top-artists':
            time_range = query.get('time_range', ['medium_term'])[0]
            limit = int(query.get('limit', ['10'])[0])
            data = self._get_spotify_top_artists(time_range, limit)
            self._send_response(data)
            return
        
        # OpenClaw session state (passive read from filesystem)
        if path == '/api/openclaw/sessions':
            data = self._get_openclaw_sessions()
            self._send_response(data)
            return
        
        # Cron jobs (passive read)
        if path == '/api/openclaw/cron':
            data = self._get_cron_jobs()
            self._send_response(data)
            return
        
        # Editor: list .md files in a directory
        if path == '/api/files':
            dirpath = query.get('dir', [None])[0]
            if not dirpath:
                self._send_error("Missing dir parameter", 400)
                return
            items = self._list_directory_md(dirpath)
            if items is None:
                self._send_error("Directory not found or not allowed", 404)
                return
            self._send_response({"dir": dirpath, "items": items})
            return
        
        # Editor: read a specific file
        if path == '/api/files/read':
            filepath = query.get('path', [None])[0]
            if not filepath:
                self._send_error("Missing path parameter", 400)
                return
            content = self._read_file_absolute(filepath)
            if content is None:
                self._send_error("File not found or not allowed", 404)
                return
            self._send_response({"path": filepath, "content": content, "size": len(content)})
            return
        
        # Workspace file reader (for task queues, etc.)
        if path == '/api/file':
            relpath = query.get('path', [None])[0]
            if not relpath:
                self._send_error("Missing path parameter", 400)
                return
            content = self._read_workspace_file(relpath)
            if content is None:
                self._send_error("File not found or not allowed", 404)
                return
            # Send as plain text
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            return

        # Health check
        if path == '/api/health':
            self._send_response({
                "status": "ok",
                "service": "dashboard-api",
                "timestamp": datetime.now().isoformat()
            })
            return
        
        # Memory files list
        if path == '/api/memory':
            files = self._list_memory_files()
            self._send_response({"files": files})
            return
        
        # Read specific memory file
        if path == '/api/memory/read':
            file_id = query.get('id', [None])[0]
            if not file_id:
                self._send_error("Missing file id", 400)
                return
            result = self._read_memory_file(file_id)
            if "error" in result:
                self._send_error(result["error"], 404)
            else:
                self._send_response(result)
            return
        
        # Get data file
        filename = self._get_file_for_path(path)
        if not filename:
            self._send_error("Unknown endpoint", 404)
            return
        
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            self._send_error(f"File {filename} not found", 404)
            return
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            self._send_response(data)
        except Exception as e:
            self._send_error(str(e), 500)
    
    def do_POST(self):
        path = urlparse(self.path).path
        
        # Generic file write (used by inbox, notes pages) — accepts {path: "relative/path", content: "..."}
        if path == '/api/file':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(body)
                rel_path = payload.get('path', '')
                content = payload.get('content')
                if not rel_path or content is None:
                    self._send_error("Missing path or content", 400)
                    return
                # Resolve relative to workspace
                abs_path = os.path.realpath(os.path.join(WORKSPACE_DIR, rel_path))
                if not abs_path.startswith(os.path.realpath(WORKSPACE_DIR)):
                    self._send_error("Path outside workspace", 403)
                    return
                # Create parent dirs if needed
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                # Backup if exists
                if os.path.exists(abs_path):
                    backup_path = abs_path + '.backup'
                    with open(abs_path, 'r') as f:
                        with open(backup_path, 'w') as b:
                            b.write(f.read())
                with open(abs_path, 'w') as f:
                    f.write(content)
                self._send_response({"ok": True, "path": rel_path})
            except json.JSONDecodeError as e:
                self._send_error(f"Invalid JSON: {e}", 400)
            except Exception as e:
                self._send_error(str(e), 500)
            return
        
        # Editor: write file contents
        if path == '/api/files/write':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(body)
                filepath = payload.get('path')
                content = payload.get('content')
                if not filepath or content is None:
                    self._send_error("Missing path or content", 400)
                    return
                result = self._write_file_absolute(filepath, content)
                if "error" in result:
                    self._send_error(result["error"], 400)
                else:
                    result["timestamp"] = datetime.now().isoformat()
                    self._send_response(result)
            except json.JSONDecodeError as e:
                self._send_error(f"Invalid JSON: {e}", 400)
            except Exception as e:
                self._send_error(str(e), 500)
            return
        
        # Get data file
        filename = self._get_file_for_path(path)
        if not filename:
            self._send_error("Unknown endpoint", 404)
            return
        
        filepath = os.path.join(DATA_DIR, filename)
        
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(body)
            
            # Get the data to save (handle both {data: ...} and direct payload)
            data = payload.get('data', payload)
            
            # Create backup
            if os.path.exists(filepath):
                backup_path = f"{filepath}.backup"
                with open(filepath, 'r') as f:
                    with open(backup_path, 'w') as b:
                        b.write(f.read())
            
            # Write new data
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            
            self._send_response({
                "status": "ok",
                "message": f"{filename} saved",
                "timestamp": datetime.now().isoformat()
            })
            
        except json.JSONDecodeError as e:
            self._send_error(f"Invalid JSON: {e}", 400)
        except Exception as e:
            self._send_error(str(e), 500)
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[API] {self.address_string()} - {args[0]}")

def watch_data_files():
    """Background thread: watch data files and emit SSE events on changes"""
    global file_mtimes
    
    # File to event name mapping
    watched_files = {
        'status.json': 'status',
        'goals.json': 'goals',
        'topics.json': 'topics',
        'contacts.json': 'contacts',
        'agents.json': 'agents',
        'alerts.json': 'alerts',
        'research-queue.json': 'research',
        'collaboration.json': 'collaboration',
    }
    
    # Initialize mtimes
    for filename in watched_files.keys():
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            file_mtimes[filename] = os.path.getmtime(filepath)
        else:
            file_mtimes[filename] = 0
    
    while True:
        time.sleep(1)  # Check every second
        
        for filename, event_name in watched_files.items():
            filepath = os.path.join(DATA_DIR, filename)
            
            if not os.path.exists(filepath):
                continue
            
            current_mtime = os.path.getmtime(filepath)
            
            if current_mtime > file_mtimes.get(filename, 0):
                file_mtimes[filename] = current_mtime
                
                # Read file and broadcast to all SSE clients
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                    
                    event_data = json.dumps(data)
                    message = f"event: {event_name}\ndata: {event_data}\n\n".encode()
                    
                    with sse_lock:
                        dead_clients = []
                        for client in sse_clients:
                            try:
                                client.write(message)
                                client.flush()
                            except (BrokenPipeError, ConnectionResetError, OSError):
                                dead_clients.append(client)
                        
                        # Remove dead clients
                        for client in dead_clients:
                            if client in sse_clients:
                                sse_clients.remove(client)
                    
                    print(f"[SSE] Broadcast {event_name} update to {len(sse_clients)} clients")
                    
                except Exception as e:
                    print(f"[SSE] Error broadcasting {filename}: {e}")

def run_server(port=8081):
    # Start file watcher thread
    watcher = threading.Thread(target=watch_data_files, daemon=True)
    watcher.start()
    
    class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True
    
    server = ThreadingHTTPServer(('0.0.0.0', port), DashboardAPIHandler)
    print(f"🚀 Dashboard API running on http://0.0.0.0:{port}")
    print(f"   Endpoints: /api/goals, /api/contacts, /api/research, /api/status, /api/memory")
    print(f"   SSE Stream: /api/dashboard/stream")
    print(f"   Data dir: {DATA_DIR}")
    print(f"   Memory dir: {MEMORY_DIR}")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
