#!/usr/bin/env python3
"""Simple proxy that exposes Paperless-ngx document storage stats.

Calculates actual document storage by issuing HEAD requests against
each document's download endpoint and summing Content-Length headers.
Results are cached to avoid hammering the API on every refresh.
"""

import json
import os
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

PAPERLESS_URL = os.environ.get("PAPERLESS_URL", "http://localhost:8776")
PAPERLESS_TOKEN = os.environ.get("PAPERLESS_TOKEN", "")
PORT = int(os.environ.get("PORT", "8080"))
CACHE_TTL = int(os.environ.get("CACHE_TTL", "300"))  # 5 minutes

_cache = {"data": None, "timestamp": 0}


def _headers():
    return {"Authorization": f"Token {PAPERLESS_TOKEN}", "Accept": "application/json"}


def _fetch_json(path):
    """Fetch JSON from Paperless API."""
    req = urllib.request.Request(f"{PAPERLESS_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)


def _head(path):
    """Issue HEAD request, return Content-Length or 0."""
    req = urllib.request.Request(f"{PAPERLESS_URL}{path}", method="HEAD", headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return int(resp.headers.get("Content-Length", 0))
    except Exception:
        return 0


def _calculate_storage():
    """Sum actual document sizes via HEAD requests on download endpoints."""
    total_size = 0
    page = 1
    while True:
        data = _fetch_json(f"/api/documents/?page={page}&page_size=100&fields=id")
        for doc in data.get("results", []):
            total_size += _head(f"/api/documents/{doc['id']}/download/")
        if not data.get("next"):
            break
        page += 1
    return total_size


def _fetch_tasks():
    """Fetch task counts by status from Paperless tasks API."""
    try:
        tasks = _fetch_json("/api/tasks/")
        counts = {"active": 0, "pending": 0, "failed": 0}
        for task in tasks:
            status = task.get("status", "").upper()
            if status == "STARTED":
                counts["active"] += 1
            elif status == "PENDING":
                counts["pending"] += 1
            elif status == "FAILURE":
                counts["failed"] += 1
        return counts
    except Exception:
        return {"active": 0, "pending": 0, "failed": 0}


def _get_stats():
    """Get stats, using cache if fresh."""
    now = time.time()
    if _cache["data"] and (now - _cache["timestamp"]) < CACHE_TTL:
        return _cache["data"]

    stats = _fetch_json("/api/statistics/")
    doc_storage = _calculate_storage()
    task_counts = _fetch_tasks()

    result = {
        "documents": stats.get("documents_total", 0),
        "storage_bytes": doc_storage,
        "file_types": stats.get("document_file_type_counts", []),
        "character_count": stats.get("character_count", 0),
        "active_tasks": task_counts["active"],
        "pending_tasks": task_counts["pending"],
        "failed_tasks": task_counts["failed"],
    }

    _cache["data"] = result
    _cache["timestamp"] = now
    return result


class StatsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self._handle_json()
        elif self.path == "/metrics":
            self._handle_metrics()
        else:
            self.send_error(404)

    def _handle_json(self):
        """JSON endpoint for Homepage widget."""
        try:
            stats = _get_stats()
            result = {
                "documents": stats["documents"],
                "storage_bytes": stats["storage_bytes"],
                "active_tasks": stats["active_tasks"],
                "pending_tasks": stats["pending_tasks"],
                "failed_tasks": stats["failed_tasks"],
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_metrics(self):
        """Prometheus metrics endpoint."""
        try:
            stats = _get_stats()

            lines = [
                "# HELP paperless_documents_total Total number of documents",
                "# TYPE paperless_documents_total gauge",
                f"paperless_documents_total {stats['documents']}",
                "# HELP paperless_storage_bytes Total size of all documents in bytes",
                "# TYPE paperless_storage_bytes gauge",
                f"paperless_storage_bytes {stats['storage_bytes']}",
                "# HELP paperless_character_count Total characters across all documents",
                "# TYPE paperless_character_count gauge",
                f"paperless_character_count {stats['character_count']}",
                "# HELP paperless_tasks_active Currently running tasks",
                "# TYPE paperless_tasks_active gauge",
                f"paperless_tasks_active {stats['active_tasks']}",
                "# HELP paperless_tasks_pending Pending tasks in queue",
                "# TYPE paperless_tasks_pending gauge",
                f"paperless_tasks_pending {stats['pending_tasks']}",
                "# HELP paperless_tasks_failed Failed tasks",
                "# TYPE paperless_tasks_failed gauge",
                f"paperless_tasks_failed {stats['failed_tasks']}",
            ]

            for entry in stats.get("file_types", []):
                mime = entry.get("mime_type", "unknown")
                count = entry.get("mime_type_count", 0)
                lines.append(f'paperless_documents_by_type{{mime_type="{mime}"}} {count}')

            output = "\n".join(lines) + "\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            self.end_headers()
            self.wfile.write(output.encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"# error: {e}\n".encode())

    def log_message(self, format, *args):
        pass  # Suppress logging


if __name__ == "__main__":
    print(f"Starting Paperless stats proxy on port {PORT}")
    print(f"Proxying to {PAPERLESS_URL}")
    print(f"Cache TTL: {CACHE_TTL}s")
    server = HTTPServer(("0.0.0.0", PORT), StatsHandler)
    server.serve_forever()
