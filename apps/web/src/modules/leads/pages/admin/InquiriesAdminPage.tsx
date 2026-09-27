import { useNavigate, createSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LeadManager } from "@/modules/leads/components/LeadManager";
import { leadsService } from "@/modules/leads/services/leads.service";
import { openWhatsAppLead } from "@/modules/leads/lib/lead-contact";
import { Seo } from "@/modules/site";
import { ROUTE_PATHS } from "@/app/routes/route-paths";
import type { ContractSchemas } from "@/shared/types/contract";

type Inquiry = ContractSchemas["Inquiry"];

/* Port 1:1 `routes/admin.inquiries.tsx` legacy. */
export default function InquiriesAdminPage() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Pesan Kontak"
        description="Kelola pesan dari form kontak publik."
        path="/admin/inquiries"
        noindex
      />
      <LeadManager<Inquiry>
        title="Pesan Kontak"
        description="Kelola pesan dari form kontak publik."
        itemLabel="pesan kontak"
        load={leadsService.inquiries}
        update={leadsService.updateInquiry}
        archive={leadsService.archiveInquiry}
        getContact={(lead) => (
          <>
            {lead.email} - {lead.phone}
            {lead.company ? ` - ${lead.company}` : ""}
          </>
        )}
        getMessage={(lead) => lead.message}
        sendActions={{
          email: (lead) =>
            void navigate({
              pathname: ROUTE_PATHS.adminEmailBlast,
              search: createSearchParams({
                tab: "single",
                email: lead.email,
                name: lead.name,
              }).toString(),
            }),
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
