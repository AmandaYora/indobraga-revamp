import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Code2, Eye, Pencil, Type } from "lucide-react";
import { TextArea } from "@/modules/content/components/CrudModal";
import type { ContentMode } from "@/modules/email/lib/recipients";
import { buildPreviewSrcDoc } from "@/modules/email/lib/preview-document";

/**
 * Port `components/admin/EmailContentEditor.tsx` legacy — markup, ikon, teks, kelas 1:1.
 * Editor isi email dengan toggle teks / HTML; mode HTML punya pratinjau langsung agar admin
 * non-teknis bisa mengecek tata letak. Variabel seperti {{nama}} dipakai di kedua mode dan
 * diganti per penerima. BC-24: pratinjau HTML dirender di iframe sandbox (tanpa script) di
 * dalam bingkai legacy yang sama.
 */
export function EmailContentEditor({
  mode,
  bodyText,
  bodyHtml,
  onModeChange,
  onBodyTextChange,
  onBodyHtmlChange,
  variables,
}: {
  mode: ContentMode;
  bodyText: string;
  bodyHtml: string;
  onModeChange: (mode: ContentMode) => void;
  onBodyTextChange: (value: string) => void;
  onBodyHtmlChange: (value: string) => void;
  variables: readonly string[];
}) {
  const [htmlPreview, setHtmlPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  // Kembalikan fokus + posisi kursor tepat setelah variabel yang disisipkan memperbarui nilai.
  useEffect(() => {
    if (pendingCursorRef.current === null || !textareaRef.current) {
      return;
    }
    const pos = pendingCursorRef.current;
    pendingCursorRef.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pos, pos);
  });

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const editingText = mode === "text";
    const editingHtml = mode === "html" && !htmlPreview;
    const current = editingText ? bodyText : bodyHtml;
    const apply = editingText ? onBodyTextChange : onBodyHtmlChange;
    const textarea = textareaRef.current;

    if ((editingText || editingHtml) && textarea) {
      // Sisipkan di posisi kursor (atau ganti teks yang sedang dipilih).
      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? current.length;
      pendingCursorRef.current = start + token.length;
      apply(current.slice(0, start) + token + current.slice(end));
      return;
    }
    // Pratinjau HTML (tanpa textarea): tambahkan di akhir isi HTML.
    onBodyHtmlChange(`${bodyHtml}${token}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
          <ModeButton active={mode === "text"} onClick={() => onModeChange("text")}>
            <Type className="h-3.5 w-3.5" /> Teks
          </ModeButton>
          <ModeButton active={mode === "html"} onClick={() => onModeChange("html")}>
            <Code2 className="h-3.5 w-3.5" /> HTML
          </ModeButton>
        </div>
        {mode === "html" && (
          <button
            type="button"
            onClick={() => setHtmlPreview((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft"
          >
            {htmlPreview ? (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit HTML
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Pratinjau
              </>
            )}
          </button>
        )}
      </div>

      {mode === "text" ? (
        <TextArea
          ref={textareaRef}
          rows={8}
          value={bodyText}
          onChange={(event) => onBodyTextChange(event.target.value)}
          placeholder="Halo {{nama}}, terima kasih sudah menghubungi Indobraga..."
        />
      ) : htmlPreview ? (
        <div className="email-html-preview min-h-[12rem] overflow-auto rounded-lg border border-input bg-background p-4 text-sm">
          <iframe
            title="Pratinjau HTML email"
            sandbox=""
            srcDoc={buildPreviewSrcDoc(
              bodyHtml.trim() || "<p style='color:#9ca3af'>Belum ada isi HTML.</p>",
            )}
            className="h-[calc(10rem-2px)] w-full"
          />
        </div>
      ) : (
        <TextArea
          ref={textareaRef}
          rows={12}
          value={bodyHtml}
          onChange={(event) => onBodyHtmlChange(event.target.value)}
          placeholder={"<p>Halo {{nama}},</p>\n<p>Terima kasih sudah menghubungi Indobraga.</p>"}
          className="font-mono text-xs"
        />
      )}

      {mode === "html" && !htmlPreview && (
        <p className="text-[11px] text-muted-foreground">
          Tulis HTML langsung. Variabel seperti {"{{nama}}"} tetap diganti otomatis per penerima.
        </p>
      )}

      <VariableHints variables={variables} onInsert={insertVariable} />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-card text-primary-deep shadow-card"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Daftar variabel `{{key}}`. Dengan `onInsert` setiap chip menyisipkan variabel ke isi email;
 * tanpa `onInsert` tampil sebagai `<code>` baca-saja (panel file Excel). Kosong → tidak dirender.
 */
export function VariableHints({
  variables,
  onInsert,
}: {
  variables: readonly string[];
  onInsert?: (key: string) => void;
}) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className="text-anywhere flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-semibold">Variabel tersedia:</span>
      {variables.map((key) =>
        onInsert ? (
          <button
            key={key}
            type="button"
            onClick={() => onInsert(key)}
            title={`Sisipkan {{${key}}} ke isi email`}
            className="cursor-pointer rounded bg-secondary px-1.5 py-0.5 font-mono text-primary-deep transition hover:bg-primary-soft hover:text-primary"
          >
            {`{{${key}}}`}
          </button>
        ) : (
          <code key={key} className="rounded bg-secondary px-1.5 py-0.5 text-primary-deep">
            {`{{${key}}}`}
          </code>
        ),
      )}
    </div>
  );
}
