// Shared static option lists for the Photo log and Pran Tracking filter
// forms, so both pages stay in sync with the same labels instead of drifting
// apart as copies.
export const KIND_OPTIONS = [
  { value: "posm", label: "POSM" },
  { value: "category", label: "Category Shelf Display" },
  { value: "sku", label: "SKU" },
  { value: "outlet", label: "Outlet" },
];

export const STATUS_OPTIONS = [
  { value: "uploaded", label: "Uploaded" },
  { value: "pending", label: "Pending" },
  { value: "uploading", label: "Uploading" },
  { value: "failed", label: "Failed" },
];

export const EXECUTION_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "bad", label: "Bad" },
];

export const SHELF_VACANCY_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
