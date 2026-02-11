These are some notes I've found on my iPhone that I didn't want to forget, so these are not necessarily in any particular order but should all be considered to be done at some point in time. They're not hard requirements, but we should try.

There might be some repeat information in here since there were lots of notes.



#### Future Plans:
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
- alerting or notifications when a service goes down. My PC was off in the office and I have no idea how long it was out. Also, how can we have services checked for only when the PC is supposed to be on later?
- Only storing postgres and thumbnails on the point of contact for immich, and encoded videos on the NAS. Should point of contact be the PC, Pi, or the NAS?
- Have a thermostat monitor for when furnace is on, temp in the house, etc (home assistant - Carson uses a ZWave connector)



#### General Requests
- Should have a command to just ssh into the pi or gaming PC from my MacBook (or other device) so Claude code can easily work on the pi from my Mac 
- Long term goal, I'd like to have a kubernetes setup at home running everything
- Monitoring and telemetry set up across all services and hardware. Currently we have uptime kuma for services, but I would also like more sophisticated setups when we get there (Like Loki, Grafana, etc).
- All new services should be included on the Homepage Dashboard so that I can have an easy place to grab it later (where applicable, knowing some services like a VPN might not have a dashboard entry really). All things that are monitorable should also have an entry in the uptime kuma dashboard and/or our improved monitoring and telemetry.
- The monitoring dashboard should show the CPU/RAM/Storage/other values of each device (ideally think about both live or across time)
- Get a reverse proxy set up so that when on my local network I don't have to type "10.0.0.X:{portNumber}" to hit a page, but rather I could go to like `home.<DOMAIN>` to go to my home dashboard. I had trouble the first time because of known xfinity troubles.
    - It would be nice to have my vaultwarden pointing to a proper "https" address, too, since I get the "this site isn't secured, do you really want to proceed" message every time I hit the address directly. I had to put in an exception or something just to fake it being https.
- Turning Gaming PC (or other hardware?) on over WiFi ping, probably wake on LAN?
- Eventually set up locally hosted Map service to replace Immich’s tiles.immich.cloud service
- Research "Organizer" as an alternative homepage solution with SSO 
- Think through if the "brain" of immich makes the most sense on the gaming PC, or if it makes sense to only outsource the compute heavy tasks to the gaming PC. In other words, have immich served from the NAS and only wake up the gaming PC when it's time to transcode videos or run any jobs. This way, the gaming PC only has to be on when absolutely necessary, and can be powered off otherwise AND we still get a constant uptime for immich to be available.
    - Also, consider any other hardware setup or configuration to improve this, not necessarily only what I suggested.
- consider implementing vector store for previous decisions or documentation to search through for future work? I'm not sure if this is necessary, or if claude code or vscode might already do these sorts of things.

#### Issues to research
- Get watchtower working on Gaming PC and other hardware that makes sense. Get the monitoring working for them, as well (broken in uptime kuma right now - lots of HTTP vs HTTPS issues, so reverse proxying might help)
- when I restarted my PC the jellyin server and immich (pc) were both offline until I unlocked the screen. I had turned the WiFi off earlier while screen was unlocked so I wonder if that played a part? Because immich app was def usable

#### For having an LLM wrapper around all our services
- Whip up an MCP server for my home lab setup to query for monitoring data and be accessible to the internal LLM so you can ask questions about recent RAM usage, storage levels, etc
- It would be nice to say to the AI “mark all the pictures in Grace and Jake’s cabin from this album that are missing location data with a certain target location” instead of manually doing it
- Hook into or create Mcp server around immich to reset faces, run missing metadata, other jobs, or run tasks for a particular profile 
- Mcp server around looking at logs so I can ask “when did the last photos finish uploading and what were the errors”