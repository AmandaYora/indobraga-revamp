import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo, Seo } from "@/modules/site";
import { loginSchema } from "@/modules/auth/schemas/login.schema";
import { useAuthStore } from "@/modules/auth";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("admin@indobraga.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error("Login gagal", {
        description: parsed.error.issues[0].message,
      });
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      toast.success("Login berhasil");
      const redirect = searchParams.get("redirect");
      navigate(redirect && redirect.startsWith("/") ? redirect : ROUTE_PATHS.admin, {
        replace: true,
      });
    } catch (error) {
      toast.error("Login gagal", {
        description: getUserFacingErrorMessage(error, { action: "login" }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Masuk"
        description="Masuk ke panel pengelolaan website Indobraga."
        path="/login"
        noindex
      />
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-elegant">
          <div className="flex justify-center">
            <BrandLogo brand="Admin Indobraga" />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Masuk ke panel pengelolaan website
          </p>
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
            aria-label="Formulir masuk admin"
          >
            <div>
              <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1 block text-sm font-medium">
                Kata sandi
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Masuk ke Panel Admin"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Copyright PT. Braga Indonesia Perkasa
          </p>
        </div>
      </div>
    </>
  );
}
