# RB-001: Metrics Endpoint Killed by Task Scheduler 72-Hour Limit

**Date**: 2026-02-09
**Machine**: Gaming PC
**Service**: metrics-endpoint (port 61209)
**Impact**: RAM, CPU, disk, temperature, and network metrics stopped reporting to Prometheus/Grafana

## Symptoms

- Grafana dashboards show gaps in Gaming PC metrics
- `curl http://<GAMING_PC_IP>:61209/` times out
- Scheduled task shows state "Ready" (not "Running")
- `LastTaskResult: 267014` (hex 0x41306 = terminated by scheduler)

## Root Cause

Windows Task Scheduler has a default `ExecutionTimeLimit` of **72 hours** (`PT72H`). After 72 hours of continuous execution, it terminates the process. The metrics endpoint script runs indefinitely (`while ($true)`), so it will always hit this limit.

Timeline for this incident:
- PC booted **Feb 6 at 12:37 AM** → task started
- 72 hours later (**Feb 9 at ~12:37 AM**) → scheduler killed the process
- No restart/repetition trigger configured → endpoint stayed down

## Diagnosis

```powershell
# Check task state and last result
Get-ScheduledTaskInfo -TaskName "Metrics Endpoint"
# Look for: State=Ready (should be Running), LastTaskResult=267014

# Confirm no PowerShell process is running the script
Get-Process -Name powershell, pwsh

# Check the execution time limit
Get-ScheduledTask -TaskName "Metrics Endpoint" | Select-Object -ExpandProperty Settings | Select ExecutionTimeLimit
# PT72H = problem, PT0S = fixed
```

## Fix

```powershell
# Remove the execution time limit (set to indefinite)
$task = Get-ScheduledTask -TaskName "Metrics Endpoint"
$task.Settings.ExecutionTimeLimit = "PT0S"
Set-ScheduledTask -InputObject $task

# Restart the task
Start-ScheduledTask -TaskName "Metrics Endpoint"

# Verify it's running
curl http://<GAMING_PC_IP>:61209/
```

This fix persists across reboots — it's stored in the scheduled task configuration.

## Prevention

When creating long-running scheduled tasks on Windows, always set `ExecutionTimeLimit` to `PT0S` (indefinite). The default `PT72H` will silently kill any process that's meant to run continuously.
