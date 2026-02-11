# MacBook Air (M4) - Temporary LLM Inference Host

**Machine:** 2025 MacBook Air M4, 24GB unified memory, macOS Sequoia 15.6.1
**IP:** `<MACBOOK_IP>` (DHCP via Wi-Fi — may change)
**Connection:** Wi-Fi (not hardwired)

> **TEMPORARY SETUP:** The MacBook serves as the Ollama inference host because the
> Gaming PC lacks a GPU suitable for LLM inference (GTX 1050Ti, CPU-only for Ollama).
> This is a stopgap until a better solution is in place (e.g., GPU upgrade, dedicated
> inference server, or cloud API). The MacBook must be open and awake for Open WebUI
> to function.

## Services

| Service | Port | Install Method | Notes |
|---------|------|---------------|-------|
| Ollama | 11434 | Homebrew | LLM inference, M4 Neural Engine |

## Setup

**Ollama installed via Homebrew:**
```bash
brew install ollama
brew services start ollama   # Runs in background, auto-starts on login
```

**IMPORTANT:** `brew services start ollama` makes Ollama run persistently and start
on login. When migrating inference off the MacBook, remember to stop it:
```bash
brew services stop ollama
```

**Listening on all interfaces (required for LAN access):**
```bash
launchctl setenv OLLAMA_HOST 0.0.0.0
brew services restart ollama
```
Without `OLLAMA_HOST=0.0.0.0`, Ollama only listens on localhost and the Gaming PC
cannot reach it.

## Models

| Model | Size | Notes |
|-------|------|-------|
| qwen2.5:7b | ~4.7GB | General purpose, used with Open WebUI |

Pull additional models with:
```bash
ollama pull <model-name>
```

## Architecture

```
Open WebUI (Gaming PC:3080) --HTTP--> Ollama (MacBook:11434)
                                        |
                                        v
                                   M4 Neural Engine
                                   (LLM inference)
```

Open WebUI handles chat UI, MCP tool integration, and model selection.
The MacBook only runs inference — all other services remain on the Gaming PC.

## Switching Ollama Between MacBook and Gaming PC

### To move inference back to the Gaming PC:

```bash
# 1. On the Gaming PC — recreate Open WebUI pointing to local Ollama
docker stop open-webui && docker rm open-webui
docker run -d --name open-webui --restart unless-stopped \
  -p 3080:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v open-webui_open-webui_data:/app/backend/data \
  ghcr.io/open-webui/open-webui:dev

# 2. On the MacBook — stop Ollama (frees resources, stops auto-start on login)
brew services stop ollama
```

### To move inference back to the MacBook:

```bash
# 1. On the MacBook — start Ollama and ensure LAN access
brew services start ollama
# Verify OLLAMA_HOST is set (only needed once, persists across restarts):
launchctl setenv OLLAMA_HOST 0.0.0.0
brew services restart ollama

# 2. On the Gaming PC — recreate Open WebUI pointing to MacBook
docker stop open-webui && docker rm open-webui
docker run -d --name open-webui --restart unless-stopped \
  -p 3080:8080 \
  -e OLLAMA_BASE_URL=http://<MACBOOK_IP>:11434 \
  -v open-webui_open-webui_data:/app/backend/data \
  ghcr.io/open-webui/open-webui:dev
```

Replace `<MACBOOK_IP>` with the current IP (check with `ipconfig getifaddr en0` on the MacBook).

**Note:** MCP server configs in Open WebUI are stored in the volume and persist
across container recreations. You should not need to re-add them.

## Limitations

- **Must be awake:** Lid closed or sleep = Open WebUI loses its LLM backend
- **Wi-Fi only:** Higher latency than hardwired machines, but LLM inference
  is the bottleneck, not network transfer
- **DHCP IP:** May change on reconnect. If Open WebUI can't reach Ollama,
  check the MacBook's current IP and update the container
- **No monitoring:** No Glances/Prometheus metrics on the MacBook currently
