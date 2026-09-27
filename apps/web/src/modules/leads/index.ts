export { InquiryForm } from "./components/InquiryForm";
export { LeadManager } from "./components/LeadManager";
export { WhatsAppFab } from "./components/WhatsAppFab";
export { leadsService } from "./services/leads.service";
export {
  normalizePhoneId,
  buildWhatsAppUrl,
  buildWhatsAppGreeting,
  openWhatsAppLead,
} from "./lib/lead-contact";
export { inquirySchema } from "./schemas/inquiry.schema";
export type { InquiryFormValues } from "./schemas/inquiry.schema";
