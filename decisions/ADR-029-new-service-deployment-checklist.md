# ADR-029: New Service Deployment Checklist

**Status:** Accepted
**Date:** 2026-02-11

## Context

During the Nest thermostat integration (ADR-028), several operational steps were missed during implementation:

1. **Prerequisites not collected upfront** — The plan listed manual steps the user needed to complete (Google API registration, OAuth2 credentials) but implementation jumped straight to writing code instead of walking through the credential flow first.
2. **Homepage widget not added** — The service was deployed and working in Grafana but never surfaced on the Homepage dashboard.
3. **Uptime Kuma entry not communicated** — The health endpoint existed but the user wasn't told to add it to monitoring.
4. **Alerting not verified** — Though the existing "Scrape Target Down" alert automatically covers new Prometheus targets, this wasn't explicitly confirmed or communicated.

The existing documentation had partial coverage: `infrastructure/services.md` mentioned "add to Homepage + Uptime Kuma" in its "Adding New Services" section, and `CONTRIBUTING.md` had a merge checklist — but neither was comprehensive enough to prevent these omissions, and neither was referenced at the right moment (plan implementation time vs. merge time).

## Decision

Add a **"New Service Deployment Checklist"** to `CONTRIBUTING.md` that consolidates all operational steps into one place, ordered by when they should happen:

1. **Before building:** Collect prerequisites, walk user through manual setup steps
2. **Code & config:** Create files, deploy, verify endpoints
3. **Observability:** Prometheus scrape job, Grafana dashboard, Homepage widget, Uptime Kuma entry
4. **Documentation:** services.md, machine README, ADR, .env.example, next-steps, completed

Also updated:
- `CLAUDE.md` "What to Read When" table — added "Implementing a plan / adding a service" pointing to the new checklist
- `CLAUDE.md` "Before Merging Checklist" — added Homepage, Uptime Kuma, and alerting items

### Why a checklist instead of relying on design principles

The `CLAUDE.md` design principles already say "Every service should be monitorable (Homepage widget + Uptime Kuma)" — but principles are easy to skip under momentum. A concrete checklist with checkboxes at the point of implementation is harder to miss than a principle buried in a different section.

## Consequences

### Positive
- Single reference for all steps when adding a new service
- Prerequisites collected before code is written (no wasted effort)
- Operational items (Homepage, Uptime Kuma, alerting) are explicit, not implied
- Referenced at implementation time, not just merge time

### Negative
- Checklist may need updating as new operational patterns emerge (e.g., if MCP server registration becomes standard)

## Related

- ADR-028: Nest Thermostat Monitoring (the incident that prompted this)
- ADR-005: Modular and Extensible Architecture (design principles)
