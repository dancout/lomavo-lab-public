# Windows Host Metrics Endpoint
# Exposes basic system metrics on port 61209
# See ADR-012 for context
#
# Usage: Run as Administrator, or via Task Scheduler at startup
# Endpoints:
#   /       - JSON format (for Homepage widgets)
#   /metrics - Prometheus text format (for Prometheus scraping)
#
# Features:
# - Auto-restart on crash (30 second delay)
# - Logs restarts with timestamp
# - Network stats for Ethernet, Tailscale, and WSL adapters (calculated per-second rates)

$port = 61209
$restartDelay = 30  # seconds to wait before restarting after crash

# Network adapters to track (friendly names from Get-NetAdapter)
# Uses .NET NetworkInterface API since Tailscale doesn't appear in WMI performance counters
$networkAdaptersToTrack = @(
    @{ Name = "Ethernet 2"; Key = "Ethernet" },
    @{ Name = "Tailscale"; Key = "Tailscale" },
    @{ Name = "vEthernet (WSL)"; Key = "WSL" }
)

# Previous network stats for calculating bytes/sec (stores cumulative bytes and timestamp)
$script:previousNetworkStats = @{}

# Check if running as admin (required for HttpListener on +)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$prefix = if ($isAdmin) { "http://+:$port/" } else {
    Write-Host "Warning: Not running as Administrator. Binding to localhost only."
    "http://localhost:$port/"
}

