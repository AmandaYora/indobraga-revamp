import { toast } from "sonner";
import { LeadManager } from "@/modules/leads/components/LeadManager";
import { leadsService } from "@/modules/leads/services/leads.service";
import { openWhatsAppLead } from "@/modules/leads/lib/lead-contact";
import type { ContractSchemas } from "@/shared/types/contract";

type WhatsAppLead = ContractSchemas["WhatsAppLead"];

/** FE-LD01/02: prospek WhatsApp + aksi kirim WhatsApp. */
export default function WhatsappAdminPage() {
  return (
    <LeadManager<WhatsAppLead>
      title="Prospek WhatsApp"
      description="Prospek yang masuk melalui tombol WhatsApp website."
      itemLabel="prospek WhatsApp"
      seoPath="/admin/whatsapp"
      load={(params) => leadsService.whatsappLeads(params)}
      update={(id, payload) => leadsService.updateWhatsappLead(id, payload)}
      archive={(id) => leadsService.archiveWhatsappLead(id)}
      getContact={(item) => ({ name: item.name, detail: item.phone })}
      getMessage={(item) => item.generated_message ?? item.message ?? "—"}
      whatsappAction={(item) => {
        const opened = openWhatsAppLead({ phone: item.phone, name: item.name });
        if (!opened) toast.error("Nomor WhatsApp tidak valid");
      }}
    />
  );
}
