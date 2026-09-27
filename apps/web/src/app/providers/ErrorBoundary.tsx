import { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";

interface ErrorBoundaryState {
  error: Error | null;
}

/** Batas error aplikasi — fallback bergaya sama dengan tombol coba lagi. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[indobraga] unhandled render error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-bold">Terjadi kendala</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Halaman belum bisa ditampilkan. Coba lagi.
          </p>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Coba lagi
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
