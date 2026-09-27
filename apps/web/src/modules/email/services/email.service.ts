import { httpClient, type ApiData, type PageMeta } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

type EmailAccount = ContractSchemas["EmailAccount"];
type EmailTemplate = ContractSchemas["EmailTemplate"];
type Campaign = ContractSchemas["Campaign"];

async function list<T>(url: string, params?: Record<string, unknown>) {
  const response = await httpClient.get<ApiData<T[]>>(url, { params });
  const body = response.data as ApiData<T[]>;
  return {
    items: body.data,
    pagination: (body.meta ?? { page: 1, limit: 10, total: 0, total_pages: 1 }) as PageMeta,
  };
}

/** Service akun email (paritas `adminEmailAccountsApi` legacy). */
export const emailAccountsService = {
  list(params?: { page?: number; limit?: number; q?: string; provider?: string; status?: string }) {
    return list<EmailAccount>(API.admin.emailAccounts, params);
  },
  async googleOAuthUrl(payload: {
    email_hint?: string;
    display_name?: string;
  }): Promise<ContractSchemas["OAuthUrlResult"]> {
    const response = await httpClient.post<ApiData<ContractSchemas["OAuthUrlResult"]>>(
      `${API.admin.emailAccounts}/google/oauth-url`,
      payload,
    );
    return (response.data as ApiData<ContractSchemas["OAuthUrlResult"]>).data;
  },
  async createSmtp(payload: ContractSchemas["SmtpAccountInput"]): Promise<EmailAccount> {
    const response = await httpClient.post<ApiData<EmailAccount>>(
      `${API.admin.emailAccounts}/smtp`,
      payload,
    );
    return (response.data as ApiData<EmailAccount>).data;
  },
  async update(
    id: number,
    payload: ContractSchemas["UpdateEmailAccountInput"],
  ): Promise<EmailAccount> {
    const response = await httpClient.patch<ApiData<EmailAccount>>(
      `${API.admin.emailAccounts}/${id}`,
      payload,
    );
    return (response.data as ApiData<EmailAccount>).data;
  },
  /** Google → `{authorization_url, state_expires_at}`; SMTP → `{provider:"smtp", valid, account, message}`. */
  async reconnect(id: number): Promise<ContractSchemas["EmailAccountReconnectResult"]> {
    const response = await httpClient.post<ApiData<ContractSchemas["EmailAccountReconnectResult"]>>(
      `${API.admin.emailAccounts}/${id}/reconnect`,
      {},
    );
    return (response.data as ApiData<ContractSchemas["EmailAccountReconnectResult"]>).data;
  },
  async disable(id: number): Promise<EmailAccount> {
    const response = await httpClient.post<ApiData<EmailAccount>>(
      `${API.admin.emailAccounts}/${id}/disable`,
      {},
    );
    return (response.data as ApiData<EmailAccount>).data;
  },
  async remove(id: number): Promise<void> {
    await httpClient.delete(`${API.admin.emailAccounts}/${id}`);
  },
};

/** Service template email. */
export const emailTemplatesService = {
  list(params?: { page?: number; limit?: number; q?: string }) {
    return list<EmailTemplate>(API.admin.emailTemplates, params);
  },
  async create(payload: ContractSchemas["CreateEmailTemplateInput"]): Promise<EmailTemplate> {
    const response = await httpClient.post<ApiData<EmailTemplate>>(
      API.admin.emailTemplates,
      payload,
    );
    return (response.data as ApiData<EmailTemplate>).data;
  },
  async update(
    id: number,
    payload: ContractSchemas["UpdateEmailTemplateInput"],
  ): Promise<EmailTemplate> {
    const response = await httpClient.patch<ApiData<EmailTemplate>>(
      `${API.admin.emailTemplates}/${id}`,
      payload,
    );
    return (response.data as ApiData<EmailTemplate>).data;
  },
  async remove(id: number): Promise<void> {
    await httpClient.delete(`${API.admin.emailTemplates}/${id}`);
  },
};

/** Service kampanye email (paritas `adminEmailCampaignApi` legacy). */
export const emailCampaignsService = {
  list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    email_account_id?: number;
  }) {
    return list<Campaign>(API.admin.emailCampaigns, params);
  },
  async detail(id: number): Promise<Campaign> {
    const response = await httpClient.get<ApiData<Campaign>>(`${API.admin.emailCampaigns}/${id}`);
    return (response.data as ApiData<Campaign>).data;
  },
  async createDraft(
    payload: ContractSchemas["CampaignDraftInput"],
  ): Promise<ContractSchemas["CampaignDraftResult"]> {
    const response = await httpClient.post<ApiData<ContractSchemas["CampaignDraftResult"]>>(
      `${API.admin.emailCampaigns}/draft`,
      payload,
    );
    return (response.data as ApiData<ContractSchemas["CampaignDraftResult"]>).data;
  },
  async update(id: number, payload: Record<string, unknown>): Promise<Campaign> {
    const response = await httpClient.patch<ApiData<Campaign>>(
      `${API.admin.emailCampaigns}/${id}`,
      payload,
    );
    return (response.data as ApiData<Campaign>).data;
  },
  async send(id: number): Promise<Campaign> {
    const response = await httpClient.post<ApiData<Campaign>>(
      `${API.admin.emailCampaigns}/${id}/send`,
      {},
    );
    return (response.data as ApiData<Campaign>).data;
  },
  async resendFailed(id: number): Promise<Campaign> {
    const response = await httpClient.post<ApiData<Campaign>>(
      `${API.admin.emailCampaigns}/${id}/resend-failed`,
      {},
    );
    return (response.data as ApiData<Campaign>).data;
  },
  async recipients(
    id: number,
    params?: { page?: number; limit?: number; q?: string; status?: string },
  ) {
    return list<ContractSchemas["CampaignRecipient"]>(
      `${API.admin.emailCampaigns}/${id}/recipients`,
      params,
    );
  },
  async logs(id: number, params?: { page?: number; limit?: number; status?: string }) {
    return list<ContractSchemas["CampaignLog"]>(`${API.admin.emailCampaigns}/${id}/logs`, params);
  },
};
