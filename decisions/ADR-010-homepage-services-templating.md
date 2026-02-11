# ADR-010: Homepage Services Configuration Templating

**Status:** Accepted
**Date:** 2026-01-30

## Context

Homepage's `services.yaml` configuration file contains sensitive data (API keys for widgets like Immich) and was only stored on the Pi. If the Pi failed, this configuration would be lost. We needed a way to track the configuration in version control without exposing secrets.

Homepage supports environment variable substitution using `{{HOMEPAGE_VAR_*}}` syntax, but the implementation has specific requirements that aren't immediately obvious.

## Decision

### 1. Track services.yaml in Version Control

Store `services.yaml` in `rpi/docker/homepage/config/` with secrets replaced by template variables:

```yaml
# Instead of hardcoded API key
key: {{HOMEPAGE_VAR_IMMICH_API_KEY}}
```

### 2. Use env_file Directive in docker-compose.yml

**Critical finding:** The `{{HOMEPAGE_VAR_*}}` templating only works if the environment variables are passed into the container. Docker Compose's automatic `.env` loading only substitutes `${VAR}` syntax in the compose file itself—it does NOT pass variables to the container.

```yaml
services:
  homepage:
    env_file:
      - .env  # Required for HOMEPAGE_VAR_* to work in services.yaml
    environment:
      - HOMEPAGE_ALLOWED_HOSTS=...  # This uses ${VAR} substitution
```

### 3. Variable Naming Convention

- Variables for Homepage templating must be prefixed with `HOMEPAGE_VAR_`
- Only `HOMEPAGE_VAR_*` variables are available for `{{}}` substitution in config files
- Other variables (like `RPI_IP`) use standard `${VAR}` syntax in docker-compose.yml

## Consequences

**Positive:**
- Configuration is recoverable from version control
- Secrets remain on the Pi in `.env` file (not committed)
- Consistent pattern with other services (ADR-002)
- Clear documentation via `.env.example`

**Negative:**
- Two templating syntaxes: `${VAR}` in docker-compose.yml, `{{HOMEPAGE_VAR_*}}` in services.yaml
- Easy to forget `env_file` directive when setting up new Homepage instances
- Must deploy both docker-compose.yml and config/ directory

**Files affected:**
- `rpi/docker/homepage/docker-compose.yml` - Added `env_file: .env`
- `rpi/docker/homepage/config/services.yaml` - Uses `{{HOMEPAGE_VAR_*}}` syntax
- `rpi/docker/homepage/.env.example` - Documents required variables
- Pi `~/homepage/.env` - Contains actual secret values

## References

- Homepage environment variable docs: https://gethomepage.dev/configs/settings/#environment-variables
- Related: ADR-002 (Environment Variables for Docker Secrets)
