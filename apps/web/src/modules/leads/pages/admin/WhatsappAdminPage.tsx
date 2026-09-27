import { toast } from "sonner";
import { LeadManager } from "@/modules/leads/components/LeadManager";
import { leadsService } from "@/modules/leads/services/leads.service";
import { openWhatsAppLead } from "@/modules/leads/lib/lead-contact";
import { Seo } from "@/modules/site";
import type { ContractSchemas } from "@/shared/types/contract";

type WhatsAppLead = ContractSchemas["WhatsAppLead"];

/* Port 1:1 `routes/admin.whatsapp.tsx` legacy. */
export default function WhatsappAdminPage() {
  return (
    <>
      <Seo
        title="Prospek WhatsApp"
        description="Kelola prospek dari tombol WhatsApp publik."
        path="/admin/whatsapp"
        noindex
      />
      <LeadManager<WhatsAppLead>
        title="Prospek WhatsApp"
        description="Kelola prospek dari tombol WhatsApp publik."
        itemLabel="prospek WhatsApp"
        load={leadsService.whatsappLeads}
        update={leadsService.updateWhatsappLead}
        archive={leadsService.archiveWhatsappLead}
        getContact={(lead) => lead.phone}
        // Legacy tidak mengirim `message` untuk prospek WhatsApp; yang tersimpan `generated_message`.
        getMessage={(lead) => lead.generated_message ?? ""}
        sendActions={{
          whatsapp: (lead) => {
            if (!openWhatsAppLead(lead)) {
              toast.error("Nomor telepon tidak valid untuk WhatsApp.");
            }
          },
        }}
      />
    </>
  );
}
