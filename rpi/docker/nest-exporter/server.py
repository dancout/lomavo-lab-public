#!/usr/bin/env python3
"""Prometheus exporter for Google Nest thermostat via the Smart Device Management API."""

import json
import os
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", "9102"))
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "60"))

# Google OAuth2 / SDM API credentials
SDM_PROJECT_ID = os.environ.get("SDM_PROJECT_ID", "")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REFRESH_TOKEN = os.environ.get("GOOGLE_REFRESH_TOKEN", "")

SDM_API_BASE = "https://smartdevicemanagement.googleapis.com/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"

# Cached state
_access_token = None
_token_expiry = 0
_cached_data = {}
_last_poll = 0


def refresh_access_token():
    """Exchange refresh token for a new access token."""
    global _access_token, _token_expiry
    data = urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": GOOGLE_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(TOKEN_URL, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        token_data = json.load(resp)
    _access_token = token_data["access_token"]
    _token_expiry = time.time() + token_data.get("expires_in", 3600) - 60


def get_access_token():
    """Return a valid access token, refreshing if needed."""
    if _access_token is None or time.time() >= _token_expiry:
        refresh_access_token()
    return _access_token


def fetch_devices():
    """Fetch all devices from the SDM API."""
    token = get_access_token()
    url = f"{SDM_API_BASE}/enterprises/{SDM_PROJECT_ID}/devices"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)


def parse_thermostat(device):
    """Extract metrics from a thermostat device response."""
    traits = device.get("traits", {})
    name = device.get("name", "unknown")
    # Use the last segment of the device name as a short label
    device_id = name.split("/")[-1] if "/" in name else name

    data = {"device_id": device_id}

    # Temperature (SDM API returns Celsius)
    temp_trait = traits.get("sdm.devices.traits.Temperature", {})
    if "ambientTemperatureCelsius" in temp_trait:
        c = temp_trait["ambientTemperatureCelsius"]
        data["ambient_temp_c"] = c
        data["ambient_temp_f"] = round(c * 9 / 5 + 32, 1)

    # Humidity
    humidity_trait = traits.get("sdm.devices.traits.Humidity", {})
    if "ambientHumidityPercent" in humidity_trait:
        data["humidity"] = humidity_trait["ambientHumidityPercent"]

    # Thermostat mode
    mode_trait = traits.get("sdm.devices.traits.ThermostatMode", {})
    mode_str = mode_trait.get("mode", "OFF")
    mode_map = {"OFF": 0, "HEAT": 1, "COOL": 2, "HEATCOOL": 3}
    data["mode"] = mode_map.get(mode_str, 0)
    data["mode_str"] = mode_str

    # Eco mode
    eco_trait = traits.get("sdm.devices.traits.ThermostatEco", {})
    eco_str = eco_trait.get("mode", "OFF")
    data["eco_mode"] = 1 if eco_str == "MANUAL_ECO" else 0
    data["eco_str"] = eco_str

    # Eco temperature setpoints (targets when eco mode is active)
    if "heatCelsius" in eco_trait:
        c = eco_trait["heatCelsius"]
        data["eco_heat_c"] = c
        data["eco_heat_f"] = round(c * 9 / 5 + 32, 1)
    if "coolCelsius" in eco_trait:
        c = eco_trait["coolCelsius"]
        data["eco_cool_c"] = c
        data["eco_cool_f"] = round(c * 9 / 5 + 32, 1)

    # Temperature setpoints
    setpoint_trait = traits.get("sdm.devices.traits.ThermostatTemperatureSetpoint", {})
    if "heatCelsius" in setpoint_trait:
        c = setpoint_trait["heatCelsius"]
        data["target_heat_c"] = c
        data["target_heat_f"] = round(c * 9 / 5 + 32, 1)
    if "coolCelsius" in setpoint_trait:
        c = setpoint_trait["coolCelsius"]
        data["target_cool_c"] = c
        data["target_cool_f"] = round(c * 9 / 5 + 32, 1)

    # HVAC status (actual heating/cooling activity)
    hvac_trait = traits.get("sdm.devices.traits.ThermostatHvac", {})
    hvac_str = hvac_trait.get("status", "OFF")
    hvac_map = {"OFF": 0, "HEATING": 1, "COOLING": 2}
    data["hvac_status"] = hvac_map.get(hvac_str, 0)
    data["hvac_str"] = hvac_str

    # Fan status
    fan_trait = traits.get("sdm.devices.traits.Fan", {})
    fan_str = fan_trait.get("timerMode", "OFF")
    data["fan_active"] = 1 if fan_str == "ON" else 0
    if "timerTimeout" in fan_trait:
        # Convert RFC 3339 timestamp to Unix epoch for Prometheus
        ts_str = fan_trait["timerTimeout"]
        try:
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            data["fan_timer_end_seconds"] = dt.timestamp()
        except (ValueError, AttributeError):
            pass

    # Connectivity
    conn_trait = traits.get("sdm.devices.traits.Connectivity", {})
    conn_str = conn_trait.get("status", "OFFLINE")
    data["connectivity"] = 1 if conn_str == "ONLINE" else 0

    return data


