# **Strategic Analysis of Heterogeneous Homelab Architectures: QNAP TS-433 Integration, Distributed Compute, and AI-Enhanced Service Orchestration**

The contemporary homelab has evolved from a simple repository for file backups into a complex, multi-tiered data center environment that requires a nuanced understanding of distributed systems, hardware constraints, and protocol-standardized automation. For a senior software developer transitioning into the homelab space, the integration of an ARM64-based Network Attached Storage (NAS) device, such as the QNAP TS-433, into an existing ecosystem of edge devices (Raspberry Pi) and high-compute nodes (x86-64 Gaming PC) presents a unique set of architectural challenges. This report provides a comprehensive technical evaluation of the hardware landscape, operating system options, and a multi-phase implementation roadmap for a resilient, AI-augmented infrastructure.

## **Hardware Foundations and Architectural Analysis of the QNAP TS-433**

The technical foundation of any storage strategy is defined by the underlying silicon and memory architecture. The QNAP TS-433 represents a shift toward energy-efficient, ARM-based storage solutions. It is powered by the Rockchip RK3568 SoC, a quad-core ARM Cortex-A55 processor clocked at 2.0 GHz.1 This architecture is fundamentally different from the x86-64 instruction sets found in standard servers and the i7-based gaming PC currently in the user's setup.

### **Computational Capacity and SoC Features**

The Cortex-A55 cores are optimized for power efficiency and high-density throughput rather than single-threaded peak performance.2 In addition to the CPU, the RK3568 integrates a Mali-G52 EE GPU and a dedicated Neural Processing Unit (NPU) capable of 0.8 TOPS (Trillions of Operations Per Second).1 This NPU is a critical hardware feature for the user’s long-term plans, as it is specifically designed to accelerate AI-powered image recognition tasks in applications like QuMagie and Immich without taxing the primary CPU cores.3

| Hardware Component | Specification Detail | Operational Implications |
| :---- | :---- | :---- |
| CPU Architecture | 64-bit ARM (Cortex-A55) | High efficiency; limited to ARM64 container images.1 |
| Memory (RAM) | 4 GB LPDDR4 (On-board) | Non-expandable; constrains ZFS cache and heavy virtualization.6 |
| NPU Performance | 0.8 TOPS @ 800MHz | Dedicated for facial/object recognition in storage apps.3 |
| Storage Interface | 4 x 3.5" SATA 6Gb/s | Supports RAID 0, 1, 5, 6, 10\.1 |
| Network Backbone | 1 x 2.5GbE, 1 x 1GbE | Enables high-speed LAN for media streaming and backups.1 |

### **Memory Constraints and System Bottlenecks**

The most significant constraint identified in the TS-433 hardware is the 4 GB on-board memory, which is non-expandable.1 In a professional homelab environment, memory is often the first resource to be exhausted. Modern NAS operating systems that utilize the ZFS file system, such as TrueNAS SCALE, typically recommend a minimum of 8 GB to 16 GB of RAM to maintain the Adaptive Replacement Cache (ARC) effectively.7 Operating with only 4 GB requires a strict prioritization of services and a lean software stack to avoid frequent out-of-memory (OOM) kills or heavy disk swapping, which would degrade the lifespan of the mechanical IronWolf drives.

## **Operating System Paradigms: QTS vs. TrueNAS vs. Unraid on ARM**

A recurring inquiry among homelab enthusiasts is whether to replace the proprietary operating system of a pre-built NAS with a community-driven alternative. For the TS-433, this decision is influenced heavily by the ARM64 architecture and the specific bootloader configuration of the device.

### **QTS 5.2: The Optimized Native Path**

The QNAP TS-433 ships with QTS 5.2, a Linux-based operating system utilizing the EXT4 file system for standard volumes.1 QTS provides the most stable driver support for the Rockchip SoC, specifically ensuring that the 2.5GbE controller, the hardware transcoding engine, and the NPU are fully utilized.3

Through Container Station, QTS supports both Docker and LXC (Linux Containers), which is a rare feature in the consumer NAS market.10 This dual-virtualization support allows for a high degree of flexibility; for example, a full Linux environment can be run in an LXC container for development, while services like Pi-hole are deployed via standard Docker containers.10

