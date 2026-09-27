import { z } from "zod";

export const inquirySchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter.").max(120, "Nama maksimal 120 karakter."),
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  phone: z
    .string()
    .min(1, "Nomor telepon wajib diisi.")
    .regex(/^[0-9+()\-\s]{7,30}$/, "Format nomor telepon tidak valid."),
  company: z.string().max(120, "Nama perusahaan maksimal 120 karakter.").optional(),
  message: z
    .string()
    .min(10, "Pesan minimal 10 karakter.")
    .max(5000, "Pesan maksimal 5000 karakter."),
  website: z.string().optional(),
});

export type InquiryFormValues = z.infer<typeof inquirySchema>;
