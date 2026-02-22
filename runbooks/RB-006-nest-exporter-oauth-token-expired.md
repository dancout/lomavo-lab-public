# RB-006: Nest Exporter OAuth Refresh Token Revoked

**Date**: 2026-02-19
**Machine**: Raspberry Pi (Docker)
**Service**: nest-exporter (port 9102)
**Impact**: Nest thermostat metrics missing from Prometheus/Grafana; two alerts firing

## Symptoms

- Grafana: `Scrape Target Down (critical)` for `nest-thermostat`
- Grafana: `Nest Metrics Missing (warning)`
- `curl http://<RPI_IP>:9102/metrics` returns `# error: HTTP Error 400: Bad Request`
- Container is running (`docker ps` shows `Up N days`), just returning 500s to Prometheus
- `/health` endpoint responds but returns `{"status": "no_data"}`
- Restarting the container does NOT fix it

## Root Cause

The Google OAuth refresh token was **explicitly revoked**, confirmed by the actual Google error response:

```json
{ "error": "invalid_grant", "error_description": "Token has been expired or revoked." }
```

The GCP OAuth consent screen was already in **"In production"** status (not "Testing"), so the 7-day expiry for Testing apps did not apply. This was a revocation event, not a scheduled expiry.

**Likely trigger**: Using Alexa to control the Nest shortly before the failure. Alexa's Google Home integration uses its own OAuth flow, and re-linking or re-authorizing Alexa's access to Google can sometimes trigger a broader Google account session event that revokes third-party app tokens. The `invalid_grant` error indicates the token was invalidated server-side, not that it aged out.

**Why the container stays "Up" but fails**: The server process is healthy; the upstream Google API call fails. `server.py` catches the `HTTPError` and returns a 500 to Prometheus with the error text in the body. The exporter retries the token refresh every 60 seconds (since `_access_token` is `None` after a failed refresh), but cannot recover without a valid refresh token.

**Note on the GCP "state parameter" warning**: GCP Project Checkup may show a warning that the OAuth client is not using the `state` parameter. This is a CSRF security recommendation for the authorization URL — it does not affect token validity or cause revocations. Ignore it.

## What Does NOT Cause This

- The Nest thermostat mode (OFF, HEAT, COOL) — mode changes don't affect OAuth credentials
- Container restart — the 400 comes from Google, not from container state
- Pi health or connectivity — other Pi exporters are unaffected
- GCP app publishing status — the app being "In production" means no 7-day expiry, but revocation can still happen

## Diagnosis Steps

1. Check Grafana alerts or Prometheus scrape targets — `nest-thermostat` will be DOWN
2. Curl the endpoint directly:
   ```bash
   curl http://<RPI_IP>:9102/metrics
   # Returns: # error: HTTP Error 400: Bad Request
   ```
3. Check container is running but not crashing:
   ```bash
   ssh <RPI_USER>@<RPI_IP> "docker ps | grep nest"
   # Should show "Up N days" — container is NOT in a restart loop
   ```
4. Check logs for broken pipe errors (these are Prometheus scraping and getting 500s — secondary symptom, not root cause):
   ```bash
   ssh <RPI_USER>@<RPI_IP> "docker logs nest-exporter --tail 20"
   ```
5. Confirm restart doesn't help — if still 400 after restart, it's a credential issue
6. **Get the actual Google error** (the server only surfaces `HTTP Error 400`, not the body). Run this on the Pi to see if it's `invalid_grant` vs `invalid_client`:
   ```bash
   ssh <RPI_USER>@<RPI_IP> "cd ~/nest-exporter && python3 - <<'EOF'
   import urllib.request, urllib.parse, urllib.error, json
   from dotenv import dotenv_values
   env = dotenv_values('.env')
   data = urllib.parse.urlencode({'client_id': env['GOOGLE_CLIENT_ID'], 'client_secret': env['GOOGLE_CLIENT_SECRET'], 'refresh_token': env['GOOGLE_REFRESH_TOKEN'], 'grant_type': 'refresh_token'}).encode()
   try:
       req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
       with urllib.request.urlopen(req, timeout=10) as resp:
           print('SUCCESS')
   except urllib.error.HTTPError as e:
       print(e.read().decode())
   EOF"
   ```
   - `invalid_grant` → refresh token was revoked (follow fix below)
   - `invalid_client` → CLIENT_ID or CLIENT_SECRET changed (update `.env` from GCP Console)

