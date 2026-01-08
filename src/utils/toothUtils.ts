import type { ToothGroup, ToothDetail } from "@/components/order-wizard/types/orderTypes";

/**
 * Check if two teeth are strictly adjacent (consecutive numbers in same quadrant)
 * @param tooth1 First tooth number (FDI notation)
 * @param tooth2 Second tooth number (FDI notation)
 * @returns true if teeth are adjacent, false otherwise
 */
export const areTeethStrictlyAdjacent = (tooth1: number, tooth2: number): boolean => {
  const quadrant1 = Math.floor(tooth1 / 10);
  const quadrant2 = Math.floor(tooth2 / 10);
  
  // Must be in same quadrant
  if (quadrant1 !== quadrant2) return false;
  
  // Must be consecutive numbers
  return Math.abs(tooth1 - tooth2) === 1;
};

/**
 * Validate a sequence of teeth for adjacency
 * @param teeth Array of tooth numbers
 * @returns Validation result with errors if any
 */
export const validateTeethSequence = (teeth: number[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const sortedTeeth = [...teeth].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedTeeth.length - 1; i++) {
    if (!areTeethStrictlyAdjacent(sortedTeeth[i], sortedTeeth[i + 1])) {
      errors.push(`Teeth ${sortedTeeth[i]} and ${sortedTeeth[i + 1]} are not adjacent`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get the quadrant of a tooth (1-4)
 * @param toothNumber Tooth number in FDI notation
 * @returns Quadrant number (1=UR, 2=UL, 3=LL, 4=LR)
 */
export const getToothQuadrant = (toothNumber: number): 1 | 2 | 3 | 4 => {
  return Math.floor(toothNumber / 10) as 1 | 2 | 3 | 4;
};

/**
 * Get the position of a tooth within its quadrant (1-8)
 * @param toothNumber Tooth number in FDI notation
 * @returns Position within quadrant (1-8)
 */
export const getToothPosition = (toothNumber: number): number => {
  return toothNumber % 10;
};

/**
 * Convert FDI notation to Palmer notation
 * @param fdiNumber Tooth number in FDI notation
 * @returns Palmer notation string
 */
export const getPalmerNotation = (fdiNumber: number): string => {
  const quadrant = getToothQuadrant(fdiNumber);
  const position = getToothPosition(fdiNumber);
  
  const quadrantSymbols = {
    1: '┘', // Upper right
    2: '└', // Upper left
    3: '┌', // Lower left
    4: '┐', // Lower right
  };
  
  return `${position}${quadrantSymbols[quadrant]}`;
};

/**
 * Check if two teeth are in the same jaw (upper or lower)
 * @param tooth1 First tooth number
 * @param tooth2 Second tooth number
 * @returns true if in same jaw
 */
export const areInSameJaw = (tooth1: number, tooth2: number): boolean => {
  const quadrant1 = getToothQuadrant(tooth1);
  const quadrant2 = getToothQuadrant(tooth2);
  
  // Quadrants 1 and 2 are upper jaw
  // Quadrants 3 and 4 are lower jaw
  const jaw1 = quadrant1 <= 2 ? 'upper' : 'lower';
  const jaw2 = quadrant2 <= 2 ? 'upper' : 'lower';
  
  return jaw1 === jaw2;
};

/**
 * Check if a tooth is in the upper jaw
 * @param toothNumber Tooth number
 * @returns true if upper jaw
 */
export const isUpperJaw = (toothNumber: number): boolean => {
  const quadrant = getToothQuadrant(toothNumber);
  return quadrant === 1 || quadrant === 2;
};

/**
 * Check if a tooth is in the lower jaw
 * @param toothNumber Tooth number
 * @returns true if lower jaw
 */
export const isLowerJaw = (toothNumber: number): boolean => {
  return !isUpperJaw(toothNumber);
};

/**
 * Split a tooth group at a specific point
 * @param group The tooth group to split
 * @param splitIndex Index where to split (tooth at this index goes to first fragment)
 * @returns Array of two new tooth groups
 */
export const splitGroupAtPoint = (group: ToothGroup, splitIndex: number): ToothGroup[] => {
  const allTeeth = group.teethDetails.flat();
  
  if (splitIndex < 0 || splitIndex >= allTeeth.length - 1) {
    throw new Error('Invalid split index');
  }
  
  const fragment1Teeth = allTeeth.slice(0, splitIndex + 1);
  const fragment2Teeth = allTeeth.slice(splitIndex + 1);
  
  // Validate fragments
  const fragment1Valid = validateTeethSequence(fragment1Teeth.map(t => t.teethNumber));
  const fragment2Valid = validateTeethSequence(fragment2Teeth.map(t => t.teethNumber));
  
  if (!fragment1Valid.isValid || !fragment2Valid.isValid) {
    throw new Error('Invalid split point - would create non-adjacent fragments');
  }
  
  const baseGroupId = group.groupId || `group-${Date.now()}`;
  
  return [
    {
      ...group,
      groupId: `${baseGroupId}-1`,
      teethDetails: [fragment1Teeth],
      updatedAt: new Date(),
    },
    {
      ...group,
      groupId: `${baseGroupId}-2`,
      teethDetails: [fragment2Teeth],
      updatedAt: new Date(),
    },
  ];
};

/**
 * Validate a tooth group for common issues
 * @param group Tooth group to validate
 * @returns Validation result with errors
 */
export const validateToothGroup = (group: ToothGroup): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate adjacency for bridges and joints
  if (group.groupType === 'bridge' || group.groupType === 'joint') {
    const teeth = group.teethDetails.flat().map(t => t.teethNumber).sort((a, b) => a - b);
    
    for (let i = 0; i < teeth.length - 1; i++) {
      const current = teeth[i];
      const next = teeth[i + 1];
      
      const quadrant1 = Math.floor(current / 10);
      const quadrant2 = Math.floor(next / 10);
      
      if (quadrant1 !== quadrant2) {
        errors.push(`Teeth ${current} and ${next} are in different quadrants`);
      } else if (Math.abs(current - next) !== 1) {
        errors.push(`Teeth ${current} and ${next} are not adjacent`);
      }
    }
  }
  
  // Validate bridge has at least one abutment
  if (group.groupType === 'bridge') {
    const hasAbutment = group.teethDetails.flat().some(t => t.type === 'abutment');
    if (!hasAbutment) {
      errors.push('Bridge must have at least one abutment tooth');
    }
    
    // Validate bridge has at least 2 teeth
    const totalTeeth = group.teethDetails.flat().length;
    if (totalTeeth < 2) {
      errors.push('Bridge must have at least 2 teeth');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Find valid adjacent fragments from a list of teeth
 * Used when splitting groups or validating selections
 * @param teeth Array of tooth numbers
 * @returns Array of valid adjacent tooth fragments
 */
export const findValidAdjacentFragments = (teeth: number[]): number[][] => {
  if (teeth.length === 0) return [];
  
  const sortedTeeth = [...teeth].sort((a, b) => a - b);
  const fragments: number[][] = [];
  let currentFragment: number[] = [sortedTeeth[0]];
  
  for (let i = 1; i < sortedTeeth.length; i++) {
    if (areTeethStrictlyAdjacent(sortedTeeth[i - 1], sortedTeeth[i])) {
      currentFragment.push(sortedTeeth[i]);
    } else {
      fragments.push(currentFragment);
      currentFragment = [sortedTeeth[i]];
    }
  }
  
  fragments.push(currentFragment);
  return fragments;
};

/**
 * Generate a unique group ID
 * @returns Unique group identifier
 */
export const generateGroupId = (): string => {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a tooth number is valid (FDI notation)
 * @param toothNumber Tooth number to validate
 * @returns true if valid
 */
export const isValidToothNumber = (toothNumber: number): boolean => {
  // Valid FDI notation: 11-18, 21-28, 31-38, 41-48
  const validRanges = [
    [11, 18], [21, 28], [31, 38], [41, 48]
  ];
  
  return validRanges.some(([min, max]) => toothNumber >= min && toothNumber <= max);
};

/**
 * Get all teeth in a specific arch
 * @param arch 'upper' or 'lower'
 * @returns Array of tooth numbers in that arch
 */
export const getTeethInArch = (arch: 'upper' | 'lower'): number[] => {
  if (arch === 'upper') {
    return [
      11, 12, 13, 14, 15, 16, 17, 18, // Upper right
      21, 22, 23, 24, 25, 26, 27, 28, // Upper left
    ];
  } else {
    return [
      31, 32, 33, 34, 35, 36, 37, 38, // Lower left
      41, 42, 43, 44, 45, 46, 47, 48, // Lower right
    ];
  }
};

/**
 * Get all teeth in a specific quadrant
 * @param quadrant Quadrant number (1-4)
 * @returns Array of tooth numbers in that quadrant
 */
export const getTeethInQuadrant = (quadrant: 1 | 2 | 3 | 4): number[] => {
  const base = quadrant * 10;
  return Array.from({ length: 8 }, (_, i) => base + i + 1);
};
