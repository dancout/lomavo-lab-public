# ADR-026: Ollama Local LLM Deployment on Gaming PC

**Status**: Accepted

**Date**: 2026-02-07

## Context

The homelab is ready for Phase 3 (AI & Automation). A local LLM enables natural language interaction with homelab services, code assistance, and private AI chat without relying on cloud APIs. The Gaming PC has the best hardware for this: i7 CPU, 32GB RAM, GTX 1050Ti.

Key constraints:
1. GTX 1050Ti has 4GB VRAM — insufficient for GPU inference of 7B models (~5GB)
2. NVIDIA driver is ~300s; WSL2 GPU passthrough requires 470+ (CUDA toolkit)
3. 32GB RAM is more than sufficient for CPU-based 7B inference (~5GB per model)
4. Gaming PC is not always-on — LLM availability depends on PC being awake

## Decision

### Stack

| Component | Image | Port | Purpose |
|-----------|-------|------|---------|
| Ollama | `ollama/ollama:latest` | 11434 | Model serving (CPU-only) |
| Open WebUI | `ghcr.io/open-webui/open-webui:main` | 3080 | Chat interface with RAG support |

### Models

| Model | Size | Use Case | Status |
|-------|------|----------|--------|
| Qwen 2.5 7B (Q4_K_M) | ~4.7GB | General chat, homelab queries | Pulled, too slow on CPU |
| Qwen 2.5 Coder 7B (Q4_K_M) | ~4.7GB | Code assistance | Pulled, too slow on CPU |
| Qwen 2.5 1.5B | ~1.1GB | General chat, MCP tool calling | **Active — usable on CPU** |
| Llama 3.2 1B | ~0.7GB | Lightweight chat | **Active — usable on CPU** |

Models load on demand — only the active model consumes RAM.

**Performance reality:** 7B models on CPU-only i7 are impractically slow for interactive use (~2-5 tokens/sec observed). The 1.5B models are the practical choice until GPU passthrough is enabled in Phase 3E.

### Why Gaming PC (Not NAS or Pi)

- **NAS:** 4GB RAM total, already running Prometheus/Grafana/Loki — no headroom
- **Pi:** 4GB RAM, even less available than NAS
- **Gaming PC:** 32GB RAM with ~18GB free after Docker containers — plenty for CPU inference

### CPU-Only (GPU Deferred)

Running on CPU is significantly slower than expected for 7B models. The 1.5B models (~2-5 tokens/sec) are the minimum viable size for interactive use. GPU passthrough deferred to Phase 3E pending NVIDIA driver upgrade, at which point 7B models (or quantized variants) should become practical.

### Deployment

Both services deploy as separate Docker Compose files in `gaming-pc/docker/`:
- `gaming-pc/docker/ollama/docker-compose.yml`
- `gaming-pc/docker/open-webui/docker-compose.yml`

Open WebUI connects to Ollama via `host.docker.internal:11434` (Docker Desktop for Windows resolves this automatically).

## Update: Inference Moved to MacBook Air (Temporary)

**Date:** 2026-02-07

CPU-only inference on the Gaming PC was too slow for interactive use, even with 7B
models. Ollama has been temporarily moved to a 2025 MacBook Air M4 (24GB unified
memory), which provides dramatically faster inference via the Neural Engine.

**Current architecture:**
- Ollama runs on MacBook (`<MACBOOK_IP>:11434`) via `brew services start ollama`
- Open WebUI remains on Gaming PC (`<GAMING_PC_IP>:3080`), configured with
  `OLLAMA_BASE_URL=http://<MACBOOK_IP>:11434`
- MCP servers remain on Gaming PC, connected to Open WebUI via native Streamable HTTP
  (MCPO proxy not needed — Open WebUI v0.6.31+ supports MCP natively)

**Limitations:** MacBook must be awake, Wi-Fi connected, DHCP IP may change.

**Path forward:** GPU upgrade on Gaming PC, dedicated inference server, or cloud API.

## Consequences

**Positive:**
- Private LLM chat accessible from any LAN device at `<GAMING_PC_IP>:3080`
- Open WebUI provides conversation history, RAG, and MCP tool use (native Streamable HTTP)
- No cloud API costs or data leaving the network
- M4 inference is fast enough for interactive 7B model use

**Negative:**
- LLM unavailable when MacBook is asleep or off-network (acceptable — not critical)
- Wi-Fi adds slight latency vs hardwired (negligible compared to inference time)
- ~5GB RAM consumed on MacBook while model is loaded (auto-unloads after idle)

## References

- Phase 3 plan in `future-plans.md`
- ADR-027: MCP Server Architecture (LLM ↔ homelab integration)
- Ollama documentation: https://ollama.com
