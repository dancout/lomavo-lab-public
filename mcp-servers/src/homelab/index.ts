/**
 * mcp-homelab: Read-only access to the lomavo-lab repository.
 *
 * Tools:
 * - search_files: Find files by glob pattern
 * - read_file: Read a file's contents
 * - search_content: Search file contents by regex
 * - list_services: Get the service inventory
 * - list_decisions: Get the ADR index
 * - get_network_info: Get network configuration
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { glob } from 'glob';
import { z } from 'zod';
import { loadConfig } from '../shared/config.js';
import { startServer } from '../shared/server-factory.js';

const config = loadConfig();
const REPO_ROOT = config.repoPath;

function safeReadFile(filePath: string): string {
  const resolved = join(REPO_ROOT, filePath);
  // Prevent path traversal
  if (!resolved.startsWith(REPO_ROOT)) {
    return 'Error: path traversal not allowed';
  }
  if (!existsSync(resolved)) {
    return `Error: file not found: ${filePath}`;
  }
  return readFileSync(resolved, 'utf-8');
}

function registerTools(server: McpServer): void {
  server.tool(
    'search_files',
    'Search for files in the homelab repo by glob pattern (e.g. "**/*.md", "decisions/ADR-*.md")',
    { pattern: z.string().describe('Glob pattern to match files') },
    async ({ pattern }) => {
      const matches = await glob(pattern, {
        cwd: REPO_ROOT,
        ignore: ['node_modules/**', '.git/**', 'dist/**'],
        nodir: true,
      });
      const sorted = matches.sort();
      return {
        content: [
          {
            type: 'text' as const,
            text:
              sorted.length > 0
                ? `Found ${sorted.length} file(s):\n${sorted.join('\n')}`
                : 'No files matched the pattern.',
          },
        ],
      };
    },
  );

  server.tool(
    'read_file',
    'Read the contents of a file from the homelab repo',
    { path: z.string().describe('Relative path from repo root (e.g. "infrastructure/services.md")') },
    async ({ path }) => {
      const content = safeReadFile(path);
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    },
  );

  server.tool(
    'search_content',
    'Search file contents by regex pattern across the repo',
    {
      pattern: z.string().describe('Regex pattern to search for'),
      file_glob: z
        .string()
        .optional()
        .describe('Optional glob to limit which files to search (default: "**/*")'),
    },
    async ({ pattern, file_glob }) => {
      const files = await glob(file_glob || '**/*', {
        cwd: REPO_ROOT,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '**/*.png', '**/*.jpg'],
        nodir: true,
      });

      const regex = new RegExp(pattern, 'gi');
      const results: string[] = [];

      for (const file of files) {
        try {
          const content = readFileSync(join(REPO_ROOT, file), 'utf-8');
          const lines = content.split('\n');
          const matches: string[] = [];

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              matches.push(`  L${i + 1}: ${lines[i].trim()}`);
              regex.lastIndex = 0; // reset after test
            }
          }

          if (matches.length > 0) {
            results.push(`${file}:\n${matches.join('\n')}`);
          }
        } catch {
          // Skip binary or unreadable files
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text:
              results.length > 0
                ? `Found matches in ${results.length} file(s):\n\n${results.join('\n\n')}`
                : 'No matches found.',
          },
        ],
      };
    },
  );

  server.tool(
    'list_services',
    'Get the full service inventory (what runs where, ports, Docker status)',
    {},
    async () => {
      const content = safeReadFile('infrastructure/services.md');
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    },
  );

  server.tool(
    'list_decisions',
    'Get the Architecture Decision Record (ADR) index with summaries',
    {},
    async () => {
      const content = safeReadFile('decisions/README.md');
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    },
  );

  server.tool(
    'get_network_info',
    'Get network configuration (IPs, SSH commands, mount paths)',
    {},
    async () => {
      const content = safeReadFile('infrastructure/network.md');
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    },
  );

  server.tool(
    'get_next_steps',
    'Get current priorities and active work items',
    {},
    async () => {
      const content = safeReadFile('next-steps.md');
      return {
        content: [{ type: 'text' as const, text: content }],
      };
    },
  );
}

const PORT = parseInt(process.env.PORT || '8770', 10);

startServer({
  name: 'mcp-homelab',
  version: '1.0.0',
  port: PORT,
  registerTools,
});
