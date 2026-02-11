# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Documentation repository** for the lomavo homelab. Tracks configurations, decisions, and plans for personal home infrastructure. No code to build/test - manages documentation, docker-compose files, and architectural decisions.

**Owner**: Senior developer (10 years: Angular, Python, Node, Flutter), new to homelabbing, prefers strongly typed languages.

## What You Can Do (Without Asking)

You have SSH access to all machines. Use it proactively.

**Get actual IPs/usernames:** Read `.env.local` (or check `.env.local.example` for structure).

| Machine | SSH Command | Common Tasks |
|---------|-------------|--------------|
| Raspberry Pi | `ssh <RPI_USER>@<RPI_IP>` | Deploy configs, restart containers, check logs |
| Gaming PC | `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>` | Run PowerShell, manage Docker, check services |
| NAS | `ssh <NAS_USER>@<NAS_IP>` | Check storage, manage Glances container |

**Do these without asking:**
- Retrieve credentials from machines (see Finding Credentials below)
- Deploy updated configs via SCP/SSH
- Restart services after config changes
- Check service status and logs
- Run diagnostic commands

**ASK FIRST for security changes:**
- Firewall rules (opening/closing ports)
- SSH configuration changes
- Network exposure changes
- New services that listen on ports

## Design Principles

**Modularity**: Design with abstraction layers so services can be swapped without major rewrites (ADR-005).

**MCP-Readiness**: Structure services to be actionable via MCP servers in the future. Prefer HTTP APIs with JSON responses over shell scripts or proprietary protocols.

**Self-Healing**: Services should auto-recover from crashes (Docker restart policies, script restart loops).

**Observability**: Every service should be monitorable (Homepage widget + Uptime Kuma).

For detailed guidance, see `reference/design-principles.md`.

## What to Read When

| Task | Read First | Why |
|------|-----------|-----|
| Starting a session | `next-steps.md` | Current priorities |
| Adding/modifying a service | `infrastructure/services.md` | What runs where |
| Deploying to a machine | `rpi/README.md`, `gaming-pc/README.md`, or `nas/README.md` | Deploy commands, directory mappings |
| Network/SSH/mounts | `infrastructure/network.md` | IPs, SSH commands, mount paths |
| Understanding past decisions | `decisions/README.md` | ADR index with summaries |
| Diagnosing an outage/issue | `runbooks/README.md` | Past incidents with diagnosis steps and fixes |
| **Before merging** | **`CONTRIBUTING.md`** | **MANDATORY checklist** |

## Quick Deploy Commands

**Note:** Replace `<RPI_USER>`, `<RPI_IP>`, etc. with values from `.env.local`.

**Raspberry Pi:**
```bash
# Deploy a service config
scp rpi/docker/SERVICE/docker-compose.yml <RPI_USER>@<RPI_IP>:~/SERVICE/
ssh <RPI_USER>@<RPI_IP> "cd ~/SERVICE && docker compose down && docker compose up -d"

# Deploy Homepage (special - needs sudo for config)
scp rpi/docker/homepage/config/services.yaml <RPI_USER>@<RPI_IP>:/tmp/
ssh <RPI_USER>@<RPI_IP> "sudo cp /tmp/services.yaml ~/homepage/config/ && cd ~/homepage && docker compose restart"
```

**Gaming PC:**
```bash
# Run PowerShell command (quotes around username if it has spaces)
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "powershell -Command \"Your-Command\""

# Restart a scheduled task
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "schtasks /run /tn \"Task Name\""
```

## Documentation Update Rules

When you make changes, update docs based on what changed:

| Change Type | Update These Files |
|-------------|-------------------|
| New service | `infrastructure/services.md`, machine `README.md`, add to Uptime Kuma + Homepage |
| New container | Machine `README.md` (directory structure, environment vars) |
| Script changes | Machine `README.md` (document new features/behavior) |
| New environment variable | `.env.example` in relevant directory |
| Architectural decision | Create `decisions/ADR-XXX-*.md`, update `decisions/README.md` index |
| Network/IP/mount changes | `infrastructure/network.md` |

