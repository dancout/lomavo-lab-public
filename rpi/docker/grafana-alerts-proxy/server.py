#!/usr/bin/env python3
"""Proxy that exposes Grafana alert status for Homepage and Prometheus.

Queries Grafana's Prometheus-compatible rules API and reshapes the response
into a flat JSON object (for Homepage customapi) and Prometheus metrics.
"""

import json
import os
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

GRAFANA_URL = os.environ.get("GRAFANA_URL", "http://localhost:3030")
PORT = int(os.environ.get("PORT", "8080"))
CACHE_TTL = int(os.environ.get("CACHE_TTL", "30"))

_cache = {"data": None, "timestamp": 0}


def _fetch_alerts():
    """Fetch alert rule states from Grafana."""
    url = f"{GRAFANA_URL}/api/prometheus/grafana/api/v1/rules"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)


def _get_status():
    """Get alert counts, using cache if fresh."""
    now = time.time()
    if _cache["data"] and (now - _cache["timestamp"]) < CACHE_TTL:
        return _cache["data"]

    data = _fetch_alerts()
    groups = data.get("data", {}).get("groups", [])

    firing = 0
    pending = 0
    normal = 0
    firing_names = []
    per_alert = []

    for group in groups:
        for rule in group.get("rules", []):
            state = rule.get("state", "inactive")
            name = rule.get("name", "unknown")
            labels = rule.get("labels", {})
            severity = labels.get("severity", "unknown")
            if state == "firing":
                firing += 1
                firing_names.append(name)
                per_alert.append((name, severity, 2))
            elif state == "pending":
                pending += 1
                per_alert.append((name, severity, 1))
            else:
                normal += 1
                per_alert.append((name, severity, 0))

    result = {
        "firing": firing,
        "pending": pending,
        "normal": normal,
        "total": firing + pending + normal,
        "alerts": firing_names,
        "per_alert": per_alert,
    }

    _cache["data"] = result
    _cache["timestamp"] = now
    return result


class AlertHandler(BaseHTTPRequestHandler):
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
            status = _get_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_metrics(self):
        """Prometheus metrics endpoint."""
        try:
            status = _get_status()
            lines = [
                "# HELP grafana_alerts_firing Number of currently firing alerts",
                "# TYPE grafana_alerts_firing gauge",
                f"grafana_alerts_firing {status['firing']}",
                "# HELP grafana_alerts_pending Number of pending alerts",
                "# TYPE grafana_alerts_pending gauge",
                f"grafana_alerts_pending {status['pending']}",
                "# HELP grafana_alerts_normal Number of normal/inactive alerts",
                "# TYPE grafana_alerts_normal gauge",
                f"grafana_alerts_normal {status['normal']}",
                "# HELP grafana_alerts_total Total number of alert rules",
                "# TYPE grafana_alerts_total gauge",
                f"grafana_alerts_total {status['total']}",
                "# HELP grafana_alert_state Per-alert state (0=normal, 1=pending, 2=firing)",
                "# TYPE grafana_alert_state gauge",
            ]
            for name, severity, value in status.get("per_alert", []):
                safe_name = name.replace('"', '\\"')
                safe_sev = severity.replace('"', '\\"')
                lines.append(
                    f'grafana_alert_state{{alertname="{safe_name}",severity="{safe_sev}"}} {value}'
                )
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
        pass


if __name__ == "__main__":
    print(f"Starting Grafana alerts proxy on port {PORT}")
    print(f"Querying {GRAFANA_URL}")
    print(f"Cache TTL: {CACHE_TTL}s")
    server = HTTPServer(("0.0.0.0", PORT), AlertHandler)
    server.serve_forever()
