import { z } from "zod";

/** Search params `/admin/email-blast?tab=single|bulk&email&name`. */
export const emailBlastSearchSchema = z.object({
  tab: z.enum(["single", "bulk"]).catch("single").default("single"),
  email: z.string().optional(),
  name: z.string().optional(),
});
