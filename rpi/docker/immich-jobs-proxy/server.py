#!/usr/bin/env python3
"""Simple proxy that aggregates Immich job queue counts."""

import json
import os
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

IMMICH_URL = os.environ.get("IMMICH_URL", "http://localhost:2283")
IMMICH_API_KEY = os.environ.get("IMMICH_API_KEY", "")
IMMICH_STATS_API_KEY = os.environ.get("IMMICH_STATS_API_KEY", "")
PORT = int(os.environ.get("PORT", "8080"))


class JobsHandler(BaseHTTPRequestHandler):
    def _fetch_jobs(self):
        """Fetch job data from Immich API."""
        req = urllib.request.Request(
            f"{IMMICH_URL}/api/jobs",
            headers={"x-api-key": IMMICH_API_KEY, "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.load(resp)

    def _fetch_server_stats(self):
        """Fetch server statistics from Immich API."""
        key = IMMICH_STATS_API_KEY or IMMICH_API_KEY
        req = urllib.request.Request(
            f"{IMMICH_URL}/api/server/statistics",
            headers={"x-api-key": key, "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.load(resp)
        except Exception:
            return None

    def do_GET(self):
        if self.path == "/":
            self._handle_json()
        elif self.path == "/metrics":
            self._handle_metrics()
        else:
            self.send_error(404)

    def _handle_json(self):
        """JSON endpoint for Homepage widget (aggregated totals)."""
        try:
            data = self._fetch_jobs()

            total_active = 0
            total_waiting = 0
            total_failed = 0
            job_types = 0

            for job_type, info in data.items():
                counts = info.get("jobCounts", {})
                total_active += counts.get("active", 0)
                total_waiting += counts.get("waiting", 0)
                total_failed += counts.get("failed", 0)
                job_types += 1

            result = {
                "active": total_active,
                "waiting": total_waiting,
                "failed": total_failed,
                "queues": job_types,
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
        """Prometheus metrics endpoint with per-queue breakdowns."""
        try:
            data = self._fetch_jobs()

            lines = []
            lines.append("# HELP immich_jobs_active Number of active jobs")
            lines.append("# TYPE immich_jobs_active gauge")
            lines.append("# HELP immich_jobs_waiting Number of waiting jobs")
            lines.append("# TYPE immich_jobs_waiting gauge")
            lines.append("# HELP immich_jobs_failed Number of failed jobs")
            lines.append("# TYPE immich_jobs_failed gauge")
            lines.append("# HELP immich_jobs_delayed Number of delayed jobs")
            lines.append("# TYPE immich_jobs_delayed gauge")
            lines.append("# HELP immich_jobs_paused Whether the queue is paused")
            lines.append("# TYPE immich_jobs_paused gauge")

            total_active = 0
            total_waiting = 0
            total_failed = 0

            for queue, info in data.items():
                counts = info.get("jobCounts", {})
                active = counts.get("active", 0)
                waiting = counts.get("waiting", 0)
                failed = counts.get("failed", 0)
                delayed = counts.get("delayed", 0)
                paused = 1 if counts.get("paused", 0) else 0

                lines.append(f'immich_jobs_active{{queue="{queue}"}} {active}')
                lines.append(f'immich_jobs_waiting{{queue="{queue}"}} {waiting}')
                lines.append(f'immich_jobs_failed{{queue="{queue}"}} {failed}')
                lines.append(f'immich_jobs_delayed{{queue="{queue}"}} {delayed}')
                lines.append(f'immich_jobs_paused{{queue="{queue}"}} {paused}')

                total_active += active
                total_waiting += waiting
                total_failed += failed

            lines.append("# HELP immich_jobs_active_total Total active jobs across all queues")
            lines.append("# TYPE immich_jobs_active_total gauge")
            lines.append(f"immich_jobs_active_total {total_active}")
            lines.append("# HELP immich_jobs_waiting_total Total waiting jobs across all queues")
            lines.append("# TYPE immich_jobs_waiting_total gauge")
            lines.append(f"immich_jobs_waiting_total {total_waiting}")
            lines.append("# HELP immich_jobs_failed_total Total failed jobs across all queues")
            lines.append("# TYPE immich_jobs_failed_total gauge")
            lines.append(f"immich_jobs_failed_total {total_failed}")

            # Server statistics (photos, videos, storage)
            stats = self._fetch_server_stats()
            if stats:
                photos = 0
                videos = 0
                usage_bytes = 0
                for user_stat in stats.get("usageByUser", []):
                    photos += user_stat.get("photos", 0)
                    videos += user_stat.get("videos", 0)
                    usage_bytes += user_stat.get("usage", 0)

                lines.append("# HELP immich_photos_total Total number of photos")
                lines.append("# TYPE immich_photos_total gauge")
                lines.append(f"immich_photos_total {photos}")
                lines.append("# HELP immich_videos_total Total number of videos")
                lines.append("# TYPE immich_videos_total gauge")
                lines.append(f"immich_videos_total {videos}")
                lines.append("# HELP immich_storage_bytes Total storage used in bytes")
                lines.append("# TYPE immich_storage_bytes gauge")
                lines.append(f"immich_storage_bytes {usage_bytes}")

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
    print(f"Starting Immich jobs proxy on port {PORT}")
    print(f"Proxying to {IMMICH_URL}")
    server = HTTPServer(("0.0.0.0", PORT), JobsHandler)
    server.serve_forever()
