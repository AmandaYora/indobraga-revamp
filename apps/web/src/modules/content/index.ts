export { ResourceManager } from "./components/ResourceManager";
export {
  CrudModal,
  ConfirmDialog,
  Field,
  TextInput,
  TextArea,
  Select,
} from "./components/CrudModal";
export { contentService } from "./services/content.service";
export {
  normalizePayload,
  mediaPreviewFieldName,
  mediaGalleryPreviewFieldName,
  asNumberArray,
} from "./lib/resource-helpers";
export type { ResourceField, ResourceColumn, FormValues } from "./lib/resource-helpers";
export {
  contentStatusTone,
  inquiryStatusTone,
  campaignStatusTone,
  mediaStatusTone,
  accountStatusTone,
} from "./lib/status-map";
