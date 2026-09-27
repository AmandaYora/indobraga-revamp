// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

describe("useApiQuery", () => {
  it("memuat data, reload, dan setData manual", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return `v${calls}`;
    };
    const { result } = renderHook(() => useApiQuery(["k"], loader));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("v1"));
    expect(result.current.error).toBeNull();
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe("v2"));
    act(() => result.current.setData("manual"));
    expect(result.current.data).toBe("manual");
  });

  it("menghormati initialData + refetchOnMount:false (paritas loader legacy)", async () => {
    const loader = vi.fn(async () => "baru");
    const { result } = renderHook(() =>
      useApiQuery(["k"], loader, { initialData: "awal", refetchOnMount: false }),
    );
    expect(result.current.data).toBe("awal");
    expect(result.current.loading).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loader).not.toHaveBeenCalled();
  });

  it("abort saat unmount & guard respons basi", async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const loads: (() => Promise<string>)[] = [
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    ];
    let index = 0;
    const { result, unmount } = renderHook(() =>
      useApiQuery(["k", index], () => loads[index](), { enabled: true }),
    );
    // Respons basi (request pertama selesai belakangan) diabaikan.
    act(() => {
      index = 1;
      result.current.reload();
    });
    resolveSecond("kedua");
    await waitFor(() => expect(result.current.data).toBe("kedua"));
    resolveFirst("pertama-basi");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.data).toBe("kedua");
    unmount();
  });

  it("enabled:false tidak fetch", () => {
    const loader = vi.fn(async () => "x");
    const { result } = renderHook(() => useApiQuery(["k"], loader, { enabled: false }));
    expect(result.current.loading).toBe(false);
    expect(loader).not.toHaveBeenCalled();
  });

  it("abort saat unmount tidak menjadi error + normalisasi error asing", async () => {
    const { result, unmount } = renderHook(() =>
      useApiQuery(
        ["abort"],
        (signal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              reject(new DOMException("dibatalkan", "AbortError"));
            });
          }),
      ),
    );
    expect(result.current.loading).toBe(true);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const { result: result2 } = renderHook(() =>
      useApiQuery(["asing"], async () => {
        throw "string-error";
      }),
    );
    await waitFor(() => expect(result2.current.error).toBeInstanceOf(Error));
    expect(result2.current.loading).toBe(false);
  });
});
