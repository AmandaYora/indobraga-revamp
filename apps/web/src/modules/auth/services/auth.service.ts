import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<ContractSchemas["AuthUser"]> {
    const response = await httpClient.post<ApiData<{ user: ContractSchemas["AuthUser"] }>>(
      API.auth.login,
      payload,
    );
    return (response.data as ApiData<{ user: ContractSchemas["AuthUser"] }>).data.user;
  },
  async me(): Promise<ContractSchemas["AuthUser"]> {
    const response = await httpClient.get<ApiData<{ user: ContractSchemas["AuthUser"] }>>(
      API.auth.me,
    );
    return (response.data as ApiData<{ user: ContractSchemas["AuthUser"] }>).data.user;
  },
  async logout(): Promise<void> {
    await httpClient.post(API.auth.logout, {});
  },
};
