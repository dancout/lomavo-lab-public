# ADR-019: Network Stats via .NET NetworkInterface API

**Status**: Accepted

**Date**: 2026-02-01

## Context

The Gaming PC has three network adapters we want to monitor on Homepage:
- **Ethernet 2** - Local network connection (Intel I219-V)
- **Tailscale** - VPN tunnel for remote access
- **vEthernet (WSL)** - Windows Subsystem for Linux network

The existing metrics-endpoint.ps1 used WMI performance counters (`Win32_PerfFormattedData_Tcpip_NetworkInterface`) to get network throughput. However, Tailscale's virtual adapter does not appear in these counters because:
1. It's a WireGuard-based tunnel adapter
2. Windows performance counters only track physical and certain virtual adapters
3. Task Manager uses a different, lower-level API to display all adapters

## Decision

Use the .NET `System.Net.NetworkInformation.NetworkInterface` API instead of WMI performance counters for network statistics.

**Implementation details:**
- Query all interfaces via `[System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()`
- Track specific adapters by friendly name: "Ethernet 2", "Tailscale", "vEthernet (WSL)"
- Store cumulative byte counts between requests to calculate bytes/sec rate
- Use simplified JSON keys: "Ethernet", "Tailscale", "WSL"

**Trade-offs:**
- First request after service restart shows 0 bytes/sec (no previous data for delta)
- Rate accuracy depends on time between requests (Homepage polls every 5 seconds)
- Requires maintaining state between HTTP requests

## Consequences

**Positive:**
- All three network adapters now visible on Homepage
- Network breakdown shows local vs VPN traffic separately
- Uses same API that Task Manager uses, ensuring consistency

**Negative:**
- Slightly more complex code (state tracking for rate calculation)
- First reading after restart is always zero

**Response format change:**
```json
{
  "network": {
    "Ethernet": { "bytesRecvPerSec": 1024, "bytesSentPerSec": 512 },
    "Tailscale": { "bytesRecvPerSec": 256, "bytesSentPerSec": 128 },
    "WSL": { "bytesRecvPerSec": 0, "bytesSentPerSec": 0 }
  }
}
```

## References

- ADR-012: Windows Host Metrics Collection Strategy (original metrics-endpoint design)
- ADR-016: System Monitoring Strategy (monitoring architecture)