### **TrueNAS SCALE: The Experimental Frontier for ARM**

TrueNAS SCALE is the Debian-based iteration of the TrueNAS ecosystem, focused on ZFS and containerization.9 While it is a powerhouse on x86-64 hardware, its status on ARM is currently classified as "unofficial" and "experimental".7 Community efforts to port TrueNAS SCALE to ARM64 have been successful in creating bootable images, but significant challenges remain:

* **Bootloader Compatibility**: The TS-433 uses U-Boot, while the current unofficial ARM builds of TrueNAS SCALE typically require a working UEFI implementation.7 Transitioning the TS-433 to UEFI is a non-trivial task that involves flashing custom binaries and potentially using a serial console for troubleshooting.14  
* **Resource Overhead**: TrueNAS SCALE is significantly "heavier" than QTS. The 4 GB RAM on the TS-433 would be largely consumed by the base OS and the ZFS ARC, leaving very little headroom for the user’s planned containerized services like Home Assistant or a secondary Pi-hole.7

### **Unraid: The Architecture Gap**

Unraid is celebrated for its ability to utilize disparate drive sizes and its lightweight, USB-bootable nature.12 However, Unraid is a proprietary, licensed product that has historically focused exclusively on the x86-64 architecture.18 As of 2025 and looking into 2026, while Unraid has introduced significant features like native ZFS support in version 7.0, there is no official or stable ARM64 release available for generic NAS hardware like the TS-433.19 Attempting to run Unraid on this device is currently impossible without a significant shift in the developer's licensing and target architecture.

### **Selection Matrix for NAS Operating Systems**

| Feature | QTS 5.2 (Native) | TrueNAS SCALE (ARM) | Unraid (ARM) |
| :---- | :---- | :---- | :---- |
| Stability | Production-Grade 8 | Experimental/Alpha 7 | Non-Existent 19 |
| File System | EXT4 (Standard) 1 | ZFS (High Integrity) 9 | XFS/ZFS (Standard) 19 |
| NPU Support | Native Integration 3 | Driver Manual Config 13 | N/A |
| RAM Overhead | Low to Medium | High (ZFS Minimum) 7 | Low |
| Boot Medium | Internal eMMC 1 | USB/SSD (requires UEFI) 7 | USB Flash Drive 17 |

## **Network Infrastructure Evolution: The 2.5GbE Backbone**

The addition of the TrendNet 5-port 2.5G unmanaged switch serves as the nexus for the user's high-speed internal network. Transitioning from a WiFi-dependent setup to a hard-linked 2.5GbE backbone is essential for the distributed media processing strategy.

### **Eliminating Latency in Data Transfer**

The gaming PC, currently limited by a USB WiFi adapter, suffers from inconsistent throughput and jitter, which are detrimental to high-bitrate 4K streaming and high-frequency LLM inference requests.3 By connecting the 2.5GbE port of the TS-433, the 2.5GbE port of the gaming PC (assuming an i7-tier motherboard includes one, or via a PCIe card), and the Raspberry Pi (limited to 1GbE) to the new switch, the internal network achieves a 2.5x increase in theoretical bandwidth.3

This increased bandwidth is critical for mounting the NAS storage to the gaming PC. When utilizing the gaming PC for transcoding media stored on the NAS, the data must travel from the NAS to the PC’s RAM/GPU and then (potentially) back out to a client. A 2.5GbE link supports approximately 312.5 MB/s, which comfortably handles multiple 4K remux streams simultaneously without saturating the interface.1

### **External Access and Security via Tailscale and Cloudflare**

The user's current use of Tailscale and Cloudflare Tunnels represents a sophisticated "Zero Trust" approach to remote access.

* **Tailscale for Site-to-Site Connectivity**: By installing Tailscale on all three primary nodes, the user creates a "Tailnet" that abstracts away local IP addresses and firewall complexities.19 The Raspberry Pi can be designated as a "Subnet Router," allowing the user to access non-Tailscale devices on the home network from the digital ocean VPS or mobile phone.22  
* **Cloudflare Tunnels for Public Services**: The tunnel for `<STATUS_URL>` is an effective way to expose the Uptime Kuma dashboard without opening ports on the router.19 This approach should be extended to any service intended for public consumption, while strictly internal tools remain behind the Tailscale VPN.

