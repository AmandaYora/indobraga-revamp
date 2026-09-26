import { useState } from "react";
import type { FormEvent } from "react";
import { loginSchema } from "@/modules/auth/schemas/login.schema";

export default function LoginPage() {
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      return;
    }
    setErrors([]);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Sign in</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2"
        />
        {errors.map((err) => (
          <p key={err} className="text-sm text-red-600">{err}</p>
        ))}
        <button
          type="submit"
          className="w-full rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-white hover:bg-[var(--color-primary-hover)]"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
