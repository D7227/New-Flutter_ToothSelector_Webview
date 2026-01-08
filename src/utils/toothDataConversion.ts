import type { ToothGroup, SelectedTooth, LegacyToothGroup, PrescriptionType } from "@/components/order-wizard/types/orderTypes";

/**
 * Convert new ToothGroup format to legacy format for backward compatibility
 * @param groups Array of ToothGroup objects
 * @returns Array of LegacyToothGroup objects
 */
export const convertToLegacyFormat = (groups: ToothGroup[]): LegacyToothGroup[] => {
  return groups.map(group => ({
    groupId: group.groupId || `group-${Date.now()}`,
    teeth: group.teethDetails.flat().map(t => t.teethNumber),
    type: group.groupType === 'individual' ? 'separate' : group.groupType,
    productType: group.prescriptionType === 'implant' ? 'implant' : 'crown-bridge',
    notes: group.shadeNotes,
    material: group.selectedProducts.map(p => p.material).join(', '),
    shade: group.shadeDetails,
    pontics: group.teethDetails.flat().filter(t => t.type === 'pontic').map(t => t.teethNumber),
    warning: group.warnings?.join('; '),
    occlusalStaining: group.occlusalStaining,
    trial: group.trialRequirements,
    products: group.selectedProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      material: p.material,
      description: p.description,
      quantity: p.quantity,
    })),
  }));
};

/**
 * Convert legacy format to new ToothGroup format
 * @param legacyGroups Array of LegacyToothGroup objects
 * @returns Array of ToothGroup objects
 */
export const convertFromLegacyFormat = (legacyGroups: LegacyToothGroup[]): ToothGroup[] => {
  return legacyGroups.map(legacy => ({
    groupId: legacy.groupId,
    groupType: legacy.type === 'separate' ? 'individual' : legacy.type,
    prescriptionType: (legacy.productType === 'implant' ? 'implant' : 'fixed-restoration') as PrescriptionType,
    subcategoryType: '',
    shadeDetails: legacy.shade,
    occlusalStaining: legacy.occlusalStaining || '',
    shadeGuide: null,
    shadeNotes: legacy.notes || '',
    trialRequirements: legacy.trial || '',
    selectedProducts: legacy.products?.map(p => ({
      id: p.id,
      name: p.name,
      category: (legacy.productType === 'implant' ? 'implant' : 'fixed-restoration') as PrescriptionType,
      material: p.material,
      description: p.description,
      quantity: p.quantity,
    })) || [],
    teethDetails: [
      legacy.teeth.map((toothNum: number) => ({
        teethNumber: toothNum,
        type: legacy.pontics?.includes(toothNum) ? 'pontic' as const : 'abutment' as const,
        productName: [],
        productQuantity: 1,
      })),
    ],
    warnings: legacy.warning ? [legacy.warning] : undefined,
  }));
};

/**
 * Convert ToothGroup array to SelectedTooth array
 * Flattens all teeth from all groups into individual selections
 * @param groups Array of ToothGroup objects
 * @returns Array of SelectedTooth objects
 */
export const convertGroupsToSelectedTeeth = (groups: ToothGroup[]): SelectedTooth[] => {
  const selectedTeeth: SelectedTooth[] = [];
  
  groups.forEach(group => {
    group.teethDetails.flat().forEach(tooth => {
      selectedTeeth.push({
        type: tooth.type,
        toothNumber: tooth.teethNumber,
        prescriptionType: group.prescriptionType === 'implant' ? 'implant' : 'crown-bridge',
        subcategoryType: group.subcategoryType,
        productName: tooth.productName,
        shadeDetails: tooth.shadeDetails || group.shadeDetails,
        occlusalStaining: tooth.occlusalStaining || group.occlusalStaining,
        shadeGuide: tooth.shadeGuide || group.shadeGuide,
        shadeNotes: tooth.shadeNotes || group.shadeNotes,
        trialRequirements: tooth.trialRequirements || group.trialRequirements,
        implantDetails: tooth.implantDetails,
        selectedProducts: group.selectedProducts,
      });
    });
  });
  
  return selectedTeeth;
};

/**
 * Merge selected teeth into groups based on adjacency and type
 * @param teeth Array of SelectedTooth objects
 * @returns Array of ToothGroup objects
 */