## **Distributed Media Systems: Decoupling Storage and Transcoding**

A cornerstone of modern homelab design is the separation of the "Data Layer" from the "Compute Layer." The user’s plan to store media on the TS-433 while utilizing the gaming PC for heavy processing is an optimal use of resources.

### **Jellyfin Path Mapping and Transcoding Performance**

The QNAP TS-433's ARM processor is capable of basic hardware-accelerated transcoding for some formats, but it lacks the versatility and raw power of the i7 CPU and GTX 1050Ti GPU in the gaming PC.3

* **Network Mounting**: The media folder on the NAS should be shared via SMB (Server Message Block) or NFS (Network File System).25 For Windows-based Jellyfin instances, using symbolic links via the mklink command or PowerShell's New-Item \-ItemType SymbolicLink is highly recommended.27 This ensures that Jellyfin treats the network share as a local directory, which is more reliable for real-time file monitoring.27  
* **GPU Offloading**: The 1050Ti supports NVIDIA NVENC and NVDEC, which are essential for handling 4K to 1080p transcoding or HDR-to-SDR tone-mapping.24 In Jellyfin’s dashboard, hardware acceleration should be set to "NVIDIA NVENC" to offload the entire transcoding pipeline from the i7 CPU.24

### **Immich and NPU vs. GPU Acceleration**

