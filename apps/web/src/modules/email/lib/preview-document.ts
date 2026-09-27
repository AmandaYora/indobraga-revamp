/**
 * Dokumen `srcdoc` untuk pratinjau HTML email di iframe sandbox (BC-24).
 *
 * Legacy merender HTML langsung di halaman (`dangerouslySetInnerHTML`) sehingga isinya ikut
 * font aplikasi, `text-sm`, warna teks, dan reset preflight Tailwind. Iframe tidak mewarisi CSS
 * induk, jadi CSS minimal berikut disuntikkan agar tampilannya sama: font & ukuran teks
 * aplikasi, warna foreground dari token tema, dan subset preflight Tailwind yang memengaruhi
 * konten email (margin, heading, list, tautan, gambar, tabel).
 */
const APP_FONT_STACK = `"Inter Variable", "Inter", system-ui, sans-serif`;

/** Warna foreground aktif dari token tema (`--foreground`); kosong bila tidak tersedia. */
function themeForeground(): string {
  if (typeof document === "undefined") return "";
  try {
    return getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
  } catch {
    return "";
  }
}

function previewCss(): string {
  const foreground = themeForeground();
  return [
    "*,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}",
    "html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4}",
    `body{margin:0;font-family:${APP_FONT_STACK};font-size:0.875rem;line-height:1.25rem;-webkit-font-smoothing:antialiased;${
      foreground ? `color:${foreground};` : ""
    }background:transparent}`,
    "h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}",
    "a{color:inherit;text-decoration:inherit}",
    "b,strong{font-weight:bolder}",
    "ol,ul,menu{list-style:none}",
    "img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}",
    "img,video{max-width:100%;height:auto}",
    "table{text-indent:0;border-color:inherit;border-collapse:collapse}",
    "hr{height:0;color:inherit;border-top-width:1px}",
  ].join("");
}

/** Bungkus HTML email (milik admin, tidak dipercaya) menjadi dokumen `srcdoc` bergaya aplikasi. */
export function buildPreviewSrcDoc(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${previewCss()}</style></head><body>${html}</body></html>`;
}