**When to create an ADR:**
- Non-obvious technical decisions (workarounds, tradeoffs)
- "Why did we do it this way?" questions
- Choosing between alternatives
- When in doubt, create one

## Before Merging Checklist

**STOP. Read `CONTRIBUTING.md` and verify:**
- [ ] `next-steps.md` updated (completed items checked, new items added)
- [ ] ADR created if significant decisions were made
- [ ] `decisions/README.md` index updated if ADR added
- [ ] `.env.example` updated if new secrets added
- [ ] `infrastructure/services.md` updated if services changed
- [ ] Machine `README.md` updated if setup/config changed

## File Organization

```
├── CLAUDE.md              # This file (start here)
├── CONTRIBUTING.md        # Feature completion checklist
├── .env.local.example     # Template for local IPs/usernames (copy to .env.local)
├── next-steps.md          # Current sprint / active tasks
├── future-plans.md        # Long-term phased roadmap
├── completed.md           # Archive of completed work
│
├── infrastructure/        # Cross-machine documentation
│   ├── network.md         # IPs, SSH commands, mounts
│   └── services.md        # Service inventory (what runs where)
│
├── decisions/             # Architecture Decision Records
│   └── README.md          # Index with summaries
│
├── rpi/                   # Raspberry Pi
│   ├── README.md          # Setup, deploy commands, directory structure
│   └── docker/            # Docker configs per service
│
├── gaming-pc/             # Gaming PC
│   ├── README.md          # Setup, deploy commands, directory structure
│   ├── docker/            # Docker configs
│   ├── scripts/           # PowerShell scripts (metrics-endpoint.ps1)
│   └── docs/              # Setup guides (LibreHardwareMonitor, etc.)
│
├── nas/                   # QNAP NAS
│   ├── README.md          # Setup, SSH notes
│   └── docker/            # Docker configs (Glances)
│
├── macbook/               # MacBook Air M4 (temporary LLM inference)
│   └── README.md          # Ollama setup, brew services notes
│
├── mcp-servers/           # MCP servers (TypeScript, ADR-027)
│   ├── docker-compose.yml # Deploys mcp-homelab + mcp-monitoring
│   ├── Dockerfile         # Multi-stage Node.js build
│   └── src/               # Server source code
│
└── reference/             # Deep-dive docs (read when needed)
    ├── design-principles.md  # Detailed design guidelines (MCP-readiness, modularity)
    ├── adr_appendix.md       # Extended ADR format guide
    ├── persona.md            # User background/preferences
    └── *.md                  # Historical research notes
```

## Finding Credentials

**First:** Read `.env.local` for IPs and usernames. Then check machines for secrets:

| Credential | Location | Command |
|------------|----------|---------|
| NAS password | Gaming PC Immich `.env` | `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "type C:\Server_Data\Docker\immich\.env"` |
| Immich API keys | Pi Homepage `.env` | `ssh <RPI_USER>@<RPI_IP> "cat ~/homepage/.env"` |
| Pi service secrets | Pi `.env` files | `ssh <RPI_USER>@<RPI_IP> "cat ~/SERVICE_NAME/.env"` |
| SMB credentials | Pi home | `ssh <RPI_USER>@<RPI_IP> "cat ~/.smbcredentials"` |

## Quick Reference

**Git remote**: `git@github.com:dancout/lomavo-lab.git`

**Local config**: Copy `.env.local.example` to `.env.local` and fill in your IPs/usernames.

**Service ports** (see `infrastructure/services.md` for full list):
- Homepage: `<RPI_IP>:3000`
- Uptime Kuma: `<RPI_IP>:3001`
- Immich: `<GAMING_PC_IP>:2283`
- Glances: `<RPI_IP>:61208`, `<GAMING_PC_IP>:61208`, `<NAS_IP>:61208`
- metrics-endpoint: `<GAMING_PC_IP>:61209`
- Ollama: `<GAMING_PC_IP>:11434`
- Open WebUI: `<GAMING_PC_IP>:3080`
- mcp-homelab: `<GAMING_PC_IP>:8770`
- mcp-monitoring: `<GAMING_PC_IP>:8771`
