import { httpClient, type ApiData, type PageMeta } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

type Inquiry = ContractSchemas["Inquiry"];
type WhatsAppLead = ContractSchemas["WhatsAppLead"];
type LeadStatus = ContractSchemas["LeadStatus"];

export interface LeadListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: LeadStatus;
}

export interface LeadUpdate {
  status?: LeadStatus;
  internal_note?: string;
}

async function list<T>(url: string, params?: LeadListParams) {
  const response = await httpClient.get<ApiData<T[]>>(url, { params });
  const body = response.data as ApiData<T[]>;
  return {
    items: body.data,
    pagination: (body.meta ?? { page: 1, limit: 10, total: 0, total_pages: 1 }) as PageMeta,
  };
}

/** Service prospek (paritas `adminLeadApi` legacy). */
export const leadsService = {
  inquiries(params?: LeadListParams) {
    return list<Inquiry>(API.admin.inquiries, params);
  },
  updateInquiry(id: number, payload: LeadUpdate) {
    return httpClient.patch(`${API.admin.inquiries}/${id}`, payload);
  },
  archiveInquiry(id: number) {
    return httpClient.delete(`${API.admin.inquiries}/${id}`);
  },
  whatsappLeads(params?: LeadListParams) {
    return list<WhatsAppLead>(API.admin.whatsappLeads, params);
  },
  updateWhatsappLead(id: number, payload: LeadUpdate) {
    return httpClient.patch(`${API.admin.whatsappLeads}/${id}`, payload);
  },
  archiveWhatsappLead(id: number) {
    return httpClient.delete(`${API.admin.whatsappLeads}/${id}`);
  },
};