# Outer restart loop - keeps the service running after crashes
while ($true) {
    $listener = $null
    try {
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add($prefix)
        $listener.Start()

        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Metrics endpoint started on port $port"

        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            try {
                # Get CPU usage (average across all cores)
                $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average

                # Get memory stats
                $mem = Get-CimInstance Win32_OperatingSystem
                $memUsedGB = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / 1MB, 2)
                $memTotalGB = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
                $memPercent = [math]::Round(($memUsedGB / $memTotalGB) * 100, 1)
                $memUsedBytes = ($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) * 1KB
                $memTotalBytes = $mem.TotalVisibleMemorySize * 1KB

                # Get disk stats for C: and D: drives
                # Note: Using "C" and "D" as keys (not "C:" and "D:") for Homepage widget compatibility
                $disks = @{}
                foreach ($drive in @("C:", "D:")) {
                    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'" -ErrorAction SilentlyContinue
                    if ($disk) {
                        $usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
                        $totalGB = [math]::Round($disk.Size / 1GB, 2)
                        $percent = [math]::Round(($usedGB / $totalGB) * 100, 1)
                        $key = $drive.TrimEnd(':')  # "C:" -> "C"
                        $disks[$key] = @{
                            usedGB = $usedGB
                            totalGB = $totalGB
                            percent = $percent
                            sizeBytes = $disk.Size
                            freeBytes = $disk.FreeSpace
                        }
                    }
                }

                # Get network adapter stats (bytes per second)
                # Uses .NET NetworkInterface API to access Tailscale and other virtual adapters
                # that don't appear in WMI performance counters
                $network = @{}
                $currentTime = Get-Date
                $allInterfaces = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()

                foreach ($adapterConfig in $networkAdaptersToTrack) {
                    $interface = $allInterfaces | Where-Object { $_.Name -eq $adapterConfig.Name }
                    if ($interface -and $interface.OperationalStatus -eq 'Up') {
                        $stats = $interface.GetIPv4Statistics()
                        $key = $adapterConfig.Key

                        # Get current cumulative bytes
                        $currentReceived = $stats.BytesReceived
                        $currentSent = $stats.BytesSent

                        # Calculate bytes/sec if we have previous data
                        $bytesRecvPerSec = 0
                        $bytesSentPerSec = 0

                        if ($script:previousNetworkStats.ContainsKey($key)) {
                            $prev = $script:previousNetworkStats[$key]
                            $timeDelta = ($currentTime - $prev.Timestamp).TotalSeconds

                            if ($timeDelta -gt 0) {
                                $bytesRecvPerSec = [math]::Max(0, [math]::Round(($currentReceived - $prev.BytesReceived) / $timeDelta, 0))
                                $bytesSentPerSec = [math]::Max(0, [math]::Round(($currentSent - $prev.BytesSent) / $timeDelta, 0))
                            }
                        }

                        # Store current values for next calculation
                        $script:previousNetworkStats[$key] = @{
                            BytesReceived = $currentReceived
                            BytesSent = $currentSent
                            Timestamp = $currentTime
                        }

                        $network[$key] = @{
                            bytesRecvPerSec = $bytesRecvPerSec
                            bytesSentPerSec = $bytesSentPerSec
                            bytesRecvTotal = $currentReceived
                            bytesSentTotal = $currentSent
                        }
                    }
                }

                # Get temperature from LibreHardwareMonitor HTTP API (port 8085)
                # Requires LibreHardwareMonitor running with Options > Remote Web Server > Run enabled
                # See gaming-pc/docs/librehardwaremonitor-setup.md
                $temperatures = @{}
                try {
                    $lhmResponse = Invoke-WebRequest -Uri "http://localhost:8085/data.json" -UseBasicParsing -TimeoutSec 2
                    $lhmData = $lhmResponse.Content | ConvertFrom-Json

                    # Recursive function to find temperature sensors in the tree
                    function Find-Temperatures($node) {
                        if ($node.Type -eq "Temperature") {
                            # Parse value like "71.0 °C" to get just the number
                            $value = $node.Value -replace '[^0-9.]', ''
                            if ($value) {
                                $name = $node.Text -replace '[^a-zA-Z0-9]', '_'
                                $script:temperatures[$name] = [double]$value
                            }
                        }
                        foreach ($child in $node.Children) {
                            Find-Temperatures $child
                        }
                    }

                    Find-Temperatures $lhmData
                } catch {
                    # LibreHardwareMonitor not running or web server not enabled - temperatures will be empty
                }

                # Route: /metrics -> Prometheus text format
                if ($request.Url.AbsolutePath -eq "/metrics") {
                    $lines = @()
                    $lines += "# HELP windows_cpu_usage_percent CPU usage percentage"
                    $lines += "# TYPE windows_cpu_usage_percent gauge"
                    $lines += "windows_cpu_usage_percent $cpu"
                    $lines += "# HELP windows_memory_used_bytes Memory used in bytes"
                    $lines += "# TYPE windows_memory_used_bytes gauge"
                    $lines += "windows_memory_used_bytes $memUsedBytes"
                    $lines += "# HELP windows_memory_total_bytes Total memory in bytes"
                    $lines += "# TYPE windows_memory_total_bytes gauge"
                    $lines += "windows_memory_total_bytes $memTotalBytes"
                    $lines += "# HELP windows_memory_usage_percent Memory usage percentage"
                    $lines += "# TYPE windows_memory_usage_percent gauge"
                    $lines += "windows_memory_usage_percent $memPercent"

                    $lines += "# HELP windows_disk_size_bytes Total disk size in bytes"
                    $lines += "# TYPE windows_disk_size_bytes gauge"
                    $lines += "# HELP windows_disk_free_bytes Free disk space in bytes"
                    $lines += "# TYPE windows_disk_free_bytes gauge"
                    $lines += "# HELP windows_disk_usage_percent Disk usage percentage"
                    $lines += "# TYPE windows_disk_usage_percent gauge"
                    foreach ($key in $disks.Keys) {
                        $d = $disks[$key]
                        $lines += "windows_disk_size_bytes{drive=`"$key`"} $($d.sizeBytes)"
                        $lines += "windows_disk_free_bytes{drive=`"$key`"} $($d.freeBytes)"
                        $lines += "windows_disk_usage_percent{drive=`"$key`"} $($d.percent)"
                    }

                    $lines += "# HELP windows_network_receive_bytes_per_second Network bytes received per second"
                    $lines += "# TYPE windows_network_receive_bytes_per_second gauge"
                    $lines += "# HELP windows_network_transmit_bytes_per_second Network bytes sent per second"
                    $lines += "# TYPE windows_network_transmit_bytes_per_second gauge"
                    $lines += "# HELP windows_network_receive_bytes_total Total network bytes received"
                    $lines += "# TYPE windows_network_receive_bytes_total counter"
                    $lines += "# HELP windows_network_transmit_bytes_total Total network bytes sent"
                    $lines += "# TYPE windows_network_transmit_bytes_total counter"
                    foreach ($key in $network.Keys) {
                        $n = $network[$key]
                        $lines += "windows_network_receive_bytes_per_second{adapter=`"$key`"} $($n.bytesRecvPerSec)"
                        $lines += "windows_network_transmit_bytes_per_second{adapter=`"$key`"} $($n.bytesSentPerSec)"
                        $lines += "windows_network_receive_bytes_total{adapter=`"$key`"} $($n.bytesRecvTotal)"
                        $lines += "windows_network_transmit_bytes_total{adapter=`"$key`"} $($n.bytesSentTotal)"
                    }

                    $lines += "# HELP windows_temperature_celsius Temperature sensor readings"
                    $lines += "# TYPE windows_temperature_celsius gauge"
                    foreach ($key in $temperatures.Keys) {
                        $lines += "windows_temperature_celsius{sensor=`"$key`"} $($temperatures[$key])"
                    }

                    $promText = ($lines -join "`n") + "`n"
                    $buffer = [Text.Encoding]::UTF8.GetBytes($promText)

                    $response.ContentType = "text/plain; version=0.0.4; charset=utf-8"
                    $response.Headers.Add("Access-Control-Allow-Origin", "*")
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                # Route: / -> JSON format (Homepage widgets)
                else {
                    $metrics = @{
                        timestamp = (Get-Date -Format "o")
                        cpu = @{
                            percent = $cpu
                        }
                        memory = @{
                            usedGB = $memUsedGB
                            totalGB = $memTotalGB
                            percent = $memPercent
                        }
                        disks = @{}
                        network = @{}
                        temperatures = $temperatures
                    }
                    foreach ($key in $disks.Keys) {
                        $metrics.disks[$key] = @{
                            usedGB = $disks[$key].usedGB
                            totalGB = $disks[$key].totalGB
                            percent = $disks[$key].percent
                        }
                    }
                    foreach ($key in $network.Keys) {
                        $metrics.network[$key] = @{
                            bytesRecvPerSec = $network[$key].bytesRecvPerSec
                            bytesSentPerSec = $network[$key].bytesSentPerSec
                        }
                    }

                    $json = $metrics | ConvertTo-Json -Depth 3
                    $buffer = [Text.Encoding]::UTF8.GetBytes($json)

                    $response.ContentType = "application/json"
                    $response.Headers.Add("Access-Control-Allow-Origin", "*")
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
            }
            catch {
                $errorJson = @{ error = $_.Exception.Message } | ConvertTo-Json
                $buffer = [Text.Encoding]::UTF8.GetBytes($errorJson)
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            finally {
                $response.Close()
            }
        }
    }
    catch {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Error: $($_.Exception.Message)"
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Restarting in $restartDelay seconds..."
    }
    finally {
        if ($listener -and $listener.IsListening) {
            $listener.Stop()
        }
        if ($listener) {
            $listener.Close()
        }
    }

    # Wait before restarting
    Start-Sleep -Seconds $restartDelay
}
