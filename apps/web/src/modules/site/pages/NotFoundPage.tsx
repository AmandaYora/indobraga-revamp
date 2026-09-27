import { Link } from "react-router-dom";
import { Seo } from "@/modules/site";

/** Halaman Not Found — state baru bergaya sistem yang sama (BC-22). */
export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Halaman tidak ditemukan"
        description="Halaman yang Anda cari tidak tersedia di website Indobraga."
        path="/404"
        noindex
      />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-muted-foreground">
          Alamat yang Anda tuju sudah dipindahkan atau tidak lagi tersedia. Mari kembali menjelajahi
          website Indobraga.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Kembali ke Beranda
          </Link>
          <Link
            to="/kontak"
            className="rounded-full border border-input px-6 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Hubungi Kami
          </Link>
        </div>
      </div>
    </>
  );
}
