# QNAP NAS Quirks

Operational knowledge for running Docker on QNAP NAS. These are platform-specific behaviors that differ from standard Linux Docker hosts.

## Docker Setup

- Docker binary lives at `/share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker`
- Must set `DOCKER_HOST=unix:///var/run/system-docker.sock` — the default socket path doesn't work
- Add docker to PATH before any docker commands
- Full command prefix: `export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose ...`
- Config convention: `/share/CACHEDEV1_DATA/docker/<service>/`

## Environment Variable Gotcha

`DOCKER_HOST=val && docker ps` does **not** pass the env var to docker — it sets the var in the shell but the `&&` starts a new command context. Use inline form: `DOCKER_HOST=val docker ps` (no `&&` separator). Or `export` first.

## BusyBox Environment

QNAP runs BusyBox instead of full GNU coreutils. Some standard flags don't work:
- `free -h` fails — use `free -m` instead
- Other commands may have reduced flag sets

## Docker Build Fails

`docker build` and `docker compose build` fail with "mkdir homes: permission denied." This is a QNAP filesystem permissions issue with no known fix.

**Workaround:** Build on another ARM64 machine (e.g., Raspberry Pi), `docker save | gzip`, SCP to NAS, `docker load`. Always use `image:` in NAS compose files instead of `build:`.

## sysctl Persistence

QNAP has no `/etc/sysctl.conf` or `sysctl.d` — kernel parameters don't persist across reboots. The NAS user typically lacks passwordless sudo.

**Solution:** A `sysctl-init` one-shot container using `nsenter -t 1 -m -u -i -n sysctl -w ...` to set host sysctls.

**Gotcha:** Docker `sysctls:` directive does NOT work with `network_mode: host` (OCI runtime error). Docker `--privileged` sysctl only changes the container namespace — must use nsenter with `--pid=host` to affect the host.

**Reboot gotcha:** `sysctl-init` uses `restart: "no"`. After NAS reboot, Docker restarts `unless-stopped` containers but does NOT re-run one-shot containers. Must manually run `docker compose up -d sysctl-init` then restart dependent services.

## /share/homes Symlink

`/share/homes` is normally a symlink to `/share/CACHEDEV1_DATA/homes`. After dirty reboots, this symlink may not be recreated.

**Symptoms:** SSH key auth fails (authorized_keys path doesn't resolve), ssh-copy-id fails with "mkdir .ssh: Permission denied."

**Fix:** `ln -s /share/CACHEDEV1_DATA/homes /share/homes`

## Container Directory Permissions

New data directories for containers need `chmod 777` before first use. Common UIDs:
- Prometheus: `nobody` (UID 65534)
- Grafana: UID 472

Without correct permissions: containers crash-loop with "permission denied."

## Port 53 Conflict

QNAP runs internal DNS on container network interfaces. Port 53 is free on the main NAS IP — bind services specifically to that IP (both TCP and UDP) to avoid conflicts.
