import { z } from "zod";

/** Search params `/berita?page` (int ≥ 1, invalid → 1). */
export const newsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
});