Immich is particularly resource-intensive during the initial ingestion of large photo libraries (e.g., the user's 300GB backup).

* **The NPU Advantage**: The TS-433’s NPU can be used if Immich is run natively on the NAS, but current community support for Rockchip NPU pass-through in Docker is still developing.4  
* **The GPU Advantage**: Running Immich on the gaming PC while pointing the storage to the NAS allows the 1050Ti to handle facial recognition and smart search.4 Machine learning tasks in Immich significantly benefit from the CUDA cores on the 1050Ti, often processing images at a rate many times faster than an ARM-based NPU.4

## **High Availability Networking: Redundant Pi-hole Strategy**

One of the user's primary goals is to ensure that a single device failure does not result in a loss of internet connectivity for the household. This is achieved through a High Availability (HA) DNS configuration.

### **DNS Redundancy with Keepalived and VRRP**

The strategy involves running two instances of Pi-hole: the primary on the Raspberry Pi and a secondary on the QNAP TS-433 (via Container Station).10

* **Virtual IP (VIP)**: Using the **Keepalived** daemon on both Linux hosts, a single Virtual IP is shared between them.30 The router is then configured to use only this VIP as the DNS server address.  
* **Failover Mechanism**: Under normal conditions, the Raspberry Pi holds the VIP and handles all DNS requests. If the Pi becomes unresponsive, Keepalived on the NAS detects the failure and assumes the VIP within seconds, providing seamless DNS resolution to all network clients.30  
* **Configuration Sync**: Tools like **nebula-sync** (the current standard for Pi-hole v6) or the older **gravity-sync** should be utilized to ensure that blocklists, local DNS records, and whitelists remain synchronized between the two nodes.30

| HA Component | Master Node (RPi) | Backup Node (NAS) |
| :---- | :---- | :---- |
| Service | Pi-hole (Native/Docker) | Pi-hole (Container Station) 10 |
| HA Controller | Keepalived 30 | Keepalived 30 |
| VRRP Priority | 255 (Highest) 31 | 254 31 |
| VIP Address | 192.168.1.X (Shared) | 192.168.1.X (Shared) |
| Sync Tool | nebula-sync 31 | nebula-sync 31 |

## **Advanced Observability: The Logging and Monitoring Stack**

For a senior developer, a robust logging and monitoring stack is not just a luxury but a necessity for debugging complex distributed services. Given the 4 GB RAM limitation on two of the three nodes, a lightweight approach to the "LGTM" (Loki, Grafana, Tempo, Mimir) stack is required.

### **Designing a Scalable Telemetry Pipeline**

The proposed architecture utilizes **Grafana Alloy** as the primary collector on all local nodes.33 Alloy is highly efficient and replaces several older agents (Promtail, Telegraf, etc.), reducing the overall memory footprint on the Raspberry Pi and NAS.

* **Metrics (Prometheus)**: The gaming PC should host the primary Prometheus instance, as it has the disk I/O and RAM to handle large time-series databases.34  
* **Logs (Loki)**: Logs from the NAS and RPi should be shipped to a central Loki instance. Running Loki in "Monolithic Mode" on the gaming PC is the simplest local setup.36  
* **Hybrid Cloud Strategy**: To preserve local resources, the user should consider the **Grafana Cloud Free Tier**.38 By shipping local logs and metrics to the cloud, the user benefits from a professional-grade observability platform without the overhead of hosting the database locally. This is particularly beneficial for the Raspberry Pi, as the SD card or local SSD will not be taxed by heavy write operations from a logging database.34

## **Artificial Intelligence and the Model Context Protocol (MCP)**

The user's background in Flutter and neural networks provides a strong foundation for integrating Large Language Models (LLMs) into the homelab environment.

### **Local LLM Hosting on the GTX 1050Ti**

The 4 GB VRAM of the GTX 1050Ti is the primary constraint for local LLM inference. However, with modern quantization techniques, significant capabilities can be achieved.

* **Qwen 2.5 Coder 7B**: This model is currently the "gold standard" for local coding assistants. Using 4-bit (Q4\_K\_M) quantization, the model weights occupy approximately 4.6 GB.20 While this technically exceeds the 4 GB VRAM, modern inference engines like llama.cpp or Ollama can offload a majority of the layers to the GPU while keeping the remainder in system RAM.20 Recent community reports have even demonstrated "surgical memory alignment" to fit 7B models entirely on 4 GB cards with reduced context windows.41  
* **Autocomplete vs. Reasoning**: For real-time autocompletion in VSCode, the user should deploy a smaller model like **Qwen 2.5 Coder 1.5B**, which fits entirely within the 1050Ti's VRAM with room for a massive KV cache, ensuring sub-10ms response times.20

### **The Model Context Protocol (MCP) in Homelab Automation**

The Model Context Protocol is an open standard that enables LLMs to interact with real-world tools and data.43

* **Home Assistant as an MCP Server**: By enabling the MCP server integration in Home Assistant, the user’s local LLM gains a "semantic understanding" of the home.43 It can then execute multi-step commands like "Turn off the office lights and wake up the gaming PC if a heavy job is queued".45  
* **Custom Flutter Wrapper**: The user's goal of a single "wrapper app" can be realized using the mcp\_client Dart package.47 This allows a Flutter mobile app to act as an MCP client, connecting to the Home Assistant MCP server and a local LLM server simultaneously.44 This architecture is modular and protocol-standardized, avoiding the "integration hell" of traditional home automation.

## **Operational Automation: Wake-on-LAN and Power Management**

To optimize power consumption, the gaming PC should only run during peak compute hours or when explicitly triggered.

### **Implementing an Always-On Orchestrator**

The Raspberry Pi, as an always-on device connected via Ethernet, serves as the perfect "Wake-on-LAN" (WOL) orchestrator.48

* **Trigger Mechanism**: The user can create an iOS Shortcut or a button in the Flutter wrapper app that sends an SSH command to the Raspberry Pi.22  
* **Execution**: The Pi executes the etherwake command targeting the MAC address of the gaming PC's Ethernet interface.48  
* **Verification**: The wrapper app can then use the Uptime Kuma API or a simple ping to verify that the PC has successfully booted before attempting to launch Jellyfin or LLM services.19

## **The Final Phase: Kubernetes and Cluster-Level Orchestration**

The ultimate goal for the user is the transition to a Kubernetes (K8s) cluster. This provides the most robust environment for deploying, scaling, and managing the 10-year veteran's growing suite of services.

### **K3s: The Lightweight Choice for ARM/x86 Hybrids**

K3s is a CNCF-certified Kubernetes distribution designed specifically for low-resource environments like homelabs.51

* **Multi-Architecture Support**: K3s seamlessly handles clusters that mix ARM64 (NAS/RPi) and x86-64 (PC) nodes.40  
* **QNAP Integration**: QNAP’s Container Station includes a built-in K3s engine, which simplifies the process of adding the NAS as a worker node to the cluster.52  
* **Persistent Storage**: In a K8s environment, the QNAP NAS can act as a **Persistent Volume (PV)** provider using the NFS provisioner. This allows any pod, regardless of which node it is running on, to store data on the redundant RAID 5 array of the NAS.26

## **Conclusions and Implementation Roadmap**

The current infrastructure is well-positioned for a phased evolution into a high-performance homelab.

### **Phase 1: Storage and Network Stabilization**

* Unbox the QNAP TS-433 and configure the three 4TB drives in a RAID 5 array within the native **QTS 5.2** environment.1  
* Deploy the 2.5G switch and hard-link all primary nodes (Pi, PC, NAS) using Cat6 or better Ethernet cables.1  
* Establish SMB/NFS shares on the NAS and mount them on the gaming PC for Jellyfin and Immich storage.21

### **Phase 2: High Availability and Observability**

* Deploy a secondary Pi-hole on the NAS and configure **Keepalived** for DNS failover.30  
* Install **Grafana Alloy** on all devices and configure a hybrid logging stack (Grafana Cloud or local Loki on the PC).33  
* Configure **Wake-on-LAN** scripts on the Raspberry Pi to manage the gaming PC’s power state.22

### **Phase 3: Intelligent Automation and AI**

* Deploy **Ollama** or llama.cpp on the gaming PC, utilizing **Qwen 2.5 Coder 7B** for VSCode integration.20  
* Set up **Home Assistant** with the **MCP Server** integration.43  
* Begin development of the **Flutter wrapper app** using the mcp\_client library to unify AI and service interactions.44

### **Phase 4: Cluster Orchestration**

* Initialize a **K3s** cluster with the Raspberry Pi as the control plane and the NAS and PC as worker nodes.51  
* Migrate services (VaultWarden, Homepage, custom apps) into Kubernetes deployments for enhanced reliability and scalability.51

By maintaining the TS-433 on its native QTS operating system, the user ensures maximum hardware compatibility and stability for the data layer, while the more flexible compute nodes handle the "heavy lifting" of AI, media processing, and container orchestration. This balanced approach mitigates the risks associated with experimental ARM operating systems while delivering a professional-grade, distributed development and home automation platform.

#### **Works cited**

1. TS-433 | Hardware Specs \- QNAP, accessed January 24, 2026, [https://www.qnap.com/en/product/ts-433/specs/hardware](https://www.qnap.com/en/product/ts-433/specs/hardware)  
2. Dev boards showcase Rockchip's new RK3568 and RK3566 \- Linux Gizmos, accessed January 24, 2026, [https://linuxgizmos.com/dev-boards-showcase-rockchips-new-rk3568-and-rk3566/](https://linuxgizmos.com/dev-boards-showcase-rockchips-new-rk3568-and-rk3566/)  
3. QNAP TS-433 | QNAPWorks.com, accessed January 24, 2026, [https://www.qnapworks.com/ts-433.asp](https://www.qnapworks.com/ts-433.asp)  
4. Hardware-Accelerated Machine Learning \- Immich Docs, accessed January 24, 2026, [https://docs.immich.app/features/ml-hardware-acceleration](https://docs.immich.app/features/ml-hardware-acceleration)  
5. QNAP TS-433 4 Bay NAS, ARM 4-core Cortex-A55 2.0GHz Processor, 4 GB RAM, 4x 3.5-inch SATA 6Gb/s, 3Gb/s, 5 Gigabit Ethernet Port, 90W Power Supply, White \- Adarc Computers, accessed January 24, 2026, [https://www.adarccomputer.com/product/qnap-ts-433-4-bay-nas-arm-4-core-cortex-a55-2-0ghz-processor-4-gb-ram-4x-3-5-inch-sata-6gb-s-3gb-s-5-gigabit-ethernet-port-90w-power-supply-white-ts-433-4g-us](https://www.adarccomputer.com/product/qnap-ts-433-4-bay-nas-arm-4-core-cortex-a55-2-0ghz-processor-4-gb-ram-4x-3-5-inch-sata-6gb-s-3gb-s-5-gigabit-ethernet-port-90w-power-supply-white-ts-433-4g-us)  
6. Hardware Specs \- TS-433-4G \- QNAP, accessed January 24, 2026, [https://www.qnap.com/en-us/product/ts-433/specs/hardware/TS-433-4G.pdf](https://www.qnap.com/en-us/product/ts-433/specs/hardware/TS-433-4G.pdf)  
7. TrueNAS on ARM \- Now Available, accessed January 24, 2026, [https://forums.truenas.com/t/truenas-on-arm-now-available/49160](https://forums.truenas.com/t/truenas-on-arm-now-available/49160)  
8. TS-433 | Hardware Specs | QNAP (US), accessed January 24, 2026, [https://www.qnap.com/en-us/product/ts-433/specs/hardware](https://www.qnap.com/en-us/product/ts-433/specs/hardware)  
9. TrueNAS Software Status, accessed January 24, 2026, [https://www.truenas.com/docs/softwarestatus/](https://www.truenas.com/docs/softwarestatus/)  
10. How to configure Pi-hole on your QNAP NAS, accessed January 24, 2026, [https://www.qnap.com/en/qutube/video/ZvaQu5\_QrJ4](https://www.qnap.com/en/qutube/video/ZvaQu5_QrJ4)  
11. QNAP: Running Immich using Container Station \- Immensity Blog, accessed January 24, 2026, [https://blog.immensity.in/qnap-running-immich-using-container-station/](https://blog.immensity.in/qnap-running-immich-using-container-station/)  
12. 5 best NAS operating systems \- XDA Developers, accessed January 24, 2026, [https://www.xda-developers.com/best-nas-operating-systems/](https://www.xda-developers.com/best-nas-operating-systems/)  
13. TrueNAS on ARM \- Now Available \- Page 4 \- TrueNAS General ..., accessed January 24, 2026, [https://forums.truenas.com/t/truenas-on-arm-now-available/49160?page=4](https://forums.truenas.com/t/truenas-on-arm-now-available/49160?page=4)  
14. U-Boot for Qnap TS433 Devices, accessed January 24, 2026, [https://docs.u-boot.org/en/stable/board/qnap/ts433.html](https://docs.u-boot.org/en/stable/board/qnap/ts433.html)  
15. InstallingDebianOn/Qnap/TS-433 \- Debian Wiki, accessed January 24, 2026, [https://wiki.debian.org/InstallingDebianOn/Qnap/TS-433](https://wiki.debian.org/InstallingDebianOn/Qnap/TS-433)  
16. TrueNAS on Arm is finally a thing \- Jeff Geerling, accessed January 24, 2026, [https://www.jeffgeerling.com/blog/2025/truenas-on-arm-finally-thing/](https://www.jeffgeerling.com/blog/2025/truenas-on-arm-finally-thing/)  
17. How to Install UnRAID on a QNAP NAS – A Step by Step Guide \- NAS Compares, accessed January 24, 2026, [https://nascompares.com/guide/how-to-install-unraid-on-a-qnap-nas-a-step-by-step-guide/](https://nascompares.com/guide/how-to-install-unraid-on-a-qnap-nas-a-step-by-step-guide/)  
18. Unraid on a qnap device \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/unRAID/comments/trm73r/unraid\_on\_a\_qnap\_device/](https://www.reddit.com/r/unRAID/comments/trm73r/unraid_on_a_qnap_device/)  
19. Unraid 2025 Year In Review \- Unraid Digest, accessed January 24, 2026, [https://newsletter.unraid.net/p/unraid-2025-year-in-review](https://newsletter.unraid.net/p/unraid-2025-year-in-review)  
20. Best Local LLMs For Coding \- Mike Slinn, accessed January 24, 2026, [https://www.mslinn.com/llm/7900-coding-llms.html](https://www.mslinn.com/llm/7900-coding-llms.html)  
21. Does my NAS have to run Plex/Jellyfin or can I use my proxmox server? \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/selfhosted/comments/1j3fhpp/does\_my\_nas\_have\_to\_run\_plexjellyfin\_or\_can\_i\_use/](https://www.reddit.com/r/selfhosted/comments/1j3fhpp/does_my_nas_have_to_run_plexjellyfin_or_can_i_use/)  
22. Raspberry PI to wake-on-lan a computer : r/Tailscale \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/Tailscale/comments/1hc89u3/raspberry\_pi\_to\_wakeonlan\_a\_computer/](https://www.reddit.com/r/Tailscale/comments/1hc89u3/raspberry_pi_to_wakeonlan_a_computer/)  
23. Networking | Jellyfin, accessed January 24, 2026, [https://jellyfin.org/docs/general/post-install/networking/](https://jellyfin.org/docs/general/post-install/networking/)  
24. Hardware Acceleration | Jellyfin, accessed January 24, 2026, [https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/](https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/)  
25. Storage | Jellyfin, accessed January 24, 2026, [https://jellyfin.org/docs/general/administration/storage/](https://jellyfin.org/docs/general/administration/storage/)  
26. How to Mount a Network Drive to Jellyfin : r/JellyfinCommunity \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/JellyfinCommunity/comments/1nd2k62/how\_to\_mount\_a\_network\_drive\_to\_jellyfin/](https://www.reddit.com/r/JellyfinCommunity/comments/1nd2k62/how_to_mount_a_network_drive_to_jellyfin/)  
27. How to use an SMB share on your NAS with Jellyfin on Windows \- nexxai.dev, accessed January 24, 2026, [https://nexxai.dev/how-to-use-an-smb-share-on-your-nas-with-jellyfin-on-windows/](https://nexxai.dev/how-to-use-an-smb-share-on-your-nas-with-jellyfin-on-windows/)  
28. Transcoding | Jellyfin, accessed January 24, 2026, [https://jellyfin.org/docs/general/post-install/transcoding/](https://jellyfin.org/docs/general/post-install/transcoding/)  
29. Hardware Transcoding \- Immich Docs, accessed January 24, 2026, [https://docs.immich.app/features/hardware-transcoding/](https://docs.immich.app/features/hardware-transcoding/)  
30. Pihole in Docker High Availability (HA) with keepalive guide : r/UgreenNASync \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/UgreenNASync/comments/1nhwn70/pihole\_in\_docker\_high\_availability\_ha\_with/](https://www.reddit.com/r/UgreenNASync/comments/1nhwn70/pihole_in_docker_high_availability_ha_with/)  
31. High Availability Pi-Hole & Local DNS \- ScottiByte's Discussion Forum, accessed January 24, 2026, [https://discussion.scottibyte.com/t/high-availability-pi-hole-local-dns/492](https://discussion.scottibyte.com/t/high-availability-pi-hole-local-dns/492)  
32. Pi-hole setup with High Availablity \- BinaryPatrick, accessed January 24, 2026, [https://binarypatrick.dev/posts/install-pihole-ha/](https://binarypatrick.dev/posts/install-pihole-ha/)  
33. Estimate Grafana Alloy resource usage, accessed January 24, 2026, [https://grafana.com/docs/alloy/latest/introduction/estimate-resource-usage/](https://grafana.com/docs/alloy/latest/introduction/estimate-resource-usage/)  
34. Syslog server, preferably lightweight with webui : r/selfhosted \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/selfhosted/comments/1o91wb5/syslog\_server\_preferably\_lightweight\_with\_webui/](https://www.reddit.com/r/selfhosted/comments/1o91wb5/syslog_server_preferably_lightweight_with_webui/)  
35. Monitor the cluster with Prometheus and Grafana \- Arm Learning Paths, accessed January 24, 2026, [https://learn.arm.com/learning-paths/servers-and-cloud-computing/sentiment-analysis-eks/cluster-monitoring/](https://learn.arm.com/learning-paths/servers-and-cloud-computing/sentiment-analysis-eks/cluster-monitoring/)  
36. Loki Monolithic Memory Consumption \- Grafana Community, accessed January 24, 2026, [https://community.grafana.com/t/loki-monolithic-memory-consumption/112032](https://community.grafana.com/t/loki-monolithic-memory-consumption/112032)  
37. Loki vs CloudWatch Logs: Self-Hosted vs Managed Logging \- OneUptime, accessed January 24, 2026, [https://oneuptime.com/blog/post/2026-01-21-loki-vs-cloudwatch/view](https://oneuptime.com/blog/post/2026-01-21-loki-vs-cloudwatch/view)  
38. Optimize resource usage and efficiency | Grafana Cloud documentation, accessed January 24, 2026, [https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/optimize-resource-usage/](https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/optimize-resource-usage/)  
39. Preferred Monitoring-Stack for Home-Lab or Single-Node-Clusters? : r/kubernetes \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/kubernetes/comments/1ptdczb/preferred\_monitoringstack\_for\_homelab\_or/](https://www.reddit.com/r/kubernetes/comments/1ptdczb/preferred_monitoringstack_for_homelab_or/)  
40. Requirements \- K3s \- Lightweight Kubernetes, accessed January 24, 2026, [https://docs.k3s.io/installation/requirements](https://docs.k3s.io/installation/requirements)  
41. Finally managed to run Qwen-2.5-7B on a 4GB GTX 1050 without CPU offloading (Surgical Memory Alignment) : r/LocalLLaMA \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1po97ad/finally\_managed\_to\_run\_qwen257b\_on\_a\_4gb\_gtx\_1050/](https://www.reddit.com/r/LocalLLaMA/comments/1po97ad/finally_managed_to_run_qwen257b_on_a_4gb_gtx_1050/)  
42. Qwen2.5-Coder Series: Powerful, Diverse, Practical. | Qwen, accessed January 24, 2026, [https://qwenlm.github.io/blog/qwen2.5-coder-family/](https://qwenlm.github.io/blog/qwen2.5-coder-family/)  
43. Model Context Protocol Server \- Home Assistant, accessed January 24, 2026, [https://www.home-assistant.io/integrations/mcp\_server/](https://www.home-assistant.io/integrations/mcp_server/)  
44. How to Use the Model Context Protocol (MCP) with Flutter and Dart \- freeCodeCamp, accessed January 24, 2026, [https://www.freecodecamp.org/news/how-to-use-the-model-context-protocol-mcp-with-flutter-and-dart/](https://www.freecodecamp.org/news/how-to-use-the-model-context-protocol-mcp-with-flutter-and-dart/)  
45. Building a Smart Home Assistant with MCP: A Practical Guide to Home Automation \- Pyyne, accessed January 24, 2026, [https://www.pyyne.com/post/building-a-smart-home-assistant-with-mcp-a-practical-guide-to-home-automation](https://www.pyyne.com/post/building-a-smart-home-assistant-with-mcp-a-practical-guide-to-home-automation)  
46. Real-World Use Cases: Smart Home & Industrial IoT with MCP \- Glama, accessed January 24, 2026, [https://glama.ai/blog/2025-08-21-real-world-use-cases-smart-home-and-industrial-io-t-with-mcp](https://glama.ai/blog/2025-08-21-real-world-use-cases-smart-home-and-industrial-io-t-with-mcp)  
47. mcp\_client | Dart package \- Pub.dev, accessed January 24, 2026, [https://pub.dev/packages/mcp\_client](https://pub.dev/packages/mcp_client)  
48. Raspberry Pi As Wake on LAN Server : 5 Steps (with Pictures) \- Instructables, accessed January 24, 2026, [https://www.instructables.com/Raspberry-Pi-As-Wake-on-LAN-Server/](https://www.instructables.com/Raspberry-Pi-As-Wake-on-LAN-Server/)  
49. WAKE ON LAN \- Raspberry Pi Forums, accessed January 24, 2026, [https://forums.raspberrypi.com/viewtopic.php?t=97369](https://forums.raspberrypi.com/viewtopic.php?t=97369)  
50. Wake up a PC on LAN from QNAP \- QNAP NAS Community Forum, accessed January 24, 2026, [https://forum.qnap.com/viewtopic.php?t=76012](https://forum.qnap.com/viewtopic.php?t=76012)  
51. Getting Started With K3s | Baeldung on Ops, accessed January 24, 2026, [https://www.baeldung.com/ops/k3s-getting-started](https://www.baeldung.com/ops/k3s-getting-started)  
52. k3s on QNAP Container Station \- Reddit, accessed January 24, 2026, [https://www.reddit.com/r/k3s/comments/10u99jj/k3s\_on\_qnap\_container\_station/](https://www.reddit.com/r/k3s/comments/10u99jj/k3s_on_qnap_container_station/)  
53. High Availability Pi-hole 6 \- Docker, accessed January 24, 2026, [https://homelab.casaursus.net/high-availability-pi-hole-6/](https://homelab.casaursus.net/high-availability-pi-hole-6/)