# Next Steps

Current sprint / immediate tasks. See `future-plans.md` for long-term roadmap, `completed.md` for history.

## Active Work

### MCP Tool Call Grafana Dashboards - DONE
- [x] Create "MCP Tools - Overview" dashboard in Grafana (total calls, error rate, calls by server, avg response time)
- [x] Create "MCP Tools - Detail" dashboard in Grafana (per-tool breakdown, p50/p95 latency, error log table)
- [x] Add MCP activity widget to Homepage (iframe embed of overview panel)
- [x] Fix MCP structured logging (`res.on('finish')` instead of `'close'` for HTTP keep-alive)
- Data source: structured JSON logs in Loki from MCP containers (via Promtail on Gaming PC)

### Nest Thermostat
- [ ] Build plan for integration
- [ ] Show actual temp over time
- [ ] Show target temp over time
- [ ] Show / track setting the thermostat was in (eco, heat, cool, dual, fan, etc)
- [ ] Show / track when furnace is on / off or AC is on / off

### User Actions (Manual)
- [ ] **Add Uptime Kuma entries** for MCP servers and Ollama:
  - Ollama API: `http://<MACBOOK_IP>:11434/api/tags` (HTTP, keyword: "models")
  - Open WebUI: `http://<GAMING_PC_IP>:3080` (HTTP)
  - MCP Homelab: `http://<GAMING_PC_IP>:8770/health` (HTTP, keyword: "ok")
  - MCP Monitoring: `http://<GAMING_PC_IP>:8771/health` (HTTP, keyword: "ok")
  - MCP Immich: `http://<GAMING_PC_IP>:8772/health` (HTTP, keyword: "ok")
  - MCP DNS: `http://<GAMING_PC_IP>:8773/health` (HTTP, keyword: "ok")
  - MCP Docker: `http://<GAMING_PC_IP>:8774/health` (HTTP, keyword: "ok")

### Testing (as time permits)
- [ ] Test MCP tools via Open WebUI + Ollama (basic end-to-end validation)
- [ ] Test mcp-immich via Claude Code (search photos, list albums, check jobs)
- [ ] Test mcp-dns via Claude Code (get stats, query log)
- [ ] Test mcp-docker via Claude Code (list containers, view logs)

## Backlog

### High Priority
- [ ] Migrate any remaining services from the Pi to the NAS that make sense

### Medium Priority
- [ ] Add NAS snapshot pool metrics to Homepage (requires SSH or SNMP on NAS - ADR-014)
- [ ] Native Glances on Windows for richer host metrics (intermediate step - ADR-012)
- [ ] Investigate pc_storage mount on Pi (unclear if actively used, may need cleanup)
- [ ] Consider security hardening for previously exposed values in git history (ADR-018)

### Deferred (Blocked)
- [ ] Watchtower HTTPS notification issue (needs reverse proxy first)
- [ ] Watchtower config mismatch on Gaming PC (ADR-007, defer until HTTPS fix)
- [ ] Reverse proxy for local URLs (e.g., `home.<DOMAIN>`)
