/**
 * mcp-docker: Manage Docker containers across all homelab machines.
 *
 * Execution strategy:
 * - Gaming PC (local): Docker CLI via mounted socket (/var/run/docker.sock)
 * - Raspberry Pi: SSH + docker commands
 * - QNAP NAS: SSH + docker with special PATH/DOCKER_HOST prefix
 *
 * Tools:
 * - list_containers: List all containers on a machine
 * - get_container_logs: View recent logs from a container
 * - restart_container: Restart a named container
 * - get_system_info: Docker system information
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig } from '../shared/config.js';
import { startServer } from '../shared/server-factory.js';

const execFileAsync = promisify(execFile);
const config = loadConfig();

/** NAS needs special PATH for docker binary and DOCKER_HOST for the socket.
 *  DOCKER_HOST is set inline with the docker command (not exported) so it's
 *  passed directly to the docker process. */
const NAS_PATH_EXPORT = 'export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:$PATH';
const NAS_DOCKER_HOST = 'DOCKER_HOST=unix:///var/run/system-docker.sock';

/** Validate container name to prevent command injection in SSH commands. */
function isValidContainerName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name) && name.length <= 128;
}

/** Get SSH connection args for a remote machine. */
function sshArgs(): string[] {
  return [
    '-i', config.sshKeyPath,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ConnectTimeout=10',
    '-o', 'LogLevel=ERROR',
  ];
}

/**
 * Run a Docker command on the specified machine.
 * - gpc: Local Docker CLI (uses mounted socket)
 * - rpi: SSH to Pi, run docker command
 * - nas: SSH to NAS with special Docker path prefix
 */
async function runDockerCommand(
  machine: string,
  dockerArgs: string[],
  timeoutMs = 30000,
): Promise<string> {
  if (machine === 'gpc') {
    const { stdout } = await execFileAsync('docker', dockerArgs, { timeout: timeoutMs });
    return stdout;
  }

  const user = machine === 'rpi' ? config.rpiUser : config.nasUser;
  const ip = machine === 'rpi' ? config.rpiIp : config.nasIp;

  // Build the remote docker command
  const dockerCmd = 'docker ' + dockerArgs.join(' ');
  const remoteCmd = machine === 'nas'
    ? `${NAS_PATH_EXPORT} && ${NAS_DOCKER_HOST} ${dockerCmd}`
    : dockerCmd;

  const { stdout } = await execFileAsync(
    'ssh',
    [...sshArgs(), `${user}@${ip}`, remoteCmd],
    { timeout: timeoutMs },
  );

  return stdout;
}

function getMachineLabel(machine: string): string {
  const m = config.machines.find((m) => m.name === machine);
  return m ? m.label : machine;
}

const machineEnum = z
  .enum(['rpi', 'gpc', 'nas'])
  .describe('Machine: rpi (Raspberry Pi), gpc (Gaming PC), or nas (QNAP NAS)');

function registerTools(server: McpServer): void {
  server.tool(
    'list_containers',
    'List all Docker containers on a machine (running and stopped)',
    {
      machine: machineEnum,
      running_only: z.boolean().optional().describe('Only show running containers (default: false)'),
    },
    async ({ machine, running_only }) => {
      try {
        const args = running_only ? ['ps'] : ['ps', '-a'];
        const output = await runDockerCommand(machine, args);

        return {
          content: [{
            type: 'text' as const,
            text: `### ${getMachineLabel(machine)} Containers\n\n\`\`\`\n${output.trim()}\n\`\`\``,
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to list containers on ${getMachineLabel(machine)}: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_container_logs',
    'View recent logs from a Docker container',
    {
      machine: machineEnum,
      container: z.string().describe('Container name (e.g. "pihole", "prometheus", "mcp-homelab")'),
      lines: z.number().optional().describe('Number of log lines to retrieve (default: 50, max: 500)'),
      since: z.string().optional().describe('Show logs since timestamp or relative time (e.g. "10m", "1h", "2024-01-01T00:00:00")'),
    },
    async ({ machine, container, lines, since }) => {
      if (!isValidContainerName(container)) {
        return {
          content: [{ type: 'text' as const, text: 'Invalid container name. Use only letters, numbers, hyphens, underscores, and dots.' }],
          isError: true,
        };
      }

      try {
        const args = ['logs', '--tail', String(Math.min(lines || 50, 500))];
        if (since) args.push('--since', since);
        args.push(container);

        const output = await runDockerCommand(machine, args, 15000);

        if (!output.trim()) {
          return { content: [{ type: 'text' as const, text: `No logs from ${container} on ${getMachineLabel(machine)}.` }] };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `### Logs: ${container} (${getMachineLabel(machine)})\n\n\`\`\`\n${output.trim()}\n\`\`\``,
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get logs for ${container}: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'restart_container',
    'Restart a Docker container. Use with care - briefly interrupts the service.',
    {
      machine: machineEnum,
      container: z.string().describe('Container name to restart'),
      timeout: z.number().optional().describe('Seconds to wait for graceful stop before killing (default: 10)'),
    },
    async ({ machine, container, timeout }) => {
      if (!isValidContainerName(container)) {
        return {
          content: [{ type: 'text' as const, text: 'Invalid container name. Use only letters, numbers, hyphens, underscores, and dots.' }],
          isError: true,
        };
      }

      try {
        const args = ['restart'];
        if (timeout) args.push('-t', String(timeout));
        args.push(container);

        await runDockerCommand(machine, args, 60000);

        return {
          content: [{ type: 'text' as const, text: `Successfully restarted ${container} on ${getMachineLabel(machine)}.` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to restart ${container}: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_system_info',
    'Get Docker system information for a machine (version, containers count, images, resources)',
    {
      machine: machineEnum,
    },
    async ({ machine }) => {
      try {
        const output = await runDockerCommand(machine, ['system', 'info', '--format', 'json']);

        // Parse JSON and extract key fields
        const info = JSON.parse(output);
        const lines = [
          `### ${getMachineLabel(machine)} Docker Info`,
          `  Docker version: ${info.ServerVersion || 'unknown'}`,
          `  Containers: ${info.Containers || 0} (${info.ContainersRunning || 0} running, ${info.ContainersStopped || 0} stopped)`,
          `  Images: ${info.Images || 0}`,
          `  Storage driver: ${info.Driver || 'unknown'}`,
          `  OS: ${info.OperatingSystem || 'unknown'}`,
          `  Architecture: ${info.Architecture || 'unknown'}`,
          `  CPUs: ${info.NCPU || 'unknown'}`,
          `  Memory: ${info.MemTotal ? (info.MemTotal / 1024 / 1024 / 1024).toFixed(1) + ' GB' : 'unknown'}`,
        ];

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        // Fallback: if JSON format fails, try plain text
        try {
          const output = await runDockerCommand(machine, ['info']);
          return {
            content: [{
              type: 'text' as const,
              text: `### ${getMachineLabel(machine)} Docker Info\n\n\`\`\`\n${output.trim()}\n\`\`\``,
            }],
          };
        } catch (fallbackError) {
          return {
            content: [{ type: 'text' as const, text: `Failed to get Docker info: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    },
  );
}

const PORT = parseInt(process.env.PORT || '8774', 10);

startServer({
  name: 'mcp-docker',
  version: '1.0.0',
  port: PORT,
  registerTools,
});
