import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

/** Service pengaturan situs admin. */
export const settingsService = {
  async get(): Promise<ContractSchemas["SiteSettings"]> {
    const response = await httpClient.get<ApiData<ContractSchemas["SiteSettings"]>>(
      API.admin.siteSettings,
    );
    return (response.data as ApiData<ContractSchemas["SiteSettings"]>).data;
  },
  async update(payload: Record<string, unknown>): Promise<ContractSchemas["SiteSettings"]> {
    const response = await httpClient.patch<ApiData<ContractSchemas["SiteSettings"]>>(
      API.admin.siteSettings,
      payload,
    );
    return (response.data as ApiData<ContractSchemas["SiteSettings"]>).data;
  },
};