## Fix: Regenerate the Refresh Token

The `SDM_PROJECT_ID`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` are still valid — only the `GOOGLE_REFRESH_TOKEN` needs to be regenerated. Follow the OAuth authorization flow from ADR-028:

### Step 1: Get a new authorization code

Build this URL (substitute your client ID and SDM project ID from the Pi's `.env`):

```
https://nestservices.google.com/partnerconnections/<SDM_PROJECT_ID>/auth
  ?redirect_uri=https://www.google.com
  &access_type=offline
  &response_type=code
  &scope=https://www.googleapis.com/auth/sdm.service
  &client_id=<GOOGLE_CLIENT_ID>
```

Open it in a browser, authorize, and copy the `code=` parameter from the redirect URL.

### Step 2: Exchange the code for a refresh token (on the Pi)

Run this on the Pi — it reads `CLIENT_ID` and `CLIENT_SECRET` from the stored `.env` so they never need to leave the machine:

```bash
ssh <RPI_USER>@<RPI_IP> "cd ~/nest-exporter && python3 - <<'EOF'
import urllib.request, urllib.parse, urllib.error, json
from dotenv import dotenv_values
env = dotenv_values('.env')
data = urllib.parse.urlencode({
    'client_id': env['GOOGLE_CLIENT_ID'],
    'client_secret': env['GOOGLE_CLIENT_SECRET'],
    'code': '<AUTH_CODE_FROM_STEP_1>',
    'grant_type': 'authorization_code',
    'redirect_uri': 'https://www.google.com',
}).encode()
try:
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.load(resp)
    print('refresh_token:', result.get('refresh_token', 'NOT FOUND'))
except urllib.error.HTTPError as e:
    print('Error:', e.read().decode())
EOF"
```

Copy the `refresh_token` value from the output.

### Step 3: Update the `.env` on the Pi

```bash
ssh <RPI_USER>@<RPI_IP> "cd ~/nest-exporter && sed -i 's|^GOOGLE_REFRESH_TOKEN=.*|GOOGLE_REFRESH_TOKEN=<NEW_TOKEN>|' .env && docker compose up -d"
```

### Step 4: Verify recovery

```bash
curl http://<RPI_IP>:9102/metrics
# Should return Prometheus metrics, not an error
```

Grafana alerts should clear within ~5 minutes once Prometheus scrapes successfully.

## Self-Recovery Limitation

The exporter **cannot self-heal** from a revoked refresh token. This is by design in Google's OAuth security model:
- Access tokens (1-hour lifetime) are auto-refreshed by the exporter — this works fine
- Refresh tokens require a browser-based consent flow to regenerate — cannot be automated

The exporter correctly retries the token refresh every 60 seconds, so it recovers immediately after the new refresh token is deployed — no container restart needed (though harmless).

## Prevention

The GCP app is already "In production" — no 7-day expiry applies. Revocations are event-driven:

- **Google account password change** → all tokens revoked
- **Alexa/Google Home re-linking** → may trigger a broader session event that revokes third-party tokens
- **Manually revoking app access** in Google Account → Security → Third-party apps

**Best practice**: After any Alexa-Google re-link or Google account security change, proactively check `curl http://<RPI_IP>:9102/metrics` to confirm metrics are still flowing before alerts fire.

The existing `Nest Metrics Missing` alert will fire within 5 minutes if it does break — recovery takes ~10 minutes once the new token is deployed.

## Related

- ADR-028: Nest Thermostat Monitoring via Custom Exporter (setup instructions, SDM API background)
- `rpi/docker/nest-exporter/.env.example` — credential reference
