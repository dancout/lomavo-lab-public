/**
 * Typed HTTP client for Paperless-ngx REST API.
 * Wraps the shared http-client with Paperless auth headers.
 */

import { httpGet } from '../shared/http-client.js';

export interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  created: string;
  modified: string;
  added: string;
  correspondent: number | null;
  document_type: number | null;
  tags: number[];
  archive_serial_number: number | null;
  original_file_name: string;
}

interface PaperlessListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface PaperlessNamedItem {
  id: number;
  name: string;
}

export interface PaperlessStats {
  documents_total: number;
  documents_inbox: number;
}

export class PaperlessClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private headers(): Record<string, string> {
    return { Authorization: `Token ${this.token}` };
  }

  async listDocuments(params?: {
    tags?: number[];
    correspondent?: number;
    document_type?: number;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaperlessListResponse<PaperlessDocument>> {
    const query: Record<string, string> = {};
    if (params?.tags?.length) query.tags__id__all = params.tags.join(',');
    if (params?.correspondent) query.correspondent__id = String(params.correspondent);
    if (params?.document_type) query.document_type__id = String(params.document_type);
    if (params?.ordering) query.ordering = params.ordering;
    query.page = String(params?.page || 1);
    query.page_size = String(params?.page_size || 25);

    const resp = await httpGet<PaperlessListResponse<PaperlessDocument>>(
      `${this.baseUrl}/api/documents/`,
      query,
      this.headers(),
    );
    return resp.data;
  }

  async getDocument(id: number): Promise<PaperlessDocument> {
    const resp = await httpGet<PaperlessDocument>(
      `${this.baseUrl}/api/documents/${id}/`,
      undefined,
      this.headers(),
    );
    return resp.data;
  }

  async getAllDocumentIds(): Promise<number[]> {
    const ids: number[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const resp = await this.listDocuments({ page, page_size: 100, ordering: 'id' });
      ids.push(...resp.results.map((d) => d.id));
      hasMore = resp.next !== null;
      page++;
    }

    return ids;
  }

  async listTags(): Promise<PaperlessNamedItem[]> {
    const resp = await httpGet<PaperlessListResponse<PaperlessNamedItem>>(
      `${this.baseUrl}/api/tags/`,
      { page_size: '1000' },
      this.headers(),
    );
    return resp.data.results;
  }

  async listCorrespondents(): Promise<PaperlessNamedItem[]> {
    const resp = await httpGet<PaperlessListResponse<PaperlessNamedItem>>(
      `${this.baseUrl}/api/correspondents/`,
      { page_size: '1000' },
      this.headers(),
    );
    return resp.data.results;
  }

  async listDocumentTypes(): Promise<PaperlessNamedItem[]> {
    const resp = await httpGet<PaperlessListResponse<PaperlessNamedItem>>(
      `${this.baseUrl}/api/document_types/`,
      { page_size: '1000' },
      this.headers(),
    );
    return resp.data.results;
  }

  async getStatistics(): Promise<PaperlessStats> {
    const resp = await httpGet<PaperlessStats>(
      `${this.baseUrl}/api/statistics/`,
      undefined,
      this.headers(),
    );
    return resp.data;
  }
}
