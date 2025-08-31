export interface ToothGroup {
  groupId: string;
  teeth: number[];
  type: 'separate' | 'joint' | 'bridge';
  productType: 'implant' | 'crown-bridge';
  notes: string;
  material: string;
  shade: string;
  pontics?: number[];
  warning?: string;
  occlusalStaining?: string;
  ponticDesign?: string;
  selectedTrials?: string[];
  products?: Array<{
    id: string;
    name: string;
    category: string;
    material: string;
    description: string;
    quantity: number;
  }>;
}
