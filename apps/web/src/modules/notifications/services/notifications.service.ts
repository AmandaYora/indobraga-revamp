import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

export interface NotificationListParams {
  page?: number;
  limit?: number;
  read?: "all" | "unread" | "read";
  q?: string;
}

export const notificationsService = {
  async list(params?: NotificationListParams) {
    const response = await httpClient.get<ApiData<ContractSchemas["Notification"][]>>(
      API.admin.notifications,
      { params },
    );
    const body = response.data as ApiData<ContractSchemas["Notification"][]>;
    return { items: body.data, meta: body.meta };
  },
  async unreadCount(): Promise<number> {
    const response = await httpClient.get<ApiData<ContractSchemas["UnreadCount"]>>(
      `${API.admin.notifications}/unread-count`,
    );
    return (response.data as ApiData<ContractSchemas["UnreadCount"]>).data.unread_count ?? 0;
  },
  async markRead(id: number | string): Promise<void> {
    await httpClient.post(`${API.admin.notifications}/${id}/read`, {});
  },
  async markAllRead(): Promise<void> {
    await httpClient.post(`${API.admin.notifications}/read-all`, {});
  },
  streamUrl(): string {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    return `${base}${API.admin.notificationsStream}`;
  },
};
