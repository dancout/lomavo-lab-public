/**
 * mcp-immich: Search photos, manage albums, and control jobs via the Immich API.
 *
 * Tools:
 * - search_photos: Smart/CLIP text search for photos
 * - search_metadata: Search by metadata fields (filename, city, camera, date)
 * - get_server_stats: Overall server statistics
 * - list_albums: List all albums
 * - get_album: Get album details with asset list
 * - list_jobs: List job queue status
 * - run_job: Start/pause/resume/empty a job queue
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig } from '../shared/config.js';
import { httpGet, httpPost, httpPut } from '../shared/http-client.js';
import { startServer } from '../shared/server-factory.js';

const config = loadConfig();

function authHeaders(): Record<string, string> {
  return { 'x-api-key': config.immichApiKey };
}

// --- Immich types ---

interface ImmichAsset {
  id: string;
  originalFileName: string;
  type: string;
  fileCreatedAt: string;
  exifInfo?: {
    city?: string;
    state?: string;
    country?: string;
    make?: string;
    model?: string;
    description?: string;
  };
}

interface ImmichSearchResponse {
  assets: {
    items: ImmichAsset[];
    total: number;
    count: number;
    nextPage?: string;
  };
}

interface ImmichAlbum {
  id: string;
  albumName: string;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
  shared: boolean;
}

interface ImmichServerStats {
  photos: number;
  videos: number;
  usage: number;
  usageByUser: { userId: string; userName: string; photos: number; videos: number; usage: number }[];
}

interface ImmichJobQueue {
  jobCounts: { active: number; completed: number; failed: number; delayed: number; waiting: number; paused: number };
  queueStatus: { isActive: boolean; isPaused: boolean };
}

function formatAsset(a: ImmichAsset): string {
  const date = a.fileCreatedAt ? new Date(a.fileCreatedAt).toLocaleDateString() : 'unknown';
  const location = [a.exifInfo?.city, a.exifInfo?.state, a.exifInfo?.country]
    .filter(Boolean)
    .join(', ');
  const camera = [a.exifInfo?.make, a.exifInfo?.model].filter(Boolean).join(' ');
  const parts = [`${a.originalFileName} (${date}) [${a.type}]`];
  if (location) parts.push(`Location: ${location}`);
  if (camera) parts.push(`Camera: ${camera}`);
  parts.push(`ID: ${a.id}`);
  return parts.join(' | ');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function registerTools(server: McpServer): void {
  server.tool(
    'search_photos',
    'Search photos by text description using AI/CLIP (e.g. "sunset at the beach", "dog playing in snow")',
    {
      query: z.string().describe('Natural language search query'),
      page: z.number().optional().describe('Page number (default: 1)'),
      size: z.number().optional().describe('Results per page (default: 20, max: 100)'),
    },
    async ({ query, page, size }) => {
      try {
        const resp = await httpPost<ImmichSearchResponse>(
          `${config.immichUrl}/api/search/smart`,
          { query, page: page || 1, size: Math.min(size || 20, 100) },
          authHeaders(),
        );

        const assets = resp.data?.assets?.items || [];
        if (assets.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No photos found matching your query.' }] };
        }

        const total = resp.data?.assets?.total || assets.length;
        const lines = [`Found ${total} results (showing ${assets.length}):\n`];
        lines.push(...assets.map((a, i) => `${i + 1}. ${formatAsset(a)}`));

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Search failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'search_metadata',
    'Search photos by metadata fields (filename, city, state, country, camera make/model, date range)',
    {
      originalFileName: z.string().optional().describe('Filename pattern to match'),
      city: z.string().optional().describe('City name from EXIF data'),
      state: z.string().optional().describe('State/region from EXIF data'),
      country: z.string().optional().describe('Country from EXIF data'),
      make: z.string().optional().describe('Camera manufacturer (e.g. "Apple", "Canon")'),
      model: z.string().optional().describe('Camera model (e.g. "iPhone 15 Pro")'),
      takenAfter: z.string().optional().describe('Only photos taken after this date (ISO 8601)'),
      takenBefore: z.string().optional().describe('Only photos taken before this date (ISO 8601)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      size: z.number().optional().describe('Results per page (default: 20)'),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.originalFileName) body.originalFileName = params.originalFileName;
        if (params.city) body.city = params.city;
        if (params.state) body.state = params.state;
        if (params.country) body.country = params.country;
        if (params.make) body.make = params.make;
        if (params.model) body.model = params.model;
        if (params.takenAfter) body.takenAfter = params.takenAfter;
        if (params.takenBefore) body.takenBefore = params.takenBefore;
        body.page = params.page || 1;
        body.size = Math.min(params.size || 20, 100);

        const resp = await httpPost<ImmichSearchResponse>(
          `${config.immichUrl}/api/search/metadata`,
          body,
          authHeaders(),
        );

        const assets = resp.data?.assets?.items || [];
        if (assets.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No photos found matching your criteria.' }] };
        }

        const total = resp.data?.assets?.total || assets.length;
        const lines = [`Found ${total} results (showing ${assets.length}):\n`];
        lines.push(...assets.map((a, i) => `${i + 1}. ${formatAsset(a)}`));

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Metadata search failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_server_stats',
    'Get Immich server statistics (total photos, videos, storage usage)',
    {},
    async () => {
      try {
        const resp = await httpGet<ImmichServerStats>(
          `${config.immichUrl}/api/server/statistics`,
          undefined,
          authHeaders(),
        );

        const stats = resp.data;
        const lines = [
          '### Immich Server Statistics',
          `  Photos: ${stats.photos.toLocaleString()}`,
          `  Videos: ${stats.videos.toLocaleString()}`,
          `  Total storage: ${formatBytes(stats.usage)}`,
        ];

        if (stats.usageByUser?.length > 0) {
          lines.push('\n### By User:');
          for (const u of stats.usageByUser) {
            lines.push(
              `  ${u.userName}: ${u.photos} photos, ${u.videos} videos (${formatBytes(u.usage)})`,
            );
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_albums',
    'List all Immich albums with asset counts',
    {
      shared: z.boolean().optional().describe('Filter to shared (true) or non-shared (false) albums'),
    },
    async ({ shared }) => {
      try {
        const params: Record<string, string> = {};
        if (shared !== undefined) params.shared = String(shared);

        const resp = await httpGet<ImmichAlbum[]>(
          `${config.immichUrl}/api/albums`,
          params,
          authHeaders(),
        );

        const albums = resp.data;
        if (!Array.isArray(albums) || albums.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No albums found.' }] };
        }

        const lines = [`Found ${albums.length} albums:\n`];
        for (const album of albums) {
          const shared = album.shared ? ' [shared]' : '';
          const updated = new Date(album.updatedAt).toLocaleDateString();
          lines.push(`- ${album.albumName} (${album.assetCount} assets, updated ${updated})${shared} [id:${album.id}]`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to list albums: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_album',
    'Get details of a specific album including its assets',
    {
      albumId: z.string().describe('Album ID (UUID)'),
    },
    async ({ albumId }) => {
      try {
        const resp = await httpGet<ImmichAlbum & { assets: ImmichAsset[] }>(
          `${config.immichUrl}/api/albums/${albumId}`,
          undefined,
          authHeaders(),
        );

        const album = resp.data;
        const lines = [
          `### Album: ${album.albumName}`,
          `  Assets: ${album.assetCount}`,
          `  Shared: ${album.shared ? 'Yes' : 'No'}`,
          `  Created: ${new Date(album.createdAt).toLocaleDateString()}`,
          `  Updated: ${new Date(album.updatedAt).toLocaleDateString()}`,
        ];

        if (album.assets?.length > 0) {
          lines.push(`\n### Assets (first ${Math.min(album.assets.length, 50)}):`);
          for (const asset of album.assets.slice(0, 50)) {
            lines.push(`  - ${formatAsset(asset)}`);
          }
          if (album.assets.length > 50) {
            lines.push(`  ... and ${album.assets.length - 50} more`);
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get album: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_jobs',
    'List Immich job queue status (thumbnail generation, metadata extraction, etc.)',
    {},
    async () => {
      try {
        const resp = await httpGet<Record<string, ImmichJobQueue>>(
          `${config.immichUrl}/api/jobs`,
          undefined,
          authHeaders(),
        );

        const jobs = resp.data;
        const lines = ['### Immich Job Queues\n'];

        for (const [name, queue] of Object.entries(jobs)) {
          const status = queue.queueStatus.isPaused
            ? 'PAUSED'
            : queue.queueStatus.isActive
              ? 'ACTIVE'
              : 'IDLE';
          const counts = queue.jobCounts;
          const details = [
            counts.active > 0 ? `${counts.active} active` : null,
            counts.waiting > 0 ? `${counts.waiting} waiting` : null,
            counts.failed > 0 ? `${counts.failed} failed` : null,
            counts.delayed > 0 ? `${counts.delayed} delayed` : null,
          ]
            .filter(Boolean)
            .join(', ');
          lines.push(`[${status}] ${name}: ${details || 'empty'}`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to list jobs: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'run_job',
    'Command an Immich job queue (start, pause, resume, or empty). Job names: thumbnailGeneration, metadataExtraction, videoConversion, faceDetection, facialRecognition, smartSearch, sidecar, library, migration, search, duplicateDetection, backgroundTask, storageTemplateMigration',
    {
      jobName: z.string().describe('Job queue name (e.g. "thumbnailGeneration", "metadataExtraction")'),
      command: z.enum(['start', 'pause', 'resume', 'empty']).describe('Job command'),
      force: z.boolean().optional().describe('Force re-run on all assets (only for "start" command, default: false)'),
    },
    async ({ jobName, command, force }) => {
      try {
        const body: Record<string, unknown> = { command };
        if (command === 'start' && force) body.force = true;

        const resp = await httpPut<unknown>(
          `${config.immichUrl}/api/jobs/${jobName}`,
          body,
          authHeaders(),
        );

        if (resp.status >= 400) {
          return {
            content: [{ type: 'text' as const, text: `Job command failed (HTTP ${resp.status}): ${JSON.stringify(resp.data)}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text' as const, text: `Successfully sent "${command}" to ${jobName} job queue.` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to run job: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );
}

const PORT = parseInt(process.env.PORT || '8772', 10);

startServer({
  name: 'mcp-immich',
  version: '1.0.0',
  port: PORT,
  registerTools,
});
