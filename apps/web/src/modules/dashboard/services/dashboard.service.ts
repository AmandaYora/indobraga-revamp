import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

export const dashboardService = {
  async summary(): Promise<ContractSchemas["DashboardSummary"]> {
    const response = await httpClient.get<ApiData<ContractSchemas["DashboardSummary"]>>(
      API.admin.dashboard,
    );
    return (response.data as ApiData<ContractSchemas["DashboardSummary"]>).data;
  },
};
