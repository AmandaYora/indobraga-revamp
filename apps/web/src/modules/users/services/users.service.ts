import { httpClient, type ApiData, type PageMeta } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

type SafeUser = ContractSchemas["SafeUser"];

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

/** Service pengguna admin (paritas `adminUsersApi` legacy). */
export const usersService = {
  async list(params?: UserListParams): Promise<{ items: SafeUser[]; pagination: PageMeta }> {
    const response = await httpClient.get<ApiData<SafeUser[]>>(API.admin.users, { params });
    const body = response.data as ApiData<SafeUser[]>;
    return {
      items: body.data,
      pagination: (body.meta ?? { page: 1, limit: 10, total: 0, total_pages: 1 }) as PageMeta,
    };
  },
  async create(payload: ContractSchemas["CreateUserInput"]): Promise<SafeUser> {
    const response = await httpClient.post<ApiData<SafeUser>>(API.admin.users, payload);
    return (response.data as ApiData<SafeUser>).data;
  },
  async update(id: number, payload: ContractSchemas["UpdateUserInput"]): Promise<SafeUser> {
    const response = await httpClient.patch<ApiData<SafeUser>>(`${API.admin.users}/${id}`, payload);
    return (response.data as ApiData<SafeUser>).data;
  },
  async updateStatus(id: number, status: "active" | "inactive"): Promise<SafeUser> {
    const response = await httpClient.patch<ApiData<SafeUser>>(`${API.admin.users}/${id}/status`, {
      status,
    });
    return (response.data as ApiData<SafeUser>).data;
  },
  async remove(id: number): Promise<void> {
    await httpClient.delete(`${API.admin.users}/${id}`);
  },
};