export const mergeTeethIntoGroups = (teeth: SelectedTooth[]): ToothGroup[] => {
  if (teeth.length === 0) return [];
  
  // Sort teeth by number
  const sortedTeeth = [...teeth].sort((a, b) => a.toothNumber - b.toothNumber);
  
  const groups: ToothGroup[] = [];
  let currentGroup: SelectedTooth[] = [sortedTeeth[0]];
  
  for (let i = 1; i < sortedTeeth.length; i++) {
    const prev = sortedTeeth[i - 1];
    const current = sortedTeeth[i];
    
    // Check if adjacent and same prescription type
    const quadrant1 = Math.floor(prev.toothNumber / 10);
    const quadrant2 = Math.floor(current.toothNumber / 10);
    const isAdjacent = quadrant1 === quadrant2 && Math.abs(prev.toothNumber - current.toothNumber) === 1;
    const sameType = prev.prescriptionType === current.prescriptionType && 
                     prev.subcategoryType === current.subcategoryType;
    
    if (isAdjacent && sameType) {
      currentGroup.push(current);
    } else {
      // Create group from current group
      groups.push(createGroupFromTeeth(currentGroup));
      currentGroup = [current];
    }
  }
  
  // Add last group
  groups.push(createGroupFromTeeth(currentGroup));
  
  return groups;
};

/**
 * Helper function to create a ToothGroup from an array of SelectedTooth
 * @param teeth Array of SelectedTooth objects
 * @returns ToothGroup object
 */
const createGroupFromTeeth = (teeth: SelectedTooth[]): ToothGroup => {
  const firstTooth = teeth[0];
  const hasPontic = teeth.some(t => t.type === 'pontic');
  const hasMultiple = teeth.length > 1;
  
  let groupType: "bridge" | "joint" | "separate" | "individual";
  if (hasPontic && hasMultiple) {
    groupType = 'bridge';
  } else if (hasMultiple) {
    groupType = 'joint';
  } else {
    groupType = 'individual';
  }
  
  return {
    groupId: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    groupType,
    prescriptionType: firstTooth.prescriptionType === 'implant' ? 'implant' : 'fixed-restoration',
    subcategoryType: firstTooth.subcategoryType,
    shadeDetails: firstTooth.shadeDetails,
    occlusalStaining: firstTooth.occlusalStaining,
    shadeGuide: firstTooth.shadeGuide,
    shadeNotes: firstTooth.shadeNotes,
    trialRequirements: firstTooth.trialRequirements,
    selectedProducts: firstTooth.selectedProducts,
    teethDetails: [
      teeth.map(tooth => ({
        teethNumber: tooth.toothNumber,
        type: tooth.type,
        productName: tooth.productName,
        productQuantity: 1,
        shadeDetails: tooth.shadeDetails,
        occlusalStaining: tooth.occlusalStaining,
        shadeGuide: tooth.shadeGuide,
        shadeNotes: tooth.shadeNotes,
        trialRequirements: tooth.trialRequirements,
        implantDetails: tooth.implantDetails,
      })),
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Deep clone a ToothGroup object
 * @param group ToothGroup to clone
 * @returns Cloned ToothGroup
 */
export const cloneToothGroup = (group: ToothGroup): ToothGroup => {
  return {
    ...group,
    groupId: group.groupId ? `${group.groupId}-copy` : undefined,
    shadeGuide: group.shadeGuide ? { ...group.shadeGuide } : null,
    selectedProducts: group.selectedProducts.map(p => ({ ...p })),
    teethDetails: group.teethDetails.map(row => 
      row.map(tooth => ({
        ...tooth,
        implantDetails: tooth.implantDetails ? { ...tooth.implantDetails } : undefined,
      }))
    ),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Sanitize tooth group data for safe storage/transmission
 * @param group ToothGroup to sanitize
 * @returns Sanitized ToothGroup
 */
export const sanitizeToothGroup = (group: ToothGroup): ToothGroup => {
  const sanitizeString = (str: string): string => {
    return str.replace(/<[^>]*>/g, '').trim();
  };
  
  return {
    ...group,
    shadeNotes: sanitizeString(group.shadeNotes),
    trialRequirements: sanitizeString(group.trialRequirements),
    teethDetails: group.teethDetails.map(row =>
      row.map(tooth => ({
        ...tooth,
        shadeNotes: tooth.shadeNotes ? sanitizeString(tooth.shadeNotes) : undefined,
        trialRequirements: tooth.trialRequirements ? sanitizeString(tooth.trialRequirements) : undefined,
        implantDetails: tooth.implantDetails ? {
          ...tooth.implantDetails,
          remarks: sanitizeString(tooth.implantDetails.remarks),
        } : undefined,
      }))
    ),
  };
};

/**
 * Export tooth selection data to JSON
 * @param groups Array of ToothGroup objects
 * @param teeth Array of SelectedTooth objects
 * @returns JSON string
 */
export const exportToothSelectionToJSON = (groups: ToothGroup[], teeth: SelectedTooth[]): string => {
  return JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    groups,
    teeth,
  }, null, 2);
};

/**
 * Import tooth selection data from JSON
 * @param jsonString JSON string to import
 * @returns Object with groups and teeth arrays
 */
export const importToothSelectionFromJSON = (jsonString: string): { groups: ToothGroup[]; teeth: SelectedTooth[] } => {
  try {
    const data = JSON.parse(jsonString);
    return {
      groups: data.groups || [],
      teeth: data.teeth || [],
    };
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};
