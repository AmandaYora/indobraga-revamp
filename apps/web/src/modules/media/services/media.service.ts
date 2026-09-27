import { httpClient, type ApiData, type PageMeta } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];

export interface MediaListParams {
  page?: number;
  limit?: number;
  q?: string;
  media_type?: string;
  compression_status?: string;
}

/** Service media (paritas `adminMediaApi` legacy). */
export const mediaService = {
  async list(params?: MediaListParams): Promise<{ items: MediaItem[]; pagination: PageMeta }> {
    const response = await httpClient.get<ApiData<MediaItem[]>>(API.admin.media, { params });
    const body = response.data as ApiData<MediaItem[]>;
    return {
      items: body.data,
      pagination: (body.meta ?? { page: 1, limit: 24, total: 0, total_pages: 1 }) as PageMeta,
    };
  },
  async detail(id: number | string): Promise<MediaItem> {
    const response = await httpClient.get<ApiData<MediaItem>>(API.admin.mediaItem(id));
    return (response.data as ApiData<MediaItem>).data;
  },
  async upload(
    file: File,
    options: { usage: string; alt_text?: string; caption?: string },
  ): Promise<MediaItem> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage", options.usage);
    if (options.alt_text) formData.append("alt_text", options.alt_text);
    if (options.caption) formData.append("caption", options.caption);
    const response = await httpClient.post<ApiData<MediaItem>>(API.admin.media, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return (response.data as ApiData<MediaItem>).data;
  },
  async uploadWithProgress(
    file: File,
    options: { usage: string; alt_text?: string; caption?: string },
    onProgress?: (percent: number) => void,
  ): Promise<MediaItem> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage", options.usage);
    if (options.alt_text) formData.append("alt_text", options.alt_text);
    if (options.caption) formData.append("caption", options.caption);
    const response = await httpClient.post<ApiData<MediaItem>>(API.admin.media, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return (response.data as ApiData<MediaItem>).data;
  },
  async archive(id: number): Promise<MediaItem> {
    const response = await httpClient.patch<ApiData<MediaItem>>(
      `${API.admin.mediaItem(id)}/archive`,
      {},
    );
    return (response.data as ApiData<MediaItem>).data;
  },
  async unarchive(id: number): Promise<MediaItem> {
    const response = await httpClient.patch<ApiData<MediaItem>>(
      `${API.admin.mediaItem(id)}/unarchive`,
      {},
    );
    return (response.data as ApiData<MediaItem>).data;
  },
  async retry(id: number): Promise<MediaItem> {
    const response = await httpClient.post<ApiData<MediaItem>>(
      `${API.admin.mediaItem(id)}/retry`,
      {},
    );
    return (response.data as ApiData<MediaItem>).data;
  },
  async remove(id: number): Promise<void> {
    await httpClient.delete(API.admin.mediaItem(id));
  },
};

export function mediaPreviewUrl(item: MediaItem | null | undefined): string | null {
  if (!item) return null;
  return item.thumbnail_url ?? item.medium_url ?? item.file_url ?? null;
}
