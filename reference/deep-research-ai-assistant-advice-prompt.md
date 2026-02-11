I prompted google gemini to ultimately ask for advice on using github copilot or claude code, and I also laid out the grounds for what was currently done within my project and future work. This is not a 100% complete picture, as some present and future work has been updated, and also I didn't mention to the AI that my gaming PC currently has 32GB of RAM installed (in case that changes any decisions or makes a difference), and also my dedicated NAS is not yet set up yet because my router switch is also not set up yet (meaning my gaming pc is still on the wifi usb adapter).

Also note that I had lots of conversation around where the data for immich was being stored and retrieved. Where we landed is that if the immich "brain" is going to live on my gaming PC then I don't want to store all the encoded videos there, as I can only really expect to have 1TB of storage for everything on that Gaming PC. So, we opted to have the thumbnails and postgres DB live on the Gaming PC with the instance of immich, and have the encoded videos and original files eventually live on the NAS (for now just the shared network D drive on the gaming PC). It's currently in a sort of middle state where I think I had it working with pointing to the C drive for the DB and thumbnails and the D drive for encoded videos and original files, but I commented out those changes for the time being for other concerns (I found out my wifi adapter was just moving EXTREMELY slow and I thought I had broken something).

======================================================================
## My prompt for deep research:
Persona:
- I am a senior software developer who was done both web development (angular, python, node) and mobile (mainly flutter) development over the last 10 years
- I have dabbled in LLM fine tuning
- I created my own smart mirror software and hardware integration on my own from scratch (using raspberry pi, flutter web, and flutter android/iOS). I have effectively retired this, though, so simply consider my knowledge and understanding but not the desire to integrate smart mirrors into my future work.
- I created my own genetically evolving neural network open source package for learning purposes (genetically_evolving_neural_network on pub.dev)
- I am new to homelabbing but am eager to learn 

Current homelab setup:
- I have a raspberry pi running VaultWarden, a WireGuard VPN, homepage, pi-hole, watchtower, and uptime kuma. This is directly linked to the router via Ethernet.
- I have a gaming PC with i7 CPU and GTX 1050Ti GPU and 2TB of storage (1TB local SSD and 1TB HDD Currently set up as network drive available to other machines) running watchtower, JellyFin, and Immich. This is connected to WiFi over a USB adapter.
- I have a NAS QNAP TS-433 with 3 Seagate Ironwolf drives that are each 4TB of space that will be using RAID 5 storage (for around 9TB of total storage). This is not yet unboxed.
- I have a TrendNet 5 port unmanaged 2.5g switch that is not yet unboxed.
- I own the domain `<DOMAIN>` (see `.env.local` for actual value)
- I have a cloud flare account and have created a tunnel for `<STATUS_URL>` to point to a local status dashboard from uptime kuma (publicly available).
- I have a digital ocean account and am renting a small VPS where I use tail scale to connect my gaming PC to the public web, and I have pointed `<PHOTOS_URL>` to my locally running immich instance so it is publicly reachable. My wife and I each have an account and have been backing up data (roughly 300GB) so far using the external link so it's available anywhere
- I have my phone setup so that when it is off my home network that it automatically VPNs through wireguard into my home network via my raspberry pi.

Future plans:
- I would like to use the router switch to have the pi, the PC, and the NAS all hard linked into my router or internet provider
- I would like the NAS to be running pi-hole, too, so that I have a backup container running in case one goes down so my whole internet doesn’t go out
- I would like to consider if any services make sense to migrate from either the pi or the PC into the NAS directly 
- I would like to set up home assistant eventually that can run devices in my home
- I would like to consider if it’s possible to store my jellyfin media and immich media on the NAS directly but have the PC be responsible for transcoding or other “heavy” operations, if necessary
- I’d like to consider having the gaming PC turn on automatically when needed, but turn off to save power when not needed.
- I would like to set up logging and a log viewer of some sort (similar to Splunk or grafana) as an available service 
- I would eventually like to consider standing up my own wrapper application for all these services so I can reach whatever I want from the single app on my phone
- I would like to have at least 1 LLM stood up for a coding assistant to use for my own VSCode work
- I would like to have at least 1 LLM stood up for the wrapper app that can interact with the services for the user (likely through MCP server integrations)
- Looking really far into the future, I’d eventually like to be running my own kubernetes cluster that can house these services as they make sense. This is definitely a final phase, and can be worked towards.

Question:
- I want to better understand what options are available for the NAS. I’ve heard about people using Unraid or TruNas, but I think my QNAP has its own operation system already.
- Can you explain the differences between them, and which option I might want to go with given my plans and current setup?
======================================================================

## Response:
Found in `deep-research-ai-assistant-advice-answer.md`