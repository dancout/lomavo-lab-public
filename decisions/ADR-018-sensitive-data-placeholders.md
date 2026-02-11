# ADR-018: Sensitive Data Placeholders for Public Sharing

**Status:** Accepted
**Date:** 2026-02-01

## Context

The lomavo-lab repository was being prepared for potential public sharing (e.g., GitHub public repo, blog posts, sharing with other homelabbers). The repository contained hardcoded sensitive information throughout documentation and configuration files:

- IP addresses (internal RFC1918 addresses)
- Usernames (SSH/SMB usernames for each machine)
- Domain names (personal domain and subdomains)

While this information isn't highly sensitive (internal IPs, no passwords), exposing it:
1. Reveals network topology to potential attackers
2. Makes the repo less reusable as a template for others
3. Could be combined with other information for social engineering

## Decision

Replace all hardcoded sensitive values with placeholders and store actual values in a gitignored `.env.local` file.

### Placeholder Convention

| Placeholder | Used For |
|-------------|----------|
| `<RPI_IP>` | Raspberry Pi IP address |
| `<GAMING_PC_IP>` | Gaming PC IP address |
| `<NAS_IP>` | QNAP NAS IP address |
| `<RPI_USER>` | Raspberry Pi SSH username |
| `<GAMING_PC_USER>` | Gaming PC SSH username |
| `<NAS_USER>` | NAS SSH/SMB username |
| `<DOMAIN>` | Personal domain |
| `<STATUS_URL>` | Uptime Kuma public URL |
| `<PHOTOS_URL>` | Immich public URL |

### Files Updated

**Documentation files** - replaced all hardcoded values with placeholders:
- Machine READMEs (`rpi/README.md`, `gaming-pc/README.md`)
- Infrastructure docs (`infrastructure/services.md`, `infrastructure/network.md`)
- ADRs (all that contained specific values)
- Implementation plans (`*-implementation-plan.md`, `*-migration-plan.md`)
- Reference docs and notes

**Configuration files** - use environment variable substitution:
- `rpi/docker/homepage/docker-compose.yml` - uses `${HOMEPAGE_ALLOWED_HOSTS}`
- `rpi/docker/homepage/config/services.yaml` - uses `{{HOMEPAGE_VAR_*}}` templating for all IPs
- `rpi/docker/immich-jobs-proxy/docker-compose.yml` - uses `${IMMICH_URL}`

### Revised Decision: Complete Consistency

Initially, deployment configs (services.yaml, docker-compose files) were left with hardcoded values because they "need real values to function." However, this created an inconsistent state where documentation was anonymized but configs were not.

**The "all or nothing" decision:** After discussion, we chose to complete the anonymization rather than leave it half-done. Reasoning:

1. **Half-done is the worst state** - Inconsistency creates confusion about which files follow which pattern
2. **The hard part was done** - Documentation updates were complete; parameterizing configs was straightforward
3. **Tech debt compounds** - Future service additions would face the same "hardcode or not?" decision
4. **Anonymity was explicitly requested** - This is now a documented project principle (see `reference/design-principles.md`)

**Implementation for deployment configs:**
- Homepage services.yaml uses `{{HOMEPAGE_VAR_RPI_IP}}`, `{{HOMEPAGE_VAR_GAMING_PC_IP}}`, etc.
- These are populated from `~/homepage/.env` on the Pi at runtime
- immich-jobs-proxy uses standard docker-compose `${VAR}` substitution

### Storage of Actual Values

**Template file** (committed): `.env.local.example`
- Shows all required variables
- Contains placeholder/example values
- Serves as documentation

**Actual values** (gitignored): `.env.local`
- Contains real IPs, usernames, domains
- Referenced by CLAUDE.md for automation
- Never committed to version control

## Consequences

**Positive:**
- Repository safe for public sharing
- Serves as reusable template for others setting up similar homelabs
- Reduces attack surface (no network topology exposed)
- Cleaner separation of config from sensitive data

**Negative:**
- Claude Code must look up values in `.env.local` instead of seeing them inline - minor efficiency impact
- New contributors must create their own `.env.local` from template
- Deploying configs requires ensuring `.env` files exist with correct values on target machines
- Slightly more complex deployment process (but documented in service READMEs)

**Git History Note:**
Previous commits still contain the hardcoded values. If the repository is made public:
- Consider rotating any exposed credentials (though none were passwords)
- Accept that historical IPs are visible (low risk for internal network)
- Alternative: rewrite git history (destructive, not recommended unless necessary)

## Related

- ADR-002: Environment Variables for Docker Secrets (similar pattern for service secrets)
- ADR-003: Machine-Specific Directory Structure
- ADR-010: Homepage Services Configuration Templating (established `{{HOMEPAGE_VAR_*}}` pattern)
- `reference/design-principles.md` - Anonymity documented as principle #5
- `.env.local.example` - Template for repo-level local configuration
- `rpi/docker/homepage/.env.example` - Template for Homepage-specific variables