def poll_thermostat():
    """Poll the SDM API and cache the result."""
    global _cached_data, _last_poll
    now = time.time()
    if _cached_data and (now - _last_poll) < POLL_INTERVAL:
        return _cached_data

    devices_resp = fetch_devices()
    devices = devices_resp.get("devices", [])

    # Find the first thermostat
    for device in devices:
        device_type = device.get("type", "")
        if "THERMOSTAT" in device_type:
            _cached_data = parse_thermostat(device)
            _last_poll = now
            return _cached_data

    return {}


def build_metrics(data):
    """Build Prometheus metrics text from thermostat data."""
    if not data:
        return "# No thermostat data available\n"

    lines = []

    if "ambient_temp_c" in data:
        lines.append("# HELP nest_ambient_temperature_celsius Current room temperature in Celsius")
        lines.append("# TYPE nest_ambient_temperature_celsius gauge")
        lines.append(f"nest_ambient_temperature_celsius {data['ambient_temp_c']}")

    if "ambient_temp_f" in data:
        lines.append("# HELP nest_ambient_temperature_fahrenheit Current room temperature in Fahrenheit")
        lines.append("# TYPE nest_ambient_temperature_fahrenheit gauge")
        lines.append(f"nest_ambient_temperature_fahrenheit {data['ambient_temp_f']}")

    if "target_heat_c" in data:
        lines.append("# HELP nest_target_temperature_heat_celsius Heat setpoint in Celsius")
        lines.append("# TYPE nest_target_temperature_heat_celsius gauge")
        lines.append(f"nest_target_temperature_heat_celsius {data['target_heat_c']}")

    if "target_heat_f" in data:
        lines.append("# HELP nest_target_temperature_heat_fahrenheit Heat setpoint in Fahrenheit")
        lines.append("# TYPE nest_target_temperature_heat_fahrenheit gauge")
        lines.append(f"nest_target_temperature_heat_fahrenheit {data['target_heat_f']}")

    if "target_cool_c" in data:
        lines.append("# HELP nest_target_temperature_cool_celsius Cool setpoint in Celsius")
        lines.append("# TYPE nest_target_temperature_cool_celsius gauge")
        lines.append(f"nest_target_temperature_cool_celsius {data['target_cool_c']}")

    if "target_cool_f" in data:
        lines.append("# HELP nest_target_temperature_cool_fahrenheit Cool setpoint in Fahrenheit")
        lines.append("# TYPE nest_target_temperature_cool_fahrenheit gauge")
        lines.append(f"nest_target_temperature_cool_fahrenheit {data['target_cool_f']}")

    if "humidity" in data:
        lines.append("# HELP nest_humidity_percent Current room humidity percentage")
        lines.append("# TYPE nest_humidity_percent gauge")
        lines.append(f"nest_humidity_percent {data['humidity']}")

    if "hvac_status" in data:
        lines.append("# HELP nest_hvac_status HVAC status: 0=OFF, 1=HEATING, 2=COOLING")
        lines.append("# TYPE nest_hvac_status gauge")
        lines.append(f"nest_hvac_status {data['hvac_status']}")

    if "mode" in data:
        lines.append("# HELP nest_thermostat_mode Thermostat mode: 0=OFF, 1=HEAT, 2=COOL, 3=HEATCOOL")
        lines.append("# TYPE nest_thermostat_mode gauge")
        lines.append(f"nest_thermostat_mode {data['mode']}")

    if "eco_mode" in data:
        lines.append("# HELP nest_eco_mode Eco mode: 0=OFF, 1=MANUAL_ECO")
        lines.append("# TYPE nest_eco_mode gauge")
        lines.append(f"nest_eco_mode {data['eco_mode']}")

    if "eco_heat_c" in data:
        lines.append("# HELP nest_eco_temperature_heat_celsius Eco heat setpoint in Celsius")
        lines.append("# TYPE nest_eco_temperature_heat_celsius gauge")
        lines.append(f"nest_eco_temperature_heat_celsius {data['eco_heat_c']}")

    if "eco_heat_f" in data:
        lines.append("# HELP nest_eco_temperature_heat_fahrenheit Eco heat setpoint in Fahrenheit")
        lines.append("# TYPE nest_eco_temperature_heat_fahrenheit gauge")
        lines.append(f"nest_eco_temperature_heat_fahrenheit {data['eco_heat_f']}")

    if "eco_cool_c" in data:
        lines.append("# HELP nest_eco_temperature_cool_celsius Eco cool setpoint in Celsius")
        lines.append("# TYPE nest_eco_temperature_cool_celsius gauge")
        lines.append(f"nest_eco_temperature_cool_celsius {data['eco_cool_c']}")

    if "eco_cool_f" in data:
        lines.append("# HELP nest_eco_temperature_cool_fahrenheit Eco cool setpoint in Fahrenheit")
        lines.append("# TYPE nest_eco_temperature_cool_fahrenheit gauge")
        lines.append(f"nest_eco_temperature_cool_fahrenheit {data['eco_cool_f']}")

    if "fan_active" in data:
        lines.append("# HELP nest_fan_active Fan timer: 0=OFF, 1=ON")
        lines.append("# TYPE nest_fan_active gauge")
        lines.append(f"nest_fan_active {data['fan_active']}")

    if "fan_timer_end_seconds" in data:
        lines.append("# HELP nest_fan_timer_end_seconds Unix timestamp when fan timer expires")
        lines.append("# TYPE nest_fan_timer_end_seconds gauge")
        lines.append(f"nest_fan_timer_end_seconds {data['fan_timer_end_seconds']}")

    if "connectivity" in data:
        lines.append("# HELP nest_connectivity Device connectivity: 0=OFFLINE, 1=ONLINE")
        lines.append("# TYPE nest_connectivity gauge")
        lines.append(f"nest_connectivity {data['connectivity']}")

    return "\n".join(lines) + "\n"


