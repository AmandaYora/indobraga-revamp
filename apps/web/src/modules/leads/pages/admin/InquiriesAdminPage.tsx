import { useNavigate, createSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LeadManager } from "@/modules/leads/components/LeadManager";
import { leadsService } from "@/modules/leads/services/leads.service";
import { openWhatsAppLead } from "@/modules/leads/lib/lead-contact";
import { ROUTE_PATHS } from "@/app/routes/route-paths";
import type { ContractSchemas } from "@/shared/types/contract";

type Inquiry = ContractSchemas["Inquiry"];

/** FE-LD01/02: pesan kontak + aksi kirim email / WhatsApp. */
export default function InquiriesAdminPage() {
  const navigate = useNavigate();

  return (
    <LeadManager<Inquiry>
      title="Pesan Kontak"
      description="Pesan yang masuk melalui formulir kontak website."
      itemLabel="pesan kontak"
      seoPath="/admin/inquiries"
      load={(params) => leadsService.inquiries(params)}
      update={(id, payload) => leadsService.updateInquiry(id, payload)}
      archive={(id) => leadsService.archiveInquiry(id)}
      getContact={(item) => ({
        name: item.name,
        detail: [item.email, item.phone, item.company].filter(Boolean).join(" · "),
      })}
      getMessage={(item) => item.message}
      emailAction={(item) =>
        navigate({
          pathname: ROUTE_PATHS.adminEmailBlast,
          search: createSearchParams({
            tab: "single",
            email: item.email,
            name: item.name,
          }).toString(),
        })
      }
      whatsappAction={(item) => {
        const opened = openWhatsAppLead({ phone: item.phone, name: item.name });
        if (!opened) toast.error("Nomor WhatsApp tidak valid");
      }}
    />
  );
}
