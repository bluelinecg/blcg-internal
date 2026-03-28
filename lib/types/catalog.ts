export interface CatalogItem {
  id: string;
  name: string;
  description: string | undefined;
  unitPrice: number;
  category: string | undefined;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
