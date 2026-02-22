# ADR-030: Grafana Dashboard File Provisioning

**Status:** Accepted
**Date:** 2026-02-12

## Context

All 6 Grafana dashboards existed only in the SQLite database on the NAS. If the database was lost or Grafana was rebuilt, all dashboards would be gone. We already file-provision datasources and alert rules (ADR-025) — dashboards were the last piece stored only in the DB.

The user relies on Claude to drive dashboard changes, so the read-only UI trade-off is acceptable. Version-controlling dashboards also provides change history, diff-ability, and consistent deployment.

## Decision

Export all 6 dashboards as JSON files and file-provision them via Grafana's dashboard provisioning system:

- **Provider config:** `provisioning/dashboards/dashboards.yml` points Grafana at the JSON files
- **Dashboard files:** One JSON file per dashboard in `provisioning/dashboards/`
- **Runtime fields stripped:** `id` and `version` removed from exports (Grafana assigns these at load time)
- **Deduplication:** Grafana matches by UID — existing DB dashboards are superseded by file-provisioned versions

Dashboards provisioned:
1. Homelab Overview (29 panels)
2. Nest Thermostat (13 panels)
3. MCP Tools - Overview (8 panels)
4. MCP Tools - Detail (6 panels)
5. Immich Jobs & Hardware (5 panels)
6. Container Logs (1 panel)

## Consequences

**Positive:**
- Dashboards are version-controlled and recoverable from the repo
- Consistent with existing provisioning pattern (datasources, alert rules)
- Changes are reviewable via git diff
- Full Grafana config can be rebuilt from scratch using repo files alone

**Negative:**
- Dashboards are read-only in the Grafana UI (cannot edit via browser)
- All dashboard changes must go through the repo → SCP → restart workflow
- JSON files are verbose (~60KB total across 6 dashboards)
