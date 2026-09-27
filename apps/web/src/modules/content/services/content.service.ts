import { httpClient, type ApiData, type PageMeta } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";

export type ContentListStatus = "draft" | "published" | "inactive" | "archived";
export type WritableStatus = "draft" | "published" | "inactive";

export interface ContentListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: ContentListStatus;
  category?: string;
  segment?: string;
  type?: string;
}

export interface ContentListResult<T> {
  items: T[];
  pagination: PageMeta;
}

/**
 * Service konten generik untuk 12 resource (paritas `adminContentApi` legacy).
 */
export const contentService = {
  async list<T>(resource: string, params?: ContentListParams): Promise<ContentListResult<T>> {
    const response = await httpClient.get<ApiData<T[]>>(API.admin.content(resource), { params });
    const body = response.data as ApiData<T[]>;
    const meta = (body.meta ?? { page: 1, limit: 10, total: 0, total_pages: 1 }) as PageMeta;
    return { items: body.data, pagination: meta };
  },
  async detail<T>(resource: string, id: number | string): Promise<T> {
    const response = await httpClient.get<ApiData<T>>(API.admin.contentItem(resource, id));
    return (response.data as ApiData<T>).data;
  },
  async create<T>(resource: string, payload: Record<string, unknown>): Promise<T> {
    const response = await httpClient.post<ApiData<T>>(API.admin.content(resource), payload);
    return (response.data as ApiData<T>).data;
  },
  async update<T>(
    resource: string,
    id: number | string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const response = await httpClient.patch<ApiData<T>>(
      API.admin.contentItem(resource, id),
      payload,
    );
    return (response.data as ApiData<T>).data;
  },
  async updateStatus<T>(resource: string, id: number | string, status: WritableStatus): Promise<T> {
    const response = await httpClient.patch<ApiData<T>>(
      `${API.admin.contentItem(resource, id)}/status`,
      { status },
    );
    return (response.data as ApiData<T>).data;
  },
  async archive<T>(resource: string, id: number | string): Promise<T> {
    const response = await httpClient.patch<ApiData<T>>(
      `${API.admin.contentItem(resource, id)}/archive`,
      {},
    );
    return (response.data as ApiData<T>).data;
  },
  async unarchive<T>(resource: string, id: number | string): Promise<T> {
    const response = await httpClient.patch<ApiData<T>>(
      `${API.admin.contentItem(resource, id)}/unarchive`,
      {},
    );
    return (response.data as ApiData<T>).data;
  },
  /** Hapus permanen; `cleanup_failed_media_count` dipakai teks toast (paritas legacy). */
  async remove(
    resource: string,
    id: number | string,
  ): Promise<{ cleanup_failed_media_count?: number | null }> {
    const response = await httpClient.delete<
      ApiData<{ cleanup_failed_media_count?: number | null }>
    >(API.admin.contentItem(resource, id));
    return (
      (response.data as ApiData<{ cleanup_failed_media_count?: number | null } | null>)?.data ?? {}
    );
  },
};
