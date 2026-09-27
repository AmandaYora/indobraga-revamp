import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { GhostButton, PrimaryButton } from "@/shared/components/ui/action-buttons";

/* Port `components/admin/CrudModal.tsx` legacy — markup, teks, dan kelas 1:1. */

/* ---------------- Form Modal ---------------- */
export function CrudModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Simpan",
  submitting = false,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  /** Mencegah submit ganda; tampilan tombol tetap seperti legacy. */
  submitting?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeMap = {
    sm: "sm:max-w-md",
    md: "sm:max-w-xl",
    lg: "sm:max-w-3xl",
    xl: "sm:max-w-5xl",
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-[calc(100vw-2rem)] ${sizeMap[size]} max-h-[92vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="text-anywhere pr-8 font-display text-xl text-primary-deep">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-anywhere">{description}</DialogDescription>
          )}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (submitting) return;
            onSubmit?.();
          }}
          className="space-y-4"
        >
          <div className="space-y-4 py-2">{children}</div>
          <DialogFooter className="gap-2 sm:gap-2">
            <GhostButton type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" /> Batal
            </GhostButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitLabel}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Confirm (alert) ---------------- */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Hapus item ini?",
  description = "Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  destructive = true,
  confirming = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** Default `true` seperti legacy; kirim `false` untuk konfirmasi non-destruktif (tombol primary). */
  destructive?: boolean;
  /** Mencegah klik ganda; tampilan tombol tetap seperti legacy. */
  confirming?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirming}
            onClick={() => void onConfirm()}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------- Form Field ---------------- */
export function Field({
  label,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={`${inputCls} ${className ?? ""}`} />;
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} {...props} className={`${inputCls} ${className ?? ""}`} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} {...props} className={`${inputCls} ${className ?? ""}`}>
        {children}
      </select>
    );
  },
);
