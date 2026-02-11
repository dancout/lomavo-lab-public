#!/usr/bin/env python3
"""Prometheus exporter that scrapes the Glances REST API."""

import json
import os
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

GLANCES_URL = os.environ.get("GLANCES_URL", "http://localhost:61208")
PORT = int(os.environ.get("PORT", "9101"))


def fetch_json(path):
    """Fetch JSON from a Glances API endpoint."""
    req = urllib.request.Request(
        f"{GLANCES_URL}/api/4/{path}",
        headers={"Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)


def sanitize(label):
    """Sanitize a label value for Prometheus (remove quotes, backslashes)."""
    return label.replace("\\", "").replace('"', "")


def build_metrics():
    """Build Prometheus metrics text from Glances API data."""
    lines = []

    # CPU
    try:
        cpu = fetch_json("cpu")
        lines.append("# HELP glances_cpu_percent CPU usage percentage")
        lines.append("# TYPE glances_cpu_percent gauge")
        lines.append(f"glances_cpu_percent {cpu.get('total', 0)}")
    except Exception:
        pass

    # Memory
    try:
        mem = fetch_json("mem")
        lines.append("# HELP glances_memory_used_bytes Memory used in bytes")
        lines.append("# TYPE glances_memory_used_bytes gauge")
        lines.append(f"glances_memory_used_bytes {mem.get('used', 0)}")
        lines.append("# HELP glances_memory_total_bytes Total memory in bytes")
        lines.append("# TYPE glances_memory_total_bytes gauge")
        lines.append(f"glances_memory_total_bytes {mem.get('total', 0)}")
        lines.append("# HELP glances_memory_percent Memory usage percentage")
        lines.append("# TYPE glances_memory_percent gauge")
        lines.append(f"glances_memory_percent {mem.get('percent', 0)}")
    except Exception:
        pass

    # Load
    try:
        load = fetch_json("load")
        lines.append("# HELP glances_load_1 1-minute load average")
        lines.append("# TYPE glances_load_1 gauge")
        lines.append(f"glances_load_1 {load.get('min1', 0)}")
        lines.append("# HELP glances_load_5 5-minute load average")
        lines.append("# TYPE glances_load_5 gauge")
        lines.append(f"glances_load_5 {load.get('min5', 0)}")
        lines.append("# HELP glances_load_15 15-minute load average")
        lines.append("# TYPE glances_load_15 gauge")
        lines.append(f"glances_load_15 {load.get('min15', 0)}")
    except Exception:
        pass

    # Filesystem
    try:
        fs_list = fetch_json("fs")
        lines.append("# HELP glances_fs_used_bytes Filesystem used bytes")
        lines.append("# TYPE glances_fs_used_bytes gauge")
        lines.append("# HELP glances_fs_size_bytes Filesystem total size bytes")
        lines.append("# TYPE glances_fs_size_bytes gauge")
        lines.append("# HELP glances_fs_percent Filesystem usage percentage")
        lines.append("# TYPE glances_fs_percent gauge")
        seen = set()
        for fs in fs_list:
            mp = sanitize(fs.get("mnt_point", "unknown"))
            if mp in seen:
                continue
            seen.add(mp)
            lines.append(f'glances_fs_used_bytes{{mountpoint="{mp}"}} {fs.get("used", 0)}')
            lines.append(f'glances_fs_size_bytes{{mountpoint="{mp}"}} {fs.get("size", 0)}')
            lines.append(f'glances_fs_percent{{mountpoint="{mp}"}} {fs.get("percent", 0)}')
    except Exception:
        pass

    # Network
    try:
        net_list = fetch_json("network")
        lines.append("# HELP glances_network_rx_bytes_per_sec Network bytes received per second")
        lines.append("# TYPE glances_network_rx_bytes_per_sec gauge")
        lines.append("# HELP glances_network_tx_bytes_per_sec Network bytes sent per second")
        lines.append("# TYPE glances_network_tx_bytes_per_sec gauge")
        for iface in net_list:
            name = sanitize(iface.get("interface_name", "unknown"))
            rx = iface.get("bytes_recv_rate_per_sec", 0)
            tx = iface.get("bytes_sent_rate_per_sec", 0)
            lines.append(f'glances_network_rx_bytes_per_sec{{interface="{name}"}} {rx}')
            lines.append(f'glances_network_tx_bytes_per_sec{{interface="{name}"}} {tx}')
    except Exception:
        pass

    # Temperature sensors
    try:
        sensors = fetch_json("sensors")
        lines.append("# HELP glances_temperature_celsius Temperature sensor reading")
        lines.append("# TYPE glances_temperature_celsius gauge")
        for s in sensors:
            if s.get("type") == "temperature_core":
                label = sanitize(s.get("label", "unknown"))
                lines.append(f'glances_temperature_celsius{{label="{label}"}} {s.get("value", 0)}')
    except Exception:
        pass

    return "\n".join(lines) + "\n"


class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            try:
                output = build_metrics()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
                self.end_headers()
                self.wfile.write(output.encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(f"# error: {e}\n".encode())
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    print(f"Starting glances-exporter on port {PORT}")
    print(f"Scraping {GLANCES_URL}")
    server = HTTPServer(("0.0.0.0", PORT), MetricsHandler)
    server.serve_forever()
