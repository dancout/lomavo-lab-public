# ADR-016: System Monitoring Strategy

## Status

Accepted

## Context

The homelab has grown to include multiple machines (Gaming PC, QNAP NAS, Raspberry Pi), each with different operating systems and monitoring capabilities. We needed a consistent approach to monitor:

- CPU, RAM, and disk utilization (already working)
- Temperature sensors (CPU, GPU)
- Network throughput
- Container health

Each platform has different constraints:
- **Windows (Gaming PC)**: WSL2 prevents Glances from seeing host metrics; native tools needed
- **QNAP NAS**: Runs Container Station (Docker), Glances works but sensor access requires volume mounts
- **Raspberry Pi**: ARM-based, Docker available, Glances works well

## Decision

Adopt a **hybrid monitoring approach** tailored to each platform:

### Glances as Primary Tool (NAS + Pi)

Deploy Glances containers on Linux-based systems with appropriate volume mounts for sensor access:
- `/sys:/sys:ro` - Hardware sensors (temperature)
- `/proc:/proc:ro` - Process and system info
- `/var/run/docker.sock:/var/run/docker.sock:ro` - Container metrics

Glances provides a REST API (v4) at port 61208 with endpoints:
- `/api/4/all` - Full system snapshot
- `/api/4/sensors` - Temperature sensors
- `/api/4/network` - Network interface stats
- `/api/4/fs` - Filesystem usage

### Custom PowerShell Endpoint (Gaming PC)

Continue using the PowerShell HTTP listener (ADR-012) on port 61209, extended to include:
- Network throughput via `Win32_PerfFormattedData_Tcpip_NetworkInterface`
- Temperature via LibreHardwareMonitor HTTP API (`http://localhost:8085/data.json`)

LibreHardwareMonitor must run with "Options → Remote Web Server → Run" enabled to expose the HTTP API. WMI was initially attempted but proved unreliable; the HTTP API works consistently. See `gaming-pc/docs/librehardwaremonitor-setup.md` for installation.

### Homepage Dashboard Integration

All metrics feed into Homepage via:
- **Glances widget**: Native integration for Linux systems (limited to built-in metrics)
- **CustomAPI widget**: For PowerShell endpoint and specific Glances API endpoints

**Important limitation**: Homepage CustomAPI widgets display a maximum of 4 fields per widget. To show all desired metrics (CPU, RAM, disk, temperature, network), multiple widgets per machine are required.

## Consequences

### Benefits

- Consistent monitoring visibility across all machines in one dashboard
- Temperature and network metrics now available (previously missing)
- Glances provides a rich API for future expansion
- No additional monitoring infrastructure (Prometheus/Grafana) needed yet

### Trade-offs

- Gaming PC requires LibreHardwareMonitor to be installed and running
- Two different monitoring approaches (Glances vs PowerShell) to maintain
- QNAP temperature visibility depends on hardware/driver support

### Future Considerations

- If monitoring needs grow, consider migrating to Prometheus + Grafana (see ADR-012)
- Could add alerting via Uptime Kuma or dedicated alerting service
- GPU utilization monitoring could be added to PowerShell endpoint

## Related Decisions

- ADR-012: Windows Host Metrics Collection Strategy (foundation for this)
- ADR-014: NAS Storage Widget Metrics (Glances API usage pattern)