def build_json_summary(data):
    """Build a JSON summary for Homepage widget consumption (Fahrenheit values)."""
    if not data:
        return json.dumps({"error": "no data"})

    summary = {}
    if "ambient_temp_f" in data:
        summary["temperature_f"] = data["ambient_temp_f"]
    if "ambient_temp_c" in data:
        summary["temperature_c"] = data["ambient_temp_c"]
    if "target_heat_f" in data:
        summary["target_heat_f"] = data["target_heat_f"]
    if "target_cool_f" in data:
        summary["target_cool_f"] = data["target_cool_f"]
    if "humidity" in data:
        summary["humidity"] = data["humidity"]
    if "hvac_str" in data:
        summary["hvac_status"] = data["hvac_str"]
    if "mode_str" in data:
        summary["mode"] = data["mode_str"]
    if "eco_str" in data:
        summary["eco_mode"] = data["eco_str"]
    if "eco_heat_f" in data:
        summary["eco_heat_f"] = data["eco_heat_f"]
    if "eco_cool_f" in data:
        summary["eco_cool_f"] = data["eco_cool_f"]
    if "fan_active" in data:
        summary["fan_active"] = bool(data["fan_active"])
    if "connectivity" in data:
        summary["online"] = bool(data["connectivity"])

    return json.dumps(summary, indent=2)


class NestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            try:
                data = poll_thermostat()
                output = build_metrics(data)
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
                self.end_headers()
                self.wfile.write(output.encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(f"# error: {e}\n".encode())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = "ok" if _cached_data.get("connectivity") else "no_data"
            self.wfile.write(json.dumps({"status": status}).encode())
        elif self.path == "/":
            try:
                data = poll_thermostat()
                output = build_json_summary(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(output.encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    missing = []
    if not SDM_PROJECT_ID:
        missing.append("SDM_PROJECT_ID")
    if not GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not GOOGLE_REFRESH_TOKEN:
        missing.append("GOOGLE_REFRESH_TOKEN")
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your Google/Nest credentials.")
        exit(1)

    print(f"Starting nest-exporter on port {PORT}")
    print(f"SDM Project: {SDM_PROJECT_ID}")
    print(f"Poll interval: {POLL_INTERVAL}s")
    server = HTTPServer(("0.0.0.0", PORT), NestHandler)
    server.serve_forever()
