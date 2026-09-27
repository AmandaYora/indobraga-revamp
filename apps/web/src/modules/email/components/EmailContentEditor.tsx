import { useRef, useState } from "react";

/**
 * Editor konten email: toggle text/HTML, chip variabel disisipkan di posisi
 * kursor, preview dalam iframe sandbox (BC-24: script tidak dieksekusi).
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
  mode: "text" | "html";
  bodyText: string;
  bodyHtml: string;
  onModeChange: (mode: "text" | "html") => void;
  onBodyTextChange: (value: string) => void;
  onBodyHtmlChange: (value: string) => void;
  variables: readonly string[];
}) {
  const [previewHtml, setPreviewHtml] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    if (mode === "text") {
      const node = textRef.current;
      if (!node) {
        onBodyTextChange(`${bodyText}${token}`);
        return;
      }
      const start = node.selectionStart ?? bodyText.length;
      const end = node.selectionEnd ?? bodyText.length;
      onBodyTextChange(`${bodyText.slice(0, start)}${token}${bodyText.slice(end)}`);
      requestAnimationFrame(() => {
        node.focus();
        node.setSelectionRange(start + token.length, start + token.length);
      });
    } else if (previewHtml) {
      onBodyHtmlChange(`${bodyHtml}${token}`);
    } else {
      const node = htmlRef.current;
      if (!node) {
        onBodyHtmlChange(`${bodyHtml}${token}`);
        return;
      }
      const start = node.selectionStart ?? bodyHtml.length;
      const end = node.selectionEnd ?? bodyHtml.length;
      onBodyHtmlChange(`${bodyHtml.slice(0, start)}${token}${bodyHtml.slice(end)}`);
      requestAnimationFrame(() => {
        node.focus();
        node.setSelectionRange(start + token.length, start + token.length);
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2" role="group" aria-label="Mode konten">
        <button
          type="button"
          aria-pressed={mode === "text"}
          onClick={() => onModeChange("text")}
          className={
            mode === "text"
              ? "rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground"
              : "rounded-full border border-input px-4 py-1.5 text-sm hover:bg-muted"
          }
        >
          Teks
        </button>
        <button
          type="button"
          aria-pressed={mode === "html"}
          onClick={() => onModeChange("html")}
          className={
            mode === "html"
              ? "rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground"
              : "rounded-full border border-input px-4 py-1.5 text-sm hover:bg-muted"
          }
        >
          HTML
        </button>
        {mode === "html" ? (
          <button
            type="button"
            aria-pressed={previewHtml}
            onClick={() => setPreviewHtml((value) => !value)}
            className="ml-auto rounded-full border border-input px-4 py-1.5 text-sm hover:bg-muted"
          >
            {previewHtml ? "Edit HTML" : "Pratinjau"}
          </button>
        ) : null}
      </div>
      {mode === "text" ? (
        <textarea
          ref={textRef}
          aria-label="Isi email teks"
          rows={10}
          value={bodyText}
          onChange={(event) => onBodyTextChange(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
        />
      ) : previewHtml ? (
        <iframe
          title="Pratinjau HTML email"
          sandbox=""
          srcDoc={bodyHtml.trim() === "" ? "<p>Isi email masih kosong.</p>" : bodyHtml}
          className="h-64 w-full rounded-lg border border-input bg-white"
        />
      ) : (
        <textarea
          ref={htmlRef}
          aria-label="Isi email HTML"
          rows={10}
          value={bodyHtml}
          onChange={(event) => onBodyHtmlChange(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
          spellCheck={false}
        />
      )}
      <div>
        <p className="text-xs text-muted-foreground">
          Variabel seperti {"{{nama}}"} tetap diganti otomatis saat dikirim.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {variables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="rounded-full bg-primary-soft px-2.5 py-1 font-mono text-xs text-primary hover:bg-primary hover:text-primary-foreground"
              aria-label={`Sisipkan variabel ${variable}`}
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
