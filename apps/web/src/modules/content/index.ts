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
export { StatusBadge } from "./components/StatusBadge";
export {
  contentStatus,
  leadStatus,
  emailAccountStatus,
  campaignStatus,
  emailDeliveryStatus,
  mediaStatus,
  userStatus,
  UNKNOWN_STATUS,
} from "./lib/status-map";
export type { StatusDisplay } from "./lib/status-map";
