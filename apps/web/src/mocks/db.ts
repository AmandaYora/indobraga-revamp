/**
 * Database in-memory MSW — stateful agar CRUD, status, arsip, pagination,
 * filter, search, login/logout, CSRF, permission per role, dan rate limit
 * bisa disimulasikan. Di-seed dari `src/mocks/seed/*.json` (hasil
 * `scripts/fixtures/convert-legacy.mjs`). `resetMockDb()` dipanggil tiap test.
 */

export interface SeedEnvelope {
  success: boolean;
  data: unknown;
  meta?: Record<string, unknown>;
}

const seedModules = import.meta.glob("./seed/*.json", { eager: true }) as Record<
  string,
  SeedEnvelope
>;

function seed(name: string): SeedEnvelope | undefined {
  return seedModules[`./seed/${name}`];
}

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "content_editor";
  status: "active" | "inactive";
  permissions: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockSession {
  user: MockUser;
}

export interface FailureInjection {
  status: number;
  code: string;
  message: string;
}

export const MOCK_CSRF_TOKEN = "mock-csrf-token";
export const MOCK_PASSWORD = "indobraga123";

const CONTENT_RESOURCES = [
  "hero",
  "hero-slides",
  "partners",
  "production-strengths",
  "services",
  "machines",
  "printing-capacities",
  "production-capacities",
  "portfolio-categories",
  "portfolios",
  "gallery-items",
  "news",
] as const;

export type ContentResource = (typeof CONTENT_RESOURCES)[number];

interface DbState {
  content: Record<string, Record<string, unknown>[]>;
  media: Record<string, unknown>[];
  inquiries: Record<string, unknown>[];
  whatsappLeads: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  emailAccounts: Record<string, unknown>[];
  emailTemplates: Record<string, unknown>[];
  campaigns: Record<string, unknown>[];
  campaignRecipients: Record<number, Record<string, unknown>[]>;
  campaignLogs: Record<number, Record<string, unknown>[]>;
  users: MockUser[];
  siteSettingsAdmin: Record<string, unknown>;
  session: MockSession | null;
  loginAttempts: number[];
  leadAttempts: number[];
  failNext: FailureInjection | null;
  nextId: number;
}

function seedArray(name: string): Record<string, unknown>[] {
  const envelope = seed(name);
  if (envelope && Array.isArray(envelope.data)) return clone(envelope.data);
  return [];
}

function seedObject(name: string): Record<string, unknown> {
  const envelope = seed(name);
  if (
    envelope &&
    envelope.data &&
    typeof envelope.data === "object" &&
    !Array.isArray(envelope.data)
  ) {
    return clone(envelope.data) as Record<string, unknown>;
  }
  return {};
}

function buildState(): DbState {
  const content: Record<string, Record<string, unknown>[]> = {};
  for (const resource of CONTENT_RESOURCES) {
    content[resource] = seedArray(`GET-api-v1-admin-${resource}.json`);
  }
  const recipients: Record<number, Record<string, unknown>[]> = {};
  const logs: Record<number, Record<string, unknown>[]> = {};
  for (const key of Object.keys(seedModules)) {
    const recipientsMatch = key.match(/GET-api-v1-admin-email-campaigns-(\d+)-recipients\.json$/);
    if (recipientsMatch) {
      recipients[Number(recipientsMatch[1])] = seedArray(key.slice("./seed/".length));
    }
    const logsMatch = key.match(/GET-api-v1-admin-email-campaigns-(\d+)-logs\.json$/);
    if (logsMatch) {
      logs[Number(logsMatch[1])] = seedArray(key.slice("./seed/".length));
    }
  }
  const users = seedArray("GET-api-v1-admin-users.json") as unknown as MockUser[];
  // Alias login sesuai prefill legacy (`admin@indobraga.com`, paritas FE-L01).
  // Kata sandi mock: MOCK_PASSWORD. Hanya di mock — bukan data backend.
  const superAdmin = users.find((user) => user.role === "super_admin");
  if (superAdmin && !users.some((user) => user.email.toLowerCase() === "admin@indobraga.com")) {
    users.unshift({
      id: 9001,
      name: "Admin Utama",
      email: "admin@indobraga.com",
      role: "super_admin",
      status: "active",
      permissions: [...superAdmin.permissions],
      last_login_at: null,
      created_at: superAdmin.created_at,
      updated_at: superAdmin.updated_at,
    });
  }
  return {
    content,
    media: seedArray("GET-api-v1-admin-media.json"),
    inquiries: seedArray("GET-api-v1-admin-inquiries.json"),
    whatsappLeads: seedArray("GET-api-v1-admin-whatsapp-leads.json"),
    notifications: seedArray("GET-api-v1-admin-notifications.json"),
    emailAccounts: seedArray("GET-api-v1-admin-email-accounts.json"),
    emailTemplates: seedArray("GET-api-v1-admin-email-templates.json"),
    campaigns: seedArray("GET-api-v1-admin-email-campaigns.json"),
    campaignRecipients: recipients,
    campaignLogs: logs,
    users,
    siteSettingsAdmin: seedObject("GET-api-v1-admin-site-settings.json"),
    session: null,
    loginAttempts: [],
    leadAttempts: [],
    failNext: null,
    nextId: 10_000,
  };
}

let state: DbState = buildState();

export const db = {
  get state(): DbState {
    return state;
  },
  /** Kembalikan DB ke seed awal (dipanggil tiap test + saat worker start). */
  reset() {
    state = buildState();
  },
  /** Simulasi error 4xx/5xx untuk request berikutnya (khusus test). */
  failNextRequest(failure: FailureInjection) {
    state.failNext = failure;
  },
  consumeFailure(): FailureInjection | null {
    const failure = state.failNext;
    state.failNext = null;
    return failure;
  },
  takeId(): number {
    state.nextId += 1;
    return state.nextId;
  },
  now(): string {
    return new Date().toISOString();
  },
};

export function getSeed(name: string): SeedEnvelope | undefined {
  const envelope = seed(name);
  return envelope ? clone(envelope) : undefined;
}

/** Proyeksi pengaturan admin → pengaturan publik (BC-21). */
export function publicSiteSettings() {
  const admin = state.siteSettingsAdmin;
  return {
    brand: admin.brand ?? null,
    legal_name: admin.legal_name ?? null,
    email: admin.email ?? null,
    phone: admin.phone ?? null,
    whatsapp: admin.whatsapp ?? null,
    instagram: admin.instagram ?? null,
    contact_person: admin.contact_person ?? null,
    contact_role: admin.contact_role ?? null,
    address: admin.address ?? null,
    show_brand_text: admin.show_brand_text ?? false,
    logo_url: admin.logo_url ?? null,
    footer_logo_url: admin.footer_logo_url ?? null,
    contact_hero_image_url: admin.contact_hero_image_url ?? null,
    seo: {
      title: (admin.seo_title as string | null) ?? null,
      description: (admin.seo_description as string | null) ?? null,
      og_image_url: (admin.og_image_url as string | null) ?? null,
    },
  };
}

export { CONTENT_RESOURCES };
