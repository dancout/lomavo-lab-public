/**
 * Shared configuration loaded from environment variables.
 * Values are injected via docker-compose environment or .env files.
 */

export interface MachineConfig {
  name: string;
  ip: string;
  label: string;
}

export interface Config {
  // Machine IPs
  rpiIp: string;
  gamingPcIp: string;
  nasIp: string;

  // Service endpoints
  prometheusUrl: string;
  grafanaUrl: string;
  lokiUrl: string;

  // Immich
  immichUrl: string;
  immichApiKey: string;

  // Pi-hole (two instances, may have different passwords)
  piholePrimaryUrl: string;
  piholeSecondaryUrl: string;
  piholePrimaryPassword: string;
  piholeSecondaryPassword: string;

  // SSH (for mcp-docker)
  rpiUser: string;
  nasUser: string;
  sshKeyPath: string;

  // Repo path (mounted volume for mcp-homelab)
  repoPath: string;

  // All machines for iteration
  machines: MachineConfig[];
}

export function loadConfig(): Config {
  const rpiIp = process.env.RPI_IP || '';
  const gamingPcIp = process.env.GAMING_PC_IP || '';
  const nasIp = process.env.NAS_IP || '';

  return {
    rpiIp,
    gamingPcIp,
    nasIp,

    prometheusUrl: process.env.PROMETHEUS_URL || `http://${nasIp}:9090`,
    grafanaUrl: process.env.GRAFANA_URL || `http://${nasIp}:3030`,
    lokiUrl: process.env.LOKI_URL || `http://${nasIp}:3100`,

    immichUrl: process.env.IMMICH_URL || `http://${gamingPcIp}:2283`,
    immichApiKey: process.env.IMMICH_API_KEY || '',

    piholePrimaryUrl: process.env.PIHOLE_PRIMARY_URL || `http://${rpiIp}`,
    piholeSecondaryUrl: process.env.PIHOLE_SECONDARY_URL || `http://${nasIp}:8089`,
    piholePrimaryPassword: process.env.PIHOLE_PRIMARY_PASSWORD || process.env.PIHOLE_PASSWORD || '',
    piholeSecondaryPassword: process.env.PIHOLE_SECONDARY_PASSWORD || process.env.PIHOLE_PASSWORD || '',

    rpiUser: process.env.RPI_USER || '',
    nasUser: process.env.NAS_USER || '',
    sshKeyPath: process.env.SSH_KEY_PATH || '/ssh/id_rsa',

    repoPath: process.env.REPO_PATH || '/repo',

    machines: [
      { name: 'rpi', ip: rpiIp, label: 'Raspberry Pi' },
      { name: 'gpc', ip: gamingPcIp, label: 'Gaming PC' },
      { name: 'nas', ip: nasIp, label: 'QNAP NAS' },
    ],
  };
}
