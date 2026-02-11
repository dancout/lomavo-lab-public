# LibreHardwareMonitor Setup

LibreHardwareMonitor exposes hardware sensors (CPU/GPU temperature, fan speeds, voltages) via WMI, enabling the PowerShell metrics endpoint to report temperature data.

## Quick Install (Run in PowerShell as Administrator)

```powershell
# Download and extract
Invoke-WebRequest -Uri "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.5/LibreHardwareMonitor.zip" -OutFile "$env:TEMP\LibreHardwareMonitor.zip"
Expand-Archive -Path "$env:TEMP\LibreHardwareMonitor.zip" -DestinationPath "C:\Program Files\LibreHardwareMonitor" -Force
Remove-Item "$env:TEMP\LibreHardwareMonitor.zip"

# Launch it (first run creates WMI namespace)
Start-Process "C:\Program Files\LibreHardwareMonitor\LibreHardwareMonitor.exe" -Verb RunAs
```

After launching, in the app window: **Options → Remote Web Server → Run** (this enables the HTTP API on port 8085 that the metrics script uses).

## Manual Installation

1. **Download** `LibreHardwareMonitor.zip` from:
   https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.5/LibreHardwareMonitor.zip

2. **Extract** to `C:\Program Files\LibreHardwareMonitor\`

3. **Initial Run** (required to create WMI namespace):
   - Right-click `LibreHardwareMonitor.exe` → Run as administrator
   - In the app: Options → Remote Web Server → Run (enables WMI)
   - Verify sensors are detected in the main window

## Verify HTTP API

Open PowerShell and run:
```powershell
(Invoke-WebRequest -Uri "http://localhost:8085/data.json" -UseBasicParsing).Content.Substring(0,500)
```

Should return JSON data containing sensor information. If you get an error, ensure:
1. LibreHardwareMonitor is running
2. **Options → Remote Web Server → Run** is checked in the app

To verify the full metrics endpoint integration:
```powershell
curl http://localhost:61209
```

Should include a `temperatures` object with values like:
```json
"temperatures": {
  "CPU_Package": 45.0,
  "GPU_Core": 38.0
}
```

## Auto-Start Configuration

For temperature monitoring to work after reboot, LibreHardwareMonitor must run at startup.

### Option A: Task Scheduler (Recommended)

1. Open Task Scheduler (`taskschd.msc`)
2. Create Task (not Basic Task):
   - **General tab**:
     - Name: `LibreHardwareMonitor`
     - Run whether user is logged on or not
     - Run with highest privileges
   - **Triggers tab**:
     - New → At startup
   - **Actions tab**:
     - New → Start a program
     - Program: `C:\Program Files\LibreHardwareMonitor\LibreHardwareMonitor.exe`
   - **Settings tab**:
     - Allow task to be run on demand
     - Do not start a new instance if already running
     - Set "Stop the task if it runs longer than" to **disabled** (or via PowerShell: `ExecutionTimeLimit = "PT0S"`). The default 72-hour limit will silently kill long-running tasks. See [RB-001](../runbooks/RB-001-metrics-endpoint-72h-limit.md).

### Option B: Startup Folder (Simpler, Requires Login)

1. Press `Win+R`, type `shell:startup`
2. Create shortcut to `LibreHardwareMonitor.exe`
3. Right-click shortcut → Properties → Advanced → Run as administrator

**Note**: Option B only works with auto-login enabled (see ADR-015).

## Troubleshooting

### HTTP API not responding (connection refused on port 8085)
- LibreHardwareMonitor must be running
- Check **Options → Remote Web Server → Run** is enabled in the app
- The web server binds to port 8085 by default

### Missing sensors
- Some hardware may not be supported
- Check main window for detected hardware
- GPU sensors require compatible driver

### High CPU usage
- Normal on first run while initializing sensors
- If persistent, reduce polling interval in Options

## Integration

Once LibreHardwareMonitor is running with the web server enabled, the metrics endpoint (`gaming-pc/scripts/metrics-endpoint.ps1`) automatically queries the HTTP API at `http://localhost:8085/data.json` and includes temperatures in its JSON response.

Test the full integration:
```powershell
curl http://localhost:61209
```

Expected response includes:
```json
{
  "temperatures": {
    "CPU_Package": 45.0,
    "GPU_Core": 38.0
  }
}
```
