# Pi-hole v6 Operational Knowledge

Gotchas and patterns specific to Pi-hole v6, which differs significantly from v5.

## Configuration

- Pi-hole v6 uses `FTLCONF_` environment variables (not v5's `PIHOLE_DNS_` style)
- Runtime config changes: `pihole-FTL --config <key> <value>`
- Web password: set via `FTLCONF_webserver_api_password` env var
- Docker bridge networking: must set `FTLCONF_dns_listeningMode=ALL` — otherwise LAN queries appear as "non-local" and get rejected

## API Session Limits

Default `webserver.api.max_sessions` is 16. With Homepage polling, MCP servers, and browser access, this limit is easily exhausted.

**Symptom:** "API seats exceeded" error on auth.

**Fix:** `sudo pihole-FTL --config webserver.api.max_sessions 64`

**Note:** Primary and secondary Pi-holes may use different password formats (app-password vs plaintext). Check each instance independently.

## nebula-sync (Pi-hole Replication)

Use nebula-sync (not gravity-sync) for Pi-hole v6.

- `FULL_SYNC=true` fails when the replica has env-var-locked settings (returns HTTP 400 from config API)
- **Solution:** Use `FULL_SYNC=false` — syncs teleporter data (blocklists, client settings) which is what matters
- Enable `FTLCONF_webserver_api_app_sudo=true` on replicas for nebula-sync write access
- Uses Docker DNS hostname (`http://pihole`) to reach the local Pi-hole container within the compose network
