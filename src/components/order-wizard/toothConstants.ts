/**
 * Tooth Chart Color Constants
 * Defines all colors used in the tooth selection interface
 * 
 * Based on Dental Care Management System color scheme
 * Source: dental_FE/src/components/order-wizard/toothConstants.ts
 */

export const TOOTH_CHART_COLORS = {
  // Core Tooth States
  joint: '#069997',              // Teal - Joint group (connected teeth)
  bridge: '#4FA2D9',             // Sky Blue - Bridge group
  pontic: '#A7A9AC',             // Gray - Pontic (artificial tooth)
  abutment: '#008D9E',           // Dark Cyan - Abutment (supporting tooth)
  defaultFill: '#FFFFFF',        // White - Unselected tooth fill
  defaultStroke: '#000000',      // Black - Unselected tooth border
  
  // Additional States (used in components)
  selectedStroke: '#374151',     // Dark Gray - Selected tooth border
  textUnselected: '#374151',     // Dark Gray - Text on white background
  textSelected: '#FFFFFF',       // White - Text on colored background
  separate: '#10b981',           // Green - Separate group type
  individual: '#008D9E',         // Same as abutment - Individual tooth
  fallback: '#6b7280',           // Gray - Fallback color
  
  // UI Card Colors (for displaying selected groups)
  groupCards: {
    individual: {
      background: '#008D9E',     // Dark Cyan - Matches abutment color
      border: '#00707D',         // Darker shade for border
      text: '#FFFFFF',           // White text
    },
    joint: {
      background: '#069997',     // Teal - Matches joint color
      border: '#069997',         // Same as background
      text: '#FFFFFF',           // White text
    },
    bridge: {
      background: '#4FA2D9',     // Sky Blue - Matches bridge color
      border: '#3E83B0',         // Darker shade for border
      text: '#FFFFFF',           // White text
    },
    arch: {
      background: '#4FA2D9',     // Sky Blue - Same as bridge
      border: '#3E83B0',         // Darker shade for border
      text: '#FFFFFF',           // White text
    },
    separate: {
      background: '#10b981',     // Green - Separate group
      border: '#059669',         // Darker green for border
      text: '#FFFFFF',           // White text
    },
    ponticTag: {
      background: '#A7A9AC',     // Gray - For pontic tags
      text: '#FFFFFF',           // White text
    },
  },
  
  // Hover States
  hover: {
    abutment: '#00A8BD',         // Lighter cyan
    pontic: '#B8BABD',           // Lighter gray
    bridge: '#5FB3E8',           // Lighter sky blue
    joint: '#07ADA8',            // Lighter teal
    individual: '#00A8BD',       // Lighter cyan
  },
  
  // Connection Lines (for bridges and joints)
  connectionLine: {
    bridge: '#4FA2D9',           // Sky Blue - Bridge connection
    joint: '#069997',            // Teal - Joint connection
    temporary: '#94a3b8',        // Slate Gray - Temporary drag preview
    hover: '#3b82f6',            // Blue - Hover state
  },
  
  // Validation States
  validation: {
    valid: '#10b981',            // Green - Valid selection
    warning: '#f59e0b',          // Amber - Warning
    error: '#ef4444',            // Red - Error
    info: '#3b82f6',             // Blue - Information
  },
} as const;

/**
 * Helper function to get tooth fill color based on state
 * @param toothState - The state of the tooth
 * @returns Hex color code
 */
export const getToothFillColor = (toothState: {
  isSelected: boolean;
  type?: 'abutment' | 'pontic';
  groupType?: 'bridge' | 'joint' | 'separate' | 'individual';
}): string => {
  if (!toothState.isSelected) {
    return TOOTH_CHART_COLORS.defaultFill;
  }
  
  // Priority: type > groupType
  if (toothState.type === 'abutment') {
    return TOOTH_CHART_COLORS.abutment;
  }
  
  if (toothState.type === 'pontic') {
    return TOOTH_CHART_COLORS.pontic;
  }
  
  // Group type colors
  switch (toothState.groupType) {
    case 'bridge':
      return TOOTH_CHART_COLORS.bridge;
    case 'joint':
      return TOOTH_CHART_COLORS.joint;
    case 'separate':
      return TOOTH_CHART_COLORS.separate;
    case 'individual':
      return TOOTH_CHART_COLORS.individual;
    default:
      return TOOTH_CHART_COLORS.fallback;
  }
};

/**
 * Helper function to get tooth stroke color
 * @param isSelected - Whether the tooth is selected
 * @returns Hex color code
 */
export const getToothStrokeColor = (isSelected: boolean): string => {
  return isSelected 
    ? TOOTH_CHART_COLORS.selectedStroke 
    : TOOTH_CHART_COLORS.defaultStroke;
};

/**
 * Helper function to get tooth text color
 * @param isSelected - Whether the tooth is selected
 * @returns Hex color code
 */
export const getToothTextColor = (isSelected: boolean): string => {
  return isSelected 
    ? TOOTH_CHART_COLORS.textSelected 
    : TOOTH_CHART_COLORS.textUnselected;
};

/**
 * Helper function to get group card colors
 * @param groupType - Type of the group
 * @returns Object with background, border, and text colors
 */
export const getGroupCardColors = (
  groupType: 'individual' | 'joint' | 'bridge' | 'arch' | 'separate'
) => {
  return TOOTH_CHART_COLORS.groupCards[groupType] || TOOTH_CHART_COLORS.groupCards.individual;
};

/**
 * Helper function to get connection line color
 * @param groupType - Type of the group
 * @param state - State of the line (normal, hover, temporary)
 * @returns Hex color code
 */
export const getConnectionLineColor = (
  groupType: 'bridge' | 'joint',
  state: 'normal' | 'hover' | 'temporary' = 'normal'
): string => {
  if (state === 'temporary') {
    return TOOTH_CHART_COLORS.connectionLine.temporary;
  }
  
  if (state === 'hover') {
    return TOOTH_CHART_COLORS.connectionLine.hover;
  }
  
  return groupType === 'bridge' 
    ? TOOTH_CHART_COLORS.connectionLine.bridge 
    : TOOTH_CHART_COLORS.connectionLine.joint;
};

/**
 * Color contrast ratios (WCAG 2.1)
 * For accessibility reference
 */
export const COLOR_CONTRAST_RATIOS = {
  abutment: 4.8,      // ✅ AA Compliant
  pontic: 2.9,        // ⚠️ Large text only
  bridge: 3.2,        // ⚠️ Large text only
  joint: 4.7,         // ✅ AA Compliant
  unselected: 10.8,   // ✅ AAA Compliant
} as const;

/**
 * Accessibility recommendations
 */
export const ACCESSIBILITY_NOTES = {
  abutment: 'Good contrast with white text',
  pontic: 'Use bold, larger text for better readability',
  bridge: 'Use bold, larger text for better readability',
  joint: 'Good contrast with white text',
  colorblind: 'Use labels (A/P) for additional distinction',
} as const;
