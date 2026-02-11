# ADR-017: Immich Jobs Monitoring via Custom Proxy

**Status:** Accepted
**Date:** 2026-02-01

## Context

We wanted to display Immich job queue status (active, waiting, failed jobs) on the Homepage dashboard to monitor photo processing progress. The native Homepage Immich widget only supports displaying users, photos, videos, and storage metrics - not job queue information.

Immich exposes job data via `/api/jobs` endpoint, which returns per-queue counts (thumbnailGeneration, metadataExtraction, faceDetection, smartSearch, etc.). However:
- The API requires an API key with `job.read` permission
- The response contains ~18 separate job queues
- Homepage's customapi widget cannot aggregate values across multiple JSON fields

## Decision

Create a lightweight proxy service (`immich-jobs-proxy`) that:
1. Calls the Immich `/api/jobs` endpoint
2. Aggregates counts across all job queues
3. Returns simplified JSON with totals: `{active, waiting, failed, queues}`

The proxy runs as a Docker container on the Raspberry Pi (port 8085), co-located with Homepage. Homepage uses a customapi widget to display the aggregated metrics.

## Alternatives Considered

1. **Show individual queues** - Would require 4+ widget slots and still not show totals
2. **Modify Homepage source** - Too invasive, would break on updates
3. **Use Home Assistant** - Overkill for this single use case

## Implementation

- Python HTTP server (~60 lines) using only stdlib
- Docker container with `restart: unless-stopped`
- Requires `IMMICH_JOBS_API_KEY` environment variable with `job.read` permission

## Consequences

**Positive:**
- Simple, single-purpose service
- Shows aggregated totals at a glance
- No Homepage modifications needed
- Easy to extend if more Immich metrics needed

**Negative:**
- Additional container to maintain
- Separate API key required
- Adds network hop (Pi → Gaming PC → response → Pi → Homepage)

## Related

- ADR-016: System Monitoring Strategy (overall monitoring approach)
- `rpi/docker/immich-jobs-proxy/` - Implementation
