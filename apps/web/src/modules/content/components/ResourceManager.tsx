import { useMemo, useState } from "react";
import {
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  Megaphone,
  MegaphoneOff,
} from "lucide-react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { contentService, type ContentListStatus } from "@/modules/content/services/content.service";
import {
  normalizePayload,
  mediaPreviewFieldName,
  mediaGalleryPreviewFieldName,
  asNumberArray,
  type FormValues,
  type ResourceColumn,
  type ResourceField,
} from "@/modules/content/lib/resource-helpers";
import {
  CrudModal,
  ConfirmDialog,
  Field,
  TextInput,
  TextArea,
  Select,
} from "@/modules/content/components/CrudModal";
import { MediaUploadField } from "@/modules/media";
import { MediaGalleryField } from "@/modules/media/components/MediaGalleryField";
import { mediaService, mediaPreviewUrl } from "@/modules/media";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TablePagination } from "@/shared/components/ui/pagination";
import { IconActionButton } from "@/shared/components/ui/icon-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { ApiError } from "@/shared/services/api-error";
import { contentStatusTone } from "@/modules/content";
import { cn } from "@/shared/lib/cn";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];
type TabStatus = "active" | "published" | "draft" | "archived";

const TABS: { value: TabStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "published", label: "Tayang" },
  { value: "draft", label: "Draf" },
  { value: "archived", label: "Arsip" },
];

const STATUS_LABEL: Record<string, string> = {
  published: "Tayang",
  draft: "Draf",
  inactive: "Nonaktif",
  archived: "Diarsipkan",
};

interface AdminContentItem {
  id: number;
  status: string;
}

function recordOf(item: AdminContentItem): Record<string, unknown> {
  return item as unknown as Record<string, unknown>;
}

export interface ResourceManagerProps<T extends AdminContentItem> {
  resource: string;
  title: string;
  description: string;
  addLabel: string;
  itemLabel: string;
  fields: ResourceField[];
  columns: ResourceColumn<T>[];
  primaryText: (item: T) => string;
  secondaryText?: (item: T) => React.ReactNode;
  imageField?: string;
  defaultValues?: FormValues;
  searchPlaceholder?: string;
  seoPath: string;
}

