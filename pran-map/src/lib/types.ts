export interface PranMapItem {
  photoId: string;
  kind: "posm" | "category" | "sku";
  typeName: string | null;
  productCategoryName: string | null;
  shopTypeName: string | null;
  brandName: string | null;
  pranRelation: "pran" | "competitor" | null;
  isGoodExecution: boolean;
  shelfVacancy: boolean | null;
  capturedAt: string;
  repName: string;
  hasImage: boolean;
  surroundingRemarks: string | null;
  otherRemarks: string | null;
}

export interface PranMapOutlet {
  outletName: string;
  lat: number;
  lng: number;
  address: string | null;
  brandNames: string[];
  firstVisitAt: string;
  lastVisitAt: string;
  items: PranMapItem[];
}

export const KIND_LABEL: Record<PranMapItem["kind"], string> = {
  posm: "POSM",
  category: "Category Shelf Display",
  sku: "SKU",
};
