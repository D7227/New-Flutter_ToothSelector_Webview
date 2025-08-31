export type OrderCategoryType = "new" | "repeat" | "repair" | "" | null;

export type OrderMethodType = "digital" | "manual";

export type PrescriptionType =
  | "fixed-restoration"
  | "implant"
  | "splints-guards"
  | "ortho"
  | "dentures"
  | "sleep-accessories"
  | "";

export interface ShadeGuide {
  type: "anterior" | "posterior";
  shades: string[];
}

export interface Product {
  id: string;
  name: string;
  category: PrescriptionType;
  material: string;
  description: string;
  quantity: number;
}

export interface SelectedTooth {
  type: "abutment" | "pontic";
  toothNumber: number;
  prescriptionType: "implant" | "crown-bridge";
  subcategoryType: string;
  productName: string[];
  shadeDetails: string;
  occlusalStaining: string;
  shadeGuide: ShadeGuide | null;
  shadeNotes: string;
  trialRequirements: string;
  implantDetails?: {
    companyName: string;
    systemName: string;
    remarks: string;
    photo?: File;
  };
  selectedProducts: Product[];
}

export interface ToothDetail {
  teethNumber: number;
  type: "abutment" | "pontic";
  productName: string[];
  productQuantity: number;
  shadeDetails?: string;
  occlusalStaining?: string;
  shadeGuide?: ShadeGuide | null;
  shadeNotes?: string;
  trialRequirements?: string;
  implantDetails?: {
    companyName: string;
    systemName: string;
    remarks: string;
    photo?: File;
  };
}

export interface ToothGroup {
  groupType: "bridge" | "joint" | "separate" | "individual";
  prescriptionType: PrescriptionType;
  subcategoryType: string;
  shadeDetails: string;
  occlusalStaining: string;
  shadeGuide: ShadeGuide | null;
  shadeNotes: string;
  trialRequirements: string;
  selectedProducts: Product[];
  teethDetails: ToothDetail[][];
}

// Legacy interface for backward compatibility
export interface LegacyToothGroup {
  groupId: string;
  teeth: number[];
  type: "separate" | "joint" | "bridge";
  productType: "implant" | "crown-bridge";
  notes: string;
  material: string;
  shade: string;
  pontics?: number[];
  warning?: string;
  occlusalStaining?: string;
  ponticDesign?: string;
  trial?: string;
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

export interface Message {
  label: string;
  messageBy: string;
}

export interface UploadedFile {
  intraOralScan: File;
  faceScan: File;
  addPatientPhotos: File;
  referralImages: File;
}

export interface Accessorios {
  name: string;
  qut: number;
}

export interface PickUpData {
  pickUpDate: string;
  pickUpTime: string;
  pickUpMessage: string;
}

export interface CourierData {
  courierName: string;
  courierTrakingId: string;
}

export interface FormData {
  // --- Core order fields ---
  id: string;
  orderId: string;
  refId: string;
  crateNo: string;
  clinicId: string;

  orderType: OrderCategoryType;
  firstName: string;
  lastName: string;
  age: string | number;
  sex: string;
  caseHandleBy: string;
  doctorMobileNumber: string;
  consultingDoctorName: string;
  consultingDoctorMobileNumber: string;
  orderMethod: OrderMethodType;
  prescriptionType: PrescriptionType;
  prescriptionTypesId: string[];
  subPrescriptionTypes: string;
  subPrescriptionTypesId: string[];
  selectedTeeth: SelectedTooth[];
  teethGroup: ToothGroup[];
  restorationType: string | null;
  productSelection: string | null;
  teethNumbers: string[] | null;
  products?: Array<{
    id: string;
    name: string;
    category: string;
    material: string;
    description: string;
    quantity: number;
  }>;
  files: UploadedFile;

  accessorios: Accessorios[];

  handllingType: string;
  pickupData: PickUpData[];
  courierData: CourierData[];

  resonOfReject: string;
  resonOfRescan: string;
  rejectNote: string;
  orderBy: string;

  AcpectedDileveryData: Date;
  // expectedDeliveryDate: string | null;

  lifeCycle: [];

  orderStatus: string;

  orderDate: string;
  updateDate: string;
  paymentType: string;
  paymentStatus: string;
  totalAmount: string | null;

  abutmentDetails?: {
    abutmentType: string;
    quantity: number;
    cementType?: string;
    product: {
      name: string;
      provider: string;
    }[];
  } | null;

  abutmentType: string;
  restorationProducts: any[];
  ponticDesign: string | null;
  occlusalStaining: string;
  shadeInstruction: string | null;
  clearance: string | null;
  otherAccessory: string | null;
  returnAccessories: boolean | undefined;
  notes: string | null;
  additionalNote: string;
  scanBooking: {
    areaManagerId: string;
    scanDate: string;
    scanTime: string;
    notes: string;
    trackingId: string;
    courierName: string;
  };
  teethEditedByUser?: boolean;
  previousOrderId: string | null;
  repairOrderId: string | null;
  issueDescription: string | null;
  repairType: string | null;
  returnWithTrial: boolean;

  // --- Order display fields (for OrderCard) ---
  percentage: number;
  isUrgent: boolean;
}

export interface Step {
  number: number;
  title: string;
  description: string;
}
