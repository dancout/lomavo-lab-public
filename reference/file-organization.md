# File Organization

Repository structure for the lomavo homelab documentation.

```
├── .claude/
│   ├── agents/            # Specialized Claude Code agents
│   │   ├── researcher.md  # Read-only investigation (haiku)
│   │   ├── monitor.md     # Health checks & diagnostics (haiku)
│   │   ├── documenter.md  # Documentation updates (sonnet)
│   │   └── deployer.md    # Service deployment (sonnet)
│   └── skills/            # Reusable workflow skills
│       ├── next-task/SKILL.md  # Autonomous task execution
│       ├── commit/SKILL.md     # Pre-commit doc verification
│       ├── doc-update/SKILL.md # Post-change documentation sync
│       ├── new-service/SKILL.md # Full deployment checklist
│       └── branch/SKILL.md     # Feature branch lifecycle
├── CLAUDE.md              # Claude Code instructions (start here)
├── CONTRIBUTING.md        # Feature completion checklist
├── GETTING_STARTED.md     # Onboarding guide for new users / forkers
├── HOMELAB_PROFILE.md.example  # Template for hardware/experience/goals
├── .env.example           # Template for local IPs/usernames (copy to .env)
├── next-steps.md          # Current sprint / active tasks
├── completed.md           # Archive of completed work
│
├── archive/               # Original owner's state (populated by setup script)
│   └── README.md          # Explains archived files
│
├── scripts/               # Utility scripts
│   └── new-user-setup.sh  # One-time setup for new users / forkers
│
├── plans/                 # Long-term phased roadmap (split for token efficiency)
│   ├── README.md          # Slim index — phase overview + links to topic files
│   ├── homepage-dashboard.md  # Homepage widgets & dashboard items
│   ├── monitoring.md      # Metrics, alerting, Ollama Prometheus
│   ├── mcp-enhancements.md    # MCP servers, document search, cleanup
│   ├── infrastructure.md  # Network, power management, security
│   ├── ai-and-apps.md     # LLM inference, Home Assistant, Flutter app, Immich
│   ├── phase4-kubernetes.md   # K3s cluster migration
│   └── ideas-and-backlog.md   # Research ideas, cleanup tasks
│
├── infrastructure/        # Cross-machine documentation
│   ├── network.md         # IPs, SSH commands, mounts
│   └── services.md        # Service inventory (what runs where, ports)
│
├── decisions/             # Architecture Decision Records
│   └── README.md          # Index with summaries
│
├── runbooks/              # Incident response and troubleshooting
│   └── README.md          # Index of past incidents
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
│   └── docker/            # Docker configs (Glances, Pi-hole, Grafana, etc.)
│
├── macbook/               # MacBook Air M4 (temporary LLM inference)
│   └── README.md          # Ollama setup, brew services notes
│
├── mcp-servers/           # MCP servers (TypeScript, ADR-027)
│   ├── docker-compose.yml # Deploys all 5 MCP servers
│   ├── Dockerfile         # Multi-stage Node.js build
│   └── src/               # Server source code
│
└── reference/             # Deep-dive docs (read when needed)
    ├── design-principles.md     # Homelab pillars and technical principles
    ├── writing-instructions.md  # Rules for maintaining instructions/memory
    ├── deploy-commands.md       # Quick deploy commands per machine
    ├── file-organization.md     # This file
    ├── credentials.md           # Where to find credentials
    ├── operational-knowledge/   # Version-controlled operational gotchas
    ├── adr_appendix.md          # Extended ADR format guide
    ├── persona.md               # User background/preferences
    └── *.md                     # Historical research notes
```