function FieldInput({
  field,
  value,
  error,
  previews,
  setPreview,
  onChange,
}: {
  field: ResourceField;
  value: unknown;
  error?: string;
  previews: Record<string, MediaItem | (MediaItem | null)[] | null>;
  setPreview: (key: string, preview: MediaItem | (MediaItem | null)[] | null) => void;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "hidden") return null;
  if (field.type === "checkbox") {
    return (
      <Field label={field.label} hint={field.hint} error={error}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          Aktif
        </label>
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={field.label} hint={field.hint} required={field.required} error={error}>
        <Select
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value)}
        >
          <option value="">Pilih...</option>
          {(field.options ?? []).map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (field.type === "textarea" || field.type === "paragraphs") {
    const text = Array.isArray(value)
      ? (value as unknown[]).join("\n\n")
      : typeof value === "string"
        ? value
        : "";
    return (
      <Field label={field.label} hint={field.hint} required={field.required} error={error}>
        <TextArea
          value={text}
          rows={field.type === "paragraphs" ? 7 : 4}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    );
  }
  if (field.type === "media") {
    const previewKey = mediaPreviewFieldName(field.name);
    const preview = previews[previewKey];
    const single = Array.isArray(preview) ? null : (preview as MediaItem | null | undefined);
    return (
      <Field label={field.label} hint={field.hint} required={field.required} error={error}>
        <MediaUploadField
          label={field.label}
          hint={undefined}
          usage={field.usage ?? "other"}
          value={typeof value === "number" ? value : null}
          previewUrl={single ? mediaPreviewUrl(single) : null}
          onUploaded={(media) => {
            setPreview(previewKey, media);
            onChange(media.id);
          }}
        />
      </Field>
    );
  }
  if (field.type === "media-multi") {
    const previewKey = mediaGalleryPreviewFieldName(field.name);
    const stored = previews[previewKey];
    const gallery = Array.isArray(stored) ? (stored as (MediaItem | null)[]) : [];
    const ids = asNumberArray(value);
    const aligned = ids.map((_, index) => gallery[index] ?? null);
    return (
      <Field label={field.label} hint={field.hint} required={field.required} error={error}>
        <MediaGalleryField
          label={field.label}
          usage={field.usage ?? "other"}
          max={field.max ?? 10}
          ids={ids}
          previews={aligned}
          onChange={(nextIds, nextPreviews) => {
            setPreview(previewKey, nextPreviews);
            onChange(nextIds);
          }}
        />
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.hint} required={field.required} error={error}>
      <TextInput
        type={field.type === "number" ? "number" : "text"}
        value={typeof value === "string" || typeof value === "number" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function itemImage(item: AdminContentItem, imageField: string): string | null {
  // Paritas `mediaForItem` legacy: preview embedded ada di key preview.
  // Pemanggil selalu mengisi imageField (guard di call-site).
  const value: unknown = recordOf(item)[mediaPreviewFieldName(imageField)];
  if (typeof value === "object" && value !== null) {
    const preview = value as {
      thumbnail_url?: string | null;
      medium_url?: string | null;
      file_url?: string | null;
    };
    return preview.thumbnail_url ?? preview.medium_url ?? preview.file_url ?? null;
  }
  return null;
}

export function ResourceManager<T extends AdminContentItem>(props: ResourceManagerProps<T>) {
  const {
    resource,
    title,
    description,
    addLabel,
    itemLabel,
    fields,
    columns,
    primaryText,
    secondaryText,
    imageField,
    defaultValues,
    searchPlaceholder = "Cari konten...",
    seoPath,
  } = props;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabStatus>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    action: () => Promise<void>;
  }>(null);
  const [previews, setPreviews] = useState<Record<string, MediaItem | (MediaItem | null)[] | null>>(
    {},
  );

  function setPreview(key: string, preview: MediaItem | (MediaItem | null)[] | null) {
    setPreviews((current) => ({ ...current, [key]: preview }));
  }

  /** Ambil preview media untuk field bertipe media saat form edit dibuka. */
  function resolvePreviews(values: FormValues) {
    for (const field of fields) {
      if (field.type === "media" && typeof values[field.name] === "number") {
        const id = values[field.name] as number;
        const previewKey = mediaPreviewFieldName(field.name);
        void mediaService.detail(id).then(
          (media) => setPreview(previewKey, media),
          () => undefined,
        );
      }
      if (field.type === "media-multi") {
        const ids = asNumberArray(values[field.name]);
        const previewKey = mediaGalleryPreviewFieldName(field.name);
        setPreview(
          previewKey,
          ids.map(() => null),
        );
        void Promise.all(ids.map((id) => mediaService.detail(id).catch(() => null))).then(
          (results) => setPreview(previewKey, results),
        );
      }
    }
  }

  const listStatus: ContentListStatus | undefined = tab === "active" ? undefined : tab;

  const { data, error, loading, reload } = useApiQuery(
    ["admin-resource", resource, page, pageSize, query, tab],
    () =>
      contentService.list<T>(resource, {
        page,
        limit: pageSize,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      }),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  function openCreate() {
    setEditing(null);
    setFormValues({ status: "draft", ...defaultValues });
    setFormErrors({});
    setPreviews({});
    setFormOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    const values: FormValues = { ...defaultValues };
    const source = recordOf(item);
    for (const field of fields) {
      const raw: unknown = source[field.name];
      if (field.type === "paragraphs" && Array.isArray(raw)) {
        values[field.name] = (raw as unknown[]).join("\n\n");
      } else if (raw !== undefined) {
        values[field.name] = raw as unknown;
      }
    }
    values.status = item.status;
    setFormValues(values);
    setFormErrors({});
    setPreviews({});
    resolvePreviews(values);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = normalizePayload(formValues, fields);
      if (editing) {
        await contentService.update(resource, editing.id, payload);
        toast.success(`${title} diperbarui`);
      } else {
        await contentService.create(resource, payload);
        toast.success(`${title} ditambahkan`);
      }
      setFormOpen(false);
      reload();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.code === "VALIDATION_ERROR" && submitError.errors.length > 0) {
          const errors: Record<string, string> = {};
          for (const detail of submitError.errors) {
            if (detail.field)
              errors[detail.field.split(".").pop() ?? detail.field] ??= detail.message;
          }
          setFormErrors(errors);
        }
        // Error domain ditampilkan dengan pesan aslinya (FE-C05).
        toast.error("Simpan gagal", { description: submitError.message });
      } else {
        toast.error("Simpan gagal");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      reload();
    } catch (actionError) {
      toast.error("Aksi gagal", {
        description: actionError instanceof ApiError ? actionError.message : undefined,
      });
    }
  }

  const statusField = useMemo(
    () => ({
      name: "status",
      label: "Tampilan Website",
      type: "select" as const,
      options: [
        { value: "draft", label: "Draf" },
        { value: "published", label: "Tayang" },
      ],
    }),
    [],
  );

  return (
    <>
      <Seo title={title} description={description} path={seoPath} noindex />
      <PageTitle
        title={title}
        desc={description}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          aria-label={`Cari ${itemLabel}`}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter status">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={tab === option.value}
              onClick={() => {
                setTab(option.value);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                tab === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <LoadingState label={`Memuat ${itemLabel}...`} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`Tidak ada ${itemLabel}`}
          description="Coba filter atau kata kunci lain."
        />
      ) : (
        <>
          {/* Kartu mobile */}
          <div className="grid gap-3 lg:hidden">
            {items.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start gap-3">
                  {imageField && itemImage(item, imageField) ? (
                    <img
                      src={itemImage(item, imageField) as string}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{primaryText(item)}</p>
                    {secondaryText ? (
                      <div className="text-xs text-muted-foreground">{secondaryText(item)}</div>
                    ) : null}
                    <Badge tone={contentStatusTone(item.status)} className="mt-1">
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                  </div>
                </div>
                <RowActions
                  item={item}
                  tab={tab}
                  onEdit={() => openEdit(item)}
                  onToggleStatus={() =>
                    runAction(
                      () =>
                        contentService
                          .updateStatus(
                            resource,
                            item.id,
                            item.status === "published" ? "draft" : "published",
                          )
                          .then(() => undefined),
                      item.status === "published" ? "Dipindah ke draf" : "Ditayangkan",
                    )
                  }
                  onArchive={() =>
                    setConfirm({
                      title: `Arsipkan ${itemLabel} ini?`,
                      description: `"${primaryText(item)}" dipindahkan ke arsip.`,
                      confirmLabel: "Arsipkan",
                      action: () => contentService.archive(resource, item.id).then(() => undefined),
                    })
                  }
                  onUnarchive={() =>
                    runAction(
                      () => contentService.unarchive(resource, item.id).then(() => undefined),
                      "Dikeluarkan dari arsip",
                    )
                  }
                  onRemove={() =>
                    setConfirm({
                      title: `Hapus ${itemLabel} permanen?`,
                      description: `"${primaryText(item)}" dihapus permanen dan tidak bisa dikembalikan.`,
                      confirmLabel: "Hapus",
                      action: () => contentService.remove(resource, item.id),
                    })
                  }
                />
              </Card>
            ))}
          </div>

          {/* Tabel desktop */}
          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {imageField ? <th className="px-4 py-2 font-medium">Gambar</th> : null}
                    {columns.map((column) => (
                      <th key={column.label} className="px-4 py-2 font-medium">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      {imageField ? (
                        <td className="px-4 py-2">
                          {itemImage(item, imageField) ? (
                            <img
                              src={itemImage(item, imageField) as string}
                              alt=""
                              className="h-10 w-14 rounded object-cover"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.label} className="px-4 py-2">
                          {column.value(item)}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <Badge tone={contentStatusTone(item.status)}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end">
                          <RowActions
                            item={item}
                            tab={tab}
                            onEdit={() => openEdit(item)}
                            onToggleStatus={() =>
                              runAction(
                                () =>
                                  contentService
                                    .updateStatus(
                                      resource,
                                      item.id,
                                      item.status === "published" ? "draft" : "published",
                                    )
                                    .then(() => undefined),
                                item.status === "published" ? "Dipindah ke draf" : "Ditayangkan",
                              )
                            }
                            onArchive={() =>
                              setConfirm({
                                title: `Arsipkan ${itemLabel} ini?`,
                                description: `"${primaryText(item)}" dipindahkan ke arsip.`,
                                confirmLabel: "Arsipkan",
                                action: () =>
                                  contentService.archive(resource, item.id).then(() => undefined),
                              })
                            }
                            onUnarchive={() =>
                              runAction(
                                () =>
                                  contentService.unarchive(resource, item.id).then(() => undefined),
                                "Dikeluarkan dari arsip",
                              )
                            }
                            onRemove={() =>
                              setConfirm({
                                title: `Hapus ${itemLabel} permanen?`,
                                description: `"${primaryText(item)}" dihapus permanen dan tidak bisa dikembalikan.`,
                                confirmLabel: "Hapus",
                                action: () => contentService.remove(resource, item.id),
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <TablePagination
            page={pagination.page}
            pageCount={Math.max(1, pagination.total_pages)}
            pageSize={pagination.limit}
            total={pagination.total}
            start={start}
            end={end}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel={itemLabel}
          />
        </>
      )}

      <CrudModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Ubah ${itemLabel}` : addLabel}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        size="lg"
      >
        <Field label="Tampilan Website" required>
          <Select
            value={typeof formValues.status === "string" ? formValues.status : "draft"}
            onChange={(event) =>
              setFormValues((values) => ({ ...values, status: event.target.value }))
            }
          >
            {statusField.options.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={formValues[field.name]}
            error={formErrors[field.name]}
            previews={previews}
            setPreview={setPreview}
            onChange={(value) => {
              setFormValues((values) => ({ ...values, [field.name]: value }));
            }}
          />
        ))}
      </CrudModal>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? "Hapus"}
        onConfirm={async () => {
          if (confirm) await runAction(confirm.action, "Berhasil");
          setConfirm(null);
        }}
      />
    </>
  );
}

function RowActions<T extends AdminContentItem>({
  item,
  tab,
  onEdit,
  onToggleStatus,
  onArchive,
  onUnarchive,
  onRemove,
}: {
  item: T;
  tab: TabStatus;
  onEdit: () => void;
  onToggleStatus: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onRemove: () => void;
}) {
  const published = item.status === "published";
  return (
    <div className="mt-3 flex flex-wrap gap-1 lg:mt-0">
      <IconActionButton label="Ubah" icon={Pencil} tone="primary" onClick={onEdit} />
      {tab !== "archived" ? (
        <IconActionButton
          label={published ? "Pindah ke draf" : "Tayangkan"}
          tooltip={published ? "Pindah ke draf" : "Tayangkan"}
          icon={published ? MegaphoneOff : Megaphone}
          onClick={onToggleStatus}
        />
      ) : null}
      {tab === "archived" ? (
        <IconActionButton
          label="Keluarkan dari arsip"
          icon={ArchiveRestore}
          tone="success"
          onClick={onUnarchive}
        />
      ) : (
        <IconActionButton label="Arsipkan" icon={Archive} onClick={onArchive} />
      )}
      <IconActionButton label="Hapus permanen" icon={Trash2} tone="danger" onClick={onRemove} />
    </div>
  );
}
