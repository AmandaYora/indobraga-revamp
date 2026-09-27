import type { components } from "@indobraga/api-contract";

/** Skema kontrak OpenAPI v1 — satu-satunya sumber tipe API. */
export type ContractSchemas = components["schemas"];

export type ErrorCode = ContractSchemas["ErrorCode"];
export type ErrorEnvelope = ContractSchemas["ErrorEnvelope"];
export type PaginationMeta = ContractSchemas["PaginationMeta"];
