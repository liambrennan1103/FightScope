import type { MmaCatalog } from "@/lib/types";

export interface MmaDataProvider {
  getCatalog(): Promise<MmaCatalog>;
}
