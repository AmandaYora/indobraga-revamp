/// <reference types="vite/client" />

declare module "read-excel-file/browser" {
  function readXlsxFile(file: Blob, schema?: unknown): Promise<unknown[][]>;
  export default readXlsxFile;
}

declare module "write-excel-file/browser" {
  function writeXlsxFile(
    data: unknown[][],
    options?: { fileName?: string; schema?: unknown; sheet?: string },
  ): Promise<void>;
  export default writeXlsxFile;
}
