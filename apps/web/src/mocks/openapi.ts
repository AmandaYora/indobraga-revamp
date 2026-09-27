/**
 * Validator OpenAPI untuk test (PLAN-02 §2.3/§2.9): setiap respons handler MSW
 * dan setiap body request frontend divalidasi terhadap `openapi.yaml`
 * (AJV + loader OpenAPI 3.1). Mock yang menyimpang = test merah.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = join(here, "..", "..", "..", "..", "packages", "api-contract", "openapi.yaml");

interface OpenApiDocument {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
}

interface Operation {
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = any;

const doc = parseYaml(readFileSync(OPENAPI_PATH, "utf8")) as OpenApiDocument;
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

function resolveSchema(schema: Schema, seen: Set<string> = new Set()): Schema {
  if (Array.isArray(schema)) return schema.map((entry) => resolveSchema(entry, seen));
  if (schema && typeof schema === "object") {
    if (typeof schema.$ref === "string") {
      const ref: string = schema.$ref;
      if (!ref.startsWith("#/components/schemas/")) {
        throw new Error(`Ref tidak didukung di validator mock: ${ref}`);
      }
      const name = ref.slice("#/components/schemas/".length);
      if (seen.has(name)) return {};
      seen.add(name);
      const resolved = resolveSchema(doc.components.schemas[name], seen);
      const { $ref, ...siblings } = schema;
      void $ref;
      if (Object.keys(siblings).length === 0) return resolved;
      return { allOf: [resolved, resolveSchema(siblings, seen)] };
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      out[key] = resolveSchema(value, new Set(seen));
    }
    return out;
  }
  return schema;
}

const validatorCache = new Map<string, ValidateFunction>();

function compile(name: string, schema: Schema): ValidateFunction {
  const cached = validatorCache.get(name);
  if (cached) return cached;
  const validate = ajv.compile(resolveSchema(schema));
  validatorCache.set(name, validate);
  return validate;
}

function templateToRegex(template: string): RegExp {
  const pattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{[^/]+\\\}/g, "[^/]+");
  return new RegExp(`^${pattern}$`);
}

function findOperation(
  method: string,
  concretePath: string,
): { template: string; operation: Operation } {
  const lower = method.toLowerCase();
  for (const [template, operations] of Object.entries(doc.paths)) {
    const operation = operations[lower];
    if (!operation) continue;
    if (template === concretePath || templateToRegex(template).test(concretePath)) {
      return { template, operation };
    }
  }
  throw new Error(`Operasi tidak ada di kontrak: ${method.toUpperCase()} ${concretePath}`);
}

function jsonSchema(
  operation: Operation,
  status: number | "request",
  direction: "response" | "request",
): Schema | null {
  if (direction === "request") {
    return (operation.requestBody?.content?.["application/json"]?.schema as Schema) ?? null;
  }
  const statusCode = status as number;
  const responses = operation.responses ?? {};
  const exact =
    responses[String(statusCode)] ??
    responses[String(Math.floor(statusCode / 100)) + "XX"] ??
    responses.default;
  if (!exact) return null;
  const content = exact.content ?? {};
  const json = content["application/json"];
  if (!json) return null;
  return (json.schema as Schema) ?? null;
}

export interface ContractAssert {
  template: string;
  assertResponse: (status: number, body: unknown) => void;
  assertRequest: (body: unknown) => void;
}

export function contractFor(method: string, concretePath: string): ContractAssert {
  const { template, operation } = findOperation(method, concretePath);
  return {
    template,
    assertResponse: (status: number, body: unknown) => {
      const responses = operation.responses ?? {};
      const entry =
        responses[String(status)] ??
        responses[String(Math.floor(status / 100)) + "XX"] ??
        responses.default;
      if (!entry) {
        throw new Error(`Kontrak ${method} ${template} tidak mendefinisikan respons ${status}`);
      }
      // Respons tanpa konten JSON (mis. 302, 429 tanpa body) — cukup status terdokumentasi.
      const schema = jsonSchema(operation, status, "response");
      if (!schema) return;
      const validate = compile(`res:${method}:${template}:${status}`, schema);
      if (!validate(body)) {
        throw new Error(
          `Respons ${method} ${template} [${status}] melanggar kontrak:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
        );
      }
    },
    assertRequest: (body: unknown) => {
      const schema = jsonSchema(operation, "request", "request");
      if (!schema) return;
      const validate = compile(`req:${method}:${template}`, schema);
      if (!validate(body)) {
        throw new Error(
          `Request ${method} ${template} melanggar kontrak:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
        );
      }
    },
  };
}

/** Validasi envelope error generik (membantu pesan test yang jelas). */
export function assertErrorEnvelope(body: unknown): asserts body is {
  success: false;
  code: string;
  message: string;
  errors: { field: string | null; message: string }[];
  request_id: string;
} {
  const validate = compile("ErrorEnvelope", {
    $ref: "#/components/schemas/ErrorEnvelope",
  });
  if (!validate(body)) {
    throw new Error(
      `Envelope error melanggar kontrak:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
    );
  }
}
