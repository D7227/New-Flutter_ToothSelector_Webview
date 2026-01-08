import React, { useState, useRef, useEffect } from 'react';
import { ToothGroup } from '../types/tooth';
import { TOOTH_CHART_COLORS } from '../toothConstants';

interface SelectedTooth {
  toothNumber: number;
  type: 'abutment' | 'pontic';
}

interface ToothChartProps {
  selectedGroups: ToothGroup[];
  selectedTeeth: SelectedTooth[];
  onToothClick: (toothNumber: number, event: React.MouseEvent) => void;
  onDragConnection: (teeth: number[] | number, splitData?: any) => void;
  isToothSelected: (toothNumber: number) => boolean;
  getToothType: (toothNumber: number) => 'abutment' | 'pontic' | null;
  onGroupsChange: (groups: ToothGroup[]) => void;
  setSelectedTeeth: React.Dispatch<React.SetStateAction<SelectedTooth[]>>;
  readMode?: boolean;
}

const ToothChart = ({
  selectedGroups,
  selectedTeeth,
  onToothClick,
  onDragConnection,
  isToothSelected,
  getToothType,
  onGroupsChange,
  setSelectedTeeth,
  readMode = false,
}: ToothChartProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragLine, setDragLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [connectionChain, setConnectionChain] = useState<number[]>([]);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [lastHoveredDot, setLastHoveredDot] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // --- Touch support for mobile (robust: tap = select, drag = connect) ---
  const [touchStartInfo, setTouchStartInfo] = useState<{tooth: number|null, x: number, y: number, time: number}|null>(null);

  // Helper to get SVG coordinates from clientX/clientY
  function getSvgCoords(svg: SVGSVGElement, clientX: number, clientY: number) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      return pt.matrixTransform(ctm.inverse());
    }
    return { x: 0, y: 0 };
  }

  // Update getClientXY to use getSvgCoords
  function getClientXY(event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent, svg: SVGSVGElement) {
    if ('touches' in event && event.touches.length > 0) {
      return getSvgCoords(svg, event.touches[0].clientX, event.touches[0].clientY);
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      return getSvgCoords(svg, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    } else if ('clientX' in event && 'clientY' in event) {
      return getSvgCoords(svg, event.clientX, event.clientY);
    }
    return null;
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!svgRef.current) return;
    const { x, y } = getClientXY(e, svgRef.current) || { x: 0, y: 0 };
    // Find closest dot
    let closestTooth: number | null = null;
    let minDistance = 24;
    const allTeeth = [
      ...selectedTeeth.map(t => t.toothNumber),
      ...selectedGroups.flatMap(g => g.teeth)
    ];
    for (const toothNumber of allTeeth) {
      const dotPos = getDotPosition(toothNumber);
      const distance = Math.sqrt(Math.pow(x - dotPos.x, 2) + Math.pow(y - dotPos.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestTooth = toothNumber;
      }
    }
    if (closestTooth !== null) {
      setTouchStartInfo({ tooth: closestTooth, x, y, time: Date.now() });
      // Do not start drag yet; wait for move threshold
    } else {
      setTouchStartInfo(null);
    }
  };

  const TOUCH_DETECTION_RADIUS = 24; // px, for mobile drag

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!svgRef.current) return;
    if (!isDragging || !dragStart) return;
    e.preventDefault();
    const { x, y } = getClientXY(e, svgRef.current) || { x: 0, y: 0 };
    setMousePosition({ x, y });
    const startPos = getDotPosition(dragStart);
    setDragLine({ x1: startPos.x, y1: startPos.y, x2: x, y2: y });
    // Only add to chain if dragging and not already in chain
    let closestTooth: number | null = null;
    let minDistance = 24;
    const allTeeth = [
      ...selectedTeeth.map(t => t.toothNumber),
      ...selectedGroups.flatMap(g => g.teeth)
    ];
    for (const toothNumber of allTeeth) {
      if (connectionChain.includes(toothNumber)) continue;
      const dotPos = getDotPosition(toothNumber);
      const distance = Math.sqrt(Math.pow(x - dotPos.x, 2) + Math.pow(y - dotPos.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestTooth = toothNumber;
      }
    }
    if (closestTooth !== null) {
      setConnectionChain(prev => [...prev, closestTooth]);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !dragStart) return;
    finishConnection();
    setDragLine(null);
    setIsDragging(false);
    setDragStart(null);
    setMousePosition(null);
  };

  // Add global touch event listeners for drag
  useEffect(() => {
    const handleGlobalTouchMove = (event: TouchEvent) => {
      if (!svgRef.current) return;
      if (isDragging || touchStartInfo) {
        event.preventDefault();
        const { x, y } = getClientXY(event, svgRef.current) || { x: 0, y: 0 };
        if (touchStartInfo && !isDragging) {
          const dx = x - touchStartInfo.x;
          const dy = y - touchStartInfo.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 12) {
            handleDotMouseDown(touchStartInfo.tooth!, event as any);
          }
        }
        setMousePosition({ x, y });
        if (isDragging && dragStart) {
          const startPos = getDotPosition(dragStart);
          setDragLine({ x1: startPos.x, y1: startPos.y, x2: x, y2: y });
        }
      }
    };
    const handleGlobalTouchEnd = (event: TouchEvent) => {
      if (!svgRef.current) return;
      const { x, y } = getClientXY(event, svgRef.current) || { x: 0, y: 0 };
      if (touchStartInfo) {
        const dx = x - touchStartInfo.x;
        const dy = y - touchStartInfo.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const dt = Date.now() - touchStartInfo.time;
        if (dist < 10 && dt < 400) {
          onToothClick(touchStartInfo.tooth!, event as any);
          setTouchStartInfo(null);
          return;
        }
      }
      if (isDragging) {
        event.preventDefault();
        handleMouseUp(event as any);
      }
      setTouchStartInfo(null);
    };
    if (isDragging || touchStartInfo) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
    }
    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragStart, connectionChain, touchStartInfo]);

  // Add global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDragging && svgRef.current) {
        const { x, y } = getClientXY(event, svgRef.current) || { x: 0, y: 0 };
        
        // Check if mouse is within SVG bounds
        if (x >= 0 && x <= svgRef.current.getBoundingClientRect().width && y >= 0 && y <= svgRef.current.getBoundingClientRect().height) {
          setMousePosition({ x, y });
          if (dragStart) {
            const startPos = getDotPosition(dragStart);
            setDragLine({ x1: startPos.x, y1: startPos.y, x2: x, y2: y });
          }
        }
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (isDragging) {
        handleMouseUp(event as any);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, connectionChain]);

  // Palmer notation mapping function
  const getPalmerNotation = (fdiNumber: number): string => {
    const mapping: Record<number, string> = {
      // Upper Right (Quadrant 1): 11-18 -> 1-8 (from center outward)
      11: '1', 12: '2', 13: '3', 14: '4', 15: '5', 16: '6', 17: '7', 18: '8',
      // Upper Left (Quadrant 2): 21-28 -> 1-8 (from center outward)
      21: '1', 22: '2', 23: '3', 24: '4', 25: '5', 26: '6', 27: '7', 28: '8',
      // Lower Left (Quadrant 3): 31-38 -> 1-8 (from center outward)
      31: '1', 32: '2', 33: '3', 34: '4', 35: '5', 36: '6', 37: '7', 38: '8',
      // Lower Right (Quadrant 4): 41-48 -> 1-8 (from center outward)
      41: '1', 42: '2', 43: '3', 44: '4', 45: '5', 46: '6', 47: '7', 48: '8'
    };
    return mapping[fdiNumber] || fdiNumber.toString();
  };

  // STRICT adjacency check - only allows directly adjacent teeth based on FDI numbering
  const areTeethStrictlyAdjacent = (tooth1: number, tooth2: number): boolean => {
    
    // Define arch sequences (FDI numbering)
    const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
    const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
    const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
    const lowerRight = [41, 42, 43, 44, 45, 46, 47, 48];
    
    // Check adjacency within same quadrant
    const checkQuadrantAdjacency = (quadrant: number[]) => {
      const index1 = quadrant.indexOf(tooth1);
      const index2 = quadrant.indexOf(tooth2);
      if (index1 !== -1 && index2 !== -1) {
        return Math.abs(index1 - index2) === 1;
      }
      return false;
    };
    
    // Check within each quadrant
    if (checkQuadrantAdjacency(upperRight)) return true;
    if (checkQuadrantAdjacency(upperLeft)) return true;
    if (checkQuadrantAdjacency(lowerLeft)) return true;
    if (checkQuadrantAdjacency(lowerRight)) return true;
    
    // Special cross-quadrant connections (center line)
    if ((tooth1 === 11 && tooth2 === 21) || (tooth1 === 21 && tooth2 === 11)) return true;
    if ((tooth1 === 31 && tooth2 === 41) || (tooth1 === 41 && tooth2 === 31)) return true;
    if ((tooth1 === 32 && tooth2 === 42) || (tooth1 === 42 && tooth2 === 32)) return true;
    
    return false;
  };

  // Check if two teeth are in the same jaw (for drag validation)
  const areInSameJaw = (tooth1: number, tooth2: number): boolean => {
    const getArch = (tooth: number) => {
      if (tooth >= 11 && tooth <= 18) return 'upperRight';
      if (tooth >= 21 && tooth <= 28) return 'upperLeft'; 
      if (tooth >= 31 && tooth <= 38) return 'lowerLeft';
      if (tooth >= 41 && tooth <= 48) return 'lowerRight';
      return null;
    };
    
    const arch1 = getArch(tooth1);
    const arch2 = getArch(tooth2);
    
    // Allow connections within the same jaw (upper or lower)
    if ((arch1 === 'upperRight' || arch1 === 'upperLeft') && 
        (arch2 === 'upperRight' || arch2 === 'upperLeft')) {
      return true;
    }
    if ((arch1 === 'lowerRight' || arch1 === 'lowerLeft') && 
        (arch2 === 'lowerRight' || arch2 === 'lowerLeft')) {
      return true;
    }
    
    return false;
  };

  // Get tooth fill color based on selection state
  const getToothFillColor = (toothNumber: number): string => {
    const type = getToothType(toothNumber);
    if (!type) return TOOTH_CHART_COLORS.defaultFill;

    // Check if tooth is in a group
    const group = selectedGroups.find(g => g.teeth.includes(toothNumber));
    if (group) {
      if (type === 'pontic') return TOOTH_CHART_COLORS.pontic;
      return group.type === 'joint' ? TOOTH_CHART_COLORS.joint : TOOTH_CHART_COLORS.bridge;
    }

    // Individual teeth
    return type === 'pontic' ? TOOTH_CHART_COLORS.pontic : TOOTH_CHART_COLORS.abutment;
  };

  // Get tooth stroke color
  const getToothStrokeColor = (toothNumber: number): string => {
    const type = getToothType(toothNumber);
    if (!type) return TOOTH_CHART_COLORS.defaultStroke;

    // Selected teeth always use the selected stroke color
    return TOOTH_CHART_COLORS.selectedStroke;
  };

  // Get tooth position for dot placement
  const getToothPosition = (toothNumber: number): { x: number; y: number } => {
    const positions: Record<number, { x: number; y: number }> = {
      // Upper teeth
      11: { x: 186, y: 42 }, 12: { x: 154, y: 51 }, 13: { x: 131, y: 71 }, 14: { x: 116, y: 96 },
      15: { x: 102, y: 133 }, 16: { x: 89, y: 165 }, 17: { x: 77, y: 212 }, 18: { x: 72, y: 260 },
      
      21: { x: 224, y: 42 }, 22: { x: 256, y: 51 }, 23: { x: 279, y: 71 }, 24: { x: 294, y: 96 },
      25: { x: 308, y: 133 }, 26: { x: 321, y: 165 }, 27: { x: 333, y: 212 }, 28: { x: 338, y: 260 },
      
      // Lower teeth
      31: { x: 224, y: 580 }, 32: { x: 256, y: 571 }, 33: { x: 279, y: 551 }, 34: { x: 294, y: 526 },
      35: { x: 308, y: 489 }, 36: { x: 321, y: 457 }, 37: { x: 333, y: 410 }, 38: { x: 338, y: 362 },
      
      41: { x: 186, y: 580 }, 42: { x: 154, y: 571 }, 43: { x: 131, y: 551 }, 44: { x: 116, y: 526 },
      45: { x: 102, y: 489 }, 46: { x: 89, y: 457 }, 47: { x: 77, y: 410 }, 48: { x: 72, y: 362 }
    };
    return positions[toothNumber] || { x: 0, y: 0 };
  };

  // Get dot position (improved positioning for teeth 15-18)
  const getDotPosition = (toothNumber: number): { x: number; y: number } => {
    const toothPos = getToothPosition(toothNumber);
    const isUpperJaw = toothNumber >= 11 && toothNumber <= 28;
    
    // Special positioning for teeth 15-18 (upper right molars)
    if (toothNumber >= 15 && toothNumber <= 18) {
      const customPositions: Record<number, { x: number; y: number }> = {
        15: { x: 70, y: 115 },   // Updated position for tooth 15 (5)
        16: { x: 58, y: 155 },   // Adjusted for tooth 16  
        17: { x: 45, y: 210 },   // Updated position for tooth 17 (7)
        18: { x: 40, y: 260 }    // Updated position for tooth 18 (8)
      };
      return customPositions[toothNumber];
    }
    
    // Special positioning for teeth 25-28 (upper left molars) 
    if (toothNumber >= 25 && toothNumber <= 28) {
      const customPositions: Record<number, { x: number; y: number }> = {
        25: { x: 340, y: 115 },  // Updated position for tooth 25 (5 equivalent)
        26: { x: 352, y: 155 },  // Adjusted for tooth 26
        27: { x: 365, y: 210 },  // Updated position for tooth 27 (7 equivalent)
        28: { x: 370, y: 260 }   // Updated position for tooth 28 (8 equivalent)
      };
      return customPositions[toothNumber];
    }
    
    // Special positioning for teeth 35-38 (lower left molars)
    if (toothNumber >= 35 && toothNumber <= 38) {
      const customPositions: Record<number, { x: number; y: number }> = {
        35: { x: 340, y: 507 },  // Updated position for tooth 35 (5 equivalent)
        36: { x: 352, y: 467 },  // Adjusted for tooth 36
        37: { x: 365, y: 412 },  // Updated position for tooth 37 (7 equivalent)
        38: { x: 370, y: 362 }   // Updated position for tooth 38 (8 equivalent)
      };
      return customPositions[toothNumber];
    }
    
    // Special positioning for teeth 45-48 (lower right molars)
    if (toothNumber >= 45 && toothNumber <= 48) {
      const customPositions: Record<number, { x: number; y: number }> = {
        45: { x: 70, y: 507 },   // Updated position for tooth 45 (5 equivalent)
        46: { x: 58, y: 467 },   // Adjusted for tooth 46
        47: { x: 45, y: 412 },   // Updated position for tooth 47 (7 equivalent)
        48: { x: 40, y: 362 }    // Updated position for tooth 48 (8 equivalent)
      };
      return customPositions[toothNumber];
    }
    
    // Default positioning for other teeth (11-14, 21-24, 31-34, 41-44)
    const upperArchCenter = { x: 205, y: 150 };
    const lowerArchCenter = { x: 205, y: 470 };
    
    const archCenter = isUpperJaw ? upperArchCenter : lowerArchCenter;
    
    const dx = toothPos.x - archCenter.x;
    const dy = toothPos.y - archCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    const dotDistance = distance + 35;
    
    return {
      x: archCenter.x + (unitX * dotDistance),
      y: archCenter.y + (unitY * dotDistance)
    };
  };

  // Handle double-click on connection lines to split groups - with strict adjacency validation
  const handleLineDoubleClick = (group: ToothGroup, tooth1: number, tooth2: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Validate that the line we're splitting is actually valid (strictly adjacent)
    if (!areTeethStrictlyAdjacent(tooth1, tooth2)) {
      console.log('Cannot split non-adjacent connection');
      return;
    }

    if (group.teeth.length <= 2) {
      // If only 2 teeth, remove the group entirely and make them individual teeth
      console.log('Removing 2-tooth group completely');
      onDragConnection(-3, { groupToRemove: group });
      return;
    }

    // For groups with more than 2 teeth, split at the connection point
    // Use FDI arch order for proper splitting
    const upperArch = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const lowerArch = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    
    // Determine which arch this group belongs to
    const arch = upperArch.includes(group.teeth[0]) ? upperArch : lowerArch;
    
    // Sort teeth by arch order
    const sortedTeeth = group.teeth.slice().sort((a, b) => arch.indexOf(a) - arch.indexOf(b));
    
    const tooth1Index = sortedTeeth.indexOf(tooth1);
    const tooth2Index = sortedTeeth.indexOf(tooth2);
    
    // Ensure we're splitting at adjacent teeth
    if (Math.abs(tooth1Index - tooth2Index) !== 1) {
      console.log('Cannot split non-adjacent teeth');
      return;
    }
    
    // Determine split point (split after the lower-indexed tooth)
    const splitIndex = Math.min(tooth1Index, tooth2Index);
    
    const group1Teeth = sortedTeeth.slice(0, splitIndex + 1);
    const group2Teeth = sortedTeeth.slice(splitIndex + 1);
    
    // Create two new groups
    const group1: ToothGroup = {
      groupId: `group-${Date.now()}-1`,
      teeth: group1Teeth,
      type: group.type,
      pontics: group.pontics?.filter(p => group1Teeth.includes(p)) || [],
      notes: group.notes,
      material: group.material,
      shade: group.shade,
      productType: group.productType || 'implant',
    };

    const group2: ToothGroup = {
      groupId: `group-${Date.now()}-2`,
      teeth: group2Teeth,
      type: group.type,
      pontics: group.pontics?.filter(p => group2Teeth.includes(p)) || [],
      notes: group.notes,
      material: group.material,
      shade: group.shade,
      productType: group.productType || 'implant',
    };

    // Pass the split data directly to the parent for immediate processing
    onDragConnection(-4, { 
      originalGroup: group,
      newGroups: [group1, group2]
    });
  };

  // Handle dot mouse down (start dragging) - allow any connection
  const handleDotMouseDown = (toothNumber: number, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only start connection chain on mouse down (not on select)
    setConnectionChain([toothNumber]);
    setDragStart(toothNumber);
    setIsDragging(true);
    const dotPos = getDotPosition(toothNumber);
    setDragLine({ x1: dotPos.x, y1: dotPos.y, x2: dotPos.x, y2: dotPos.y });
  };

  // Finish connection and create group - allow any chain
  const finishConnection = () => {
    if (connectionChain.length >= 2) {
      // No adjacency validation: allow any chain
      onDragConnection(connectionChain);
    }
    // Reset connection state
    setConnectionChain([]);
    setIsDragging(false);
    setDragStart(null);
    setDragLine(null);
    setMousePosition(null);
    setLastHoveredDot(null);
  };

  // Handle mouse move during drag - allow any connection
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!svgRef.current) return;
    if (!isDragging || !dragStart) return;
    event.preventDefault();
    const { x, y } = getClientXY(event, svgRef.current) || { x: 0, y: 0 };
    setMousePosition({ x, y });
    const startPos = getDotPosition(dragStart);
    setDragLine({ x1: startPos.x, y1: startPos.y, x2: x, y2: y });
    // Only add to chain if dragging and not already in chain
    let closestTooth: number | null = null;
    let minDistance = 18;
    const allTeeth = [
      ...selectedTeeth.map(t => t.toothNumber),
      ...selectedGroups.flatMap(g => g.teeth)
    ];
    for (const toothNumber of allTeeth) {
      if (connectionChain.includes(toothNumber)) continue;
      const dotPos = getDotPosition(toothNumber);
      const distance = Math.sqrt(Math.pow(x - dotPos.x, 2) + Math.pow(y - dotPos.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestTooth = toothNumber;
      }
    }
    if (closestTooth !== null) {
      setConnectionChain(prev => [...prev, closestTooth]);
    }
  };

  // Handle mouse up (end dragging) - allow any connection
  const handleMouseUp = (event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!isDragging || !dragStart) return;
    // Only finish connection if dragging
    finishConnection();
    setDragLine(null);
    setIsDragging(false);
    setDragStart(null);
    setMousePosition(null);
  };

  // Handle click outside to finish connection
  const handleSvgClick = (event: React.MouseEvent) => {
    if (connectionChain.length > 0) {
      finishConnection();
    }
  };

  // Generate connection lines between dots in joint/bridge groups - ONLY for strictly adjacent teeth
  const generateConnectionLines = () => {
    return selectedGroups.map(group => {
      if (group.teeth.length < 2) return null;
      
      const lines = [];
      
      // Sort teeth by FDI numbering for proper adjacency checking
      const sortedTeeth = group.teeth.slice().sort((a, b) => a - b);
      
      // Generate lines between consecutive teeth in the sorted array
      for (let i = 0; i < sortedTeeth.length - 1; i++) {
        const tooth1 = sortedTeeth[i];
        const tooth2 = sortedTeeth[i + 1];
        
        // Check if these teeth are strictly adjacent
        if (areTeethStrictlyAdjacent(tooth1, tooth2)) {
          const pos1 = getDotPosition(tooth1);
          const pos2 = getDotPosition(tooth2);
          const lineColor = group.type === 'joint' ? TOOTH_CHART_COLORS.joint : TOOTH_CHART_COLORS.bridge;
          const strokeWidth = group.type === 'bridge' ? '4' : '3';
          const lineId = `${group.groupId}-${tooth1}-${tooth2}`;
          const isHovered = hoveredLine === lineId;
          
          lines.push(
            <line
              key={lineId}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={isHovered ? TOOTH_CHART_COLORS.validation.error : lineColor}
              strokeWidth={isHovered ? '6' : strokeWidth}
              strokeLinecap="round"
              className="cursor-pointer drop-shadow-sm hover:drop-shadow-lg transition-all duration-200"
              onMouseEnter={() => setHoveredLine(lineId)}
              onMouseLeave={() => setHoveredLine(null)}
              onDoubleClick={(e) => handleLineDoubleClick(group, tooth1, tooth2, e)}
            />
          );
        }
      }
      
      // Special handling for cross-quadrant connections that might not be consecutive in sorted array
      // Check for 11-21 connection
      if (group.teeth.includes(11) && group.teeth.includes(21)) {
        const existingLine = lines.find(line => 
          line.key === `${group.groupId}-11-21` || line.key === `${group.groupId}-21-11`
        );
        if (!existingLine && areTeethStrictlyAdjacent(11, 21)) {
          const pos1 = getDotPosition(11);
          const pos2 = getDotPosition(21);
          const lineColor = group.type === 'joint' ? TOOTH_CHART_COLORS.joint : TOOTH_CHART_COLORS.bridge;
          const strokeWidth = group.type === 'bridge' ? '4' : '3';
          const lineId = `${group.groupId}-11-21`;
          const isHovered = hoveredLine === lineId;
          
          lines.push(
            <line
              key={lineId}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={isHovered ? TOOTH_CHART_COLORS.validation.error : lineColor}
              strokeWidth={isHovered ? '6' : strokeWidth}
              strokeLinecap="round"
              className="cursor-pointer drop-shadow-sm hover:drop-shadow-lg transition-all duration-200"
              onMouseEnter={() => setHoveredLine(lineId)}
              onMouseLeave={() => setHoveredLine(null)}
              onDoubleClick={(e) => handleLineDoubleClick(group, 11, 21, e)}
            />
          );
        }
      }
      
      // Check for 31-41 connection
      if (group.teeth.includes(31) && group.teeth.includes(41)) {
        const existingLine = lines.find(line => 
          line.key === `${group.groupId}-31-41` || line.key === `${group.groupId}-41-31`
        );
        if (!existingLine && areTeethStrictlyAdjacent(31, 41)) {
          const pos1 = getDotPosition(31);
          const pos2 = getDotPosition(41);
          const lineColor = group.type === 'joint' ? TOOTH_CHART_COLORS.joint : TOOTH_CHART_COLORS.bridge;
          const strokeWidth = group.type === 'bridge' ? '4' : '3';
          const lineId = `${group.groupId}-31-41`;
          const isHovered = hoveredLine === lineId;
          
          lines.push(
            <line
              key={lineId}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={isHovered ? TOOTH_CHART_COLORS.validation.error : lineColor}
              strokeWidth={isHovered ? '6' : strokeWidth}
              strokeLinecap="round"
              className="cursor-pointer drop-shadow-sm hover:drop-shadow-lg transition-all duration-200"
              onMouseEnter={() => setHoveredLine(lineId)}
              onMouseLeave={() => setHoveredLine(null)}
              onDoubleClick={(e) => handleLineDoubleClick(group, 31, 41, e)}
            />
          );
        }
      }
      
      return lines;
    }).filter(Boolean).flat();
  };

  // Generate chain connection lines during building - draw between all consecutive teeth
  const generateChainLines = () => {
    if (connectionChain.length < 2) return null;

    // Detect if the chain is all lower left teeth (31-38)
    const isLowerLeft = connectionChain.every(t => t >= 31 && t <= 38);
    let chain = [...connectionChain];
    if (isLowerLeft) {
      // Sort descending for lower left (38, 37, ..., 31)
      chain.sort((a, b) => b - a);
    }

    const lines = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const tooth1 = chain[i];
      const tooth2 = chain[i + 1];
      // Draw lines between all consecutive teeth (no adjacency check)
      const pos1 = getDotPosition(tooth1);
      const pos2 = getDotPosition(tooth2);
      lines.push(
        <line
          key={`chain-${tooth1}-${tooth2}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={TOOTH_CHART_COLORS.connectionLine.temporary}
          strokeWidth="2"
          strokeDasharray="4,4"
          strokeLinecap="round"
          className="pointer-events-none"
        />
      );
    }
    return lines;
  };

  // Responsive style helper
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const dotRadius = isMobile ? 4 : 6;
  const dotHoverRadius = isMobile ? 6 : 8;

  // Replace all event handlers with no-ops if readMode is true
  const safeOnToothClick = readMode ? () => {} : onToothClick;
  const safeOnDragConnection = readMode ? () => {} : onDragConnection;
  const safeOnGroupsChange = readMode ? () => {} : onGroupsChange;
  const safeSetSelectedTeeth = readMode ? () => {} : setSelectedTeeth;

  return (
    <div className="w-full" style={{ aspectRatio: '400/650', maxWidth: '100%', margin: '0 auto', position: 'relative' }}>
      {/* Instruction hint */}
      {/* {connectionChain.length === 0 && !isDragging && (
        <div className="text-center mb-2 text-sm text-gray-500">
          💡 Drag from dots to connect teeth, double-click lines to split groups
        </div>
      )}
       */}
      {/* Connection status */}
      {connectionChain.length > 0 && (
        <div className="text-center mb-2 text-sm text-blue-600 font-medium">
          Connecting: {connectionChain.map(t => getPalmerNotation(t)).join(' → ')}
        </div>
      )}
      
      <svg 
        ref={svgRef}
        viewBox="0 0 400 650" 
        className={`w-full h-auto mx-0 py-0 ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        style={{ 
          userSelect: 'none',
          touchAction: 'none',
          width: '100%',
          height: 'auto',
          display: 'block',
          maxWidth: 400,
        }}
        onMouseMove={readMode ? undefined : (e => { e.preventDefault(); handleMouseMove(e); })}
        onMouseUp={readMode ? undefined : handleMouseUp}
        onClick={readMode ? undefined : handleSvgClick}
        onTouchStart={readMode ? undefined : handleTouchStart}
        onTouchMove={readMode ? undefined : (e => { e.preventDefault(); handleTouchMove(e); })}
        onTouchEnd={readMode ? undefined : handleTouchEnd}
      >
        {/* Quadrant Labels */}
        <text x="50" y="12" fill="#666" textAnchor="middle" className="text-xs font-medium">(Upper Right)</text>
        <text x="350" y="12" fill="#666" textAnchor="middle" className="text-xs font-medium">(Upper Left)</text>
        <text x="50" y="640" fill="#666" textAnchor="middle" className="text-xs font-medium">(Lower Right)</text>
        <text x="350" y="640" fill="#666" textAnchor="middle" className="text-xs font-medium">(Lower Left)</text>

        {/* Upper Jaw Teeth */}
        <g transform="translate(50, 20)">
          {/* Upper Right - Teeth 11-18 */}
          <path d="M128.916 1.84693C128.19 1.91791 127.465 2.00255 126.743 2.11123C125.307 2.32786 123.874 2.63728 122.512 3.1563C121.225 3.64685 119.992 4.33775 119.012 5.32662C118.779 5.56173 118.565 5.84565 118.375 6.11921C118.17 6.4142 118.007 6.73803 117.875 7.07258C117.607 7.75166 117.461 8.47251 117.322 9.18782C117.285 9.37894 117.248 9.57265 117.244 9.76821C117.241 9.92605 117.268 10.082 117.258 10.2403C117.202 11.1452 117.35 12.0661 117.51 12.9548C118.188 16.7106 119.854 20.1999 121.512 23.5953C124.554 29.8239 127.925 36.4147 133.9 39.8272C136.016 41.0356 138.493 41.7898 140.881 41.3421C145.593 40.4593 148.276 35.4854 150.087 30.9902C153.037 23.6656 155.487 15.7021 153.993 7.93723C153.666 6.24192 153.12 4.52221 151.959 3.25794C149.777 0.883183 146.159 0.771914 142.959 0.893535C138.271 1.07135 133.587 1.38928 128.916 1.84693Z" 
            fill={getToothFillColor(11)} 
            stroke={getToothStrokeColor(11)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(11, e)} 
          />
          <text x="136" y="22" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(11)}</text>

          <path d="M115.527 14.4549C116.553 16.0814 117.202 18.0684 117.755 19.9337C119.204 24.8171 119.548 29.9817 119.382 35.0562C119.208 40.3554 119.035 48.2878 112.725 49.9853C110.431 50.6023 107.995 49.887 105.818 48.9295C98.5724 45.7426 92.5856 39.7177 89.3913 32.3975C86.9698 26.8481 88.6025 21.3219 93.1916 17.4769C96.0385 15.0918 99.5247 13.6427 103.006 12.3903C105.421 11.5212 107.964 10.7186 110.506 11.0484C112.861 11.3537 114.415 12.693 115.527 14.4549Z" 
            fill={getToothFillColor(12)} 
            stroke={getToothStrokeColor(12)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(12, e)} 
          />
          <text x="104" y="31" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(12)}</text>

          <path d="M92.5018 41.3085C95.2389 46.2447 97.0839 51.6508 98.3547 57.1644C98.8805 59.4456 99.311 61.8149 98.8972 64.1194C98.4835 66.4243 97.0591 68.6741 94.8744 69.4404C93.4679 69.9339 91.9271 69.772 90.456 69.5432C83.8435 68.514 77.3021 66.1629 72.1336 61.8592C69.1987 59.4153 66.667 56.1885 66.0577 52.3894C65.613 49.618 66.2358 46.7438 67.4442 44.2167C68.6522 41.6897 70.4206 39.4779 72.335 37.4473C73.8385 35.8522 75.4731 34.3314 77.4294 33.3636C78.7345 32.7178 80.1942 32.3393 81.6522 32.3892C82.5887 32.4209 83.5786 32.4897 84.4342 32.9096C86.6357 33.9898 88.5446 35.6252 90.0587 37.5579C90.9785 38.7327 91.7772 40.0018 92.5018 41.3085Z" 
            fill={getToothFillColor(13)} 
            stroke={getToothStrokeColor(13)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(13, e)} 
          />
          <text x="81" y="51" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(13)}</text>

          <path d="M84.1115 79.3365C84.9028 81.1231 85.6052 82.9799 85.815 84.9266C86.0247 86.8733 85.7004 88.9372 84.5865 90.5378C83.7277 91.7722 82.4565 92.6583 81.1124 93.3107C76.971 95.3199 72.1736 95.2552 67.5903 94.9705C62.8177 94.6744 57.8115 94.0959 53.9127 91.2916C51.8703 89.8229 50.2321 87.7834 49.2269 85.4593C48.089 82.8273 47.7712 79.8962 47.8464 77.0238C47.9241 74.0517 48.4225 71.0481 49.7115 68.3772C51.0005 65.7064 53.1382 63.386 55.8603 62.2758C57.2431 61.7117 58.7317 61.4703 60.2115 61.287C61.413 61.138 62.6279 61.0426 63.8381 61.1184C65.0104 61.192 66.0769 61.5143 67.1904 61.8663C68.8038 62.376 70.2559 63.0385 71.7044 63.9349C73.5034 65.0484 75.1486 66.4058 76.6299 67.9229C78.1305 69.4593 79.4651 71.1583 80.6501 72.9545C81.8381 74.7552 82.8776 76.6549 83.7846 78.6152C83.8955 78.8544 84.0042 79.0951 84.1115 79.3365Z" 
            fill={getToothFillColor(14)} 
            stroke={getToothStrokeColor(14)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(14, e)} 
          />
          <text x="66" y="76" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(14)}</text>

          <path d="M65.1418 100.746C68.62 103.998 71.1809 108.443 71.4888 113.228C71.7967 118.013 69.5712 123.064 65.4491 125.421C62.9965 126.824 60.1164 127.21 57.3096 127.44C53.8814 127.72 50.3905 127.802 47.0441 126.996C41.0704 125.557 35.8155 121.09 33.6727 115.26C31.5296 109.43 32.7058 102.402 36.8571 97.8176C39.5946 94.7948 43.5678 92.9967 47.5991 92.7964C51.6339 92.596 55.2471 94.4207 58.7413 96.2709C61.0435 97.4904 63.2293 98.9573 65.1418 100.746Z" 
            fill={getToothFillColor(15)} 
            stroke={getToothStrokeColor(15)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(15, e)} 
          />
          <text x="52" y="113" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(15)}</text>

          <path d="M49.4867 164.965C43.6141 169.001 35.8187 169.706 29.0795 167.452C24.057 165.773 19.2023 161.968 18.4215 156.667C17.8279 152.636 19.6726 148.711 20.8087 144.802C21.2279 143.359 21.5534 141.892 21.9 140.431C22.9179 136.143 24.4343 130.863 28.1641 128.154C31.3653 125.829 35.7228 125.861 39.5256 126.9C46.966 128.933 53.3491 134.604 56.3117 141.812C58.7138 147.657 58.3643 153.804 55.0037 159.167C53.7212 161.214 52.0772 163.033 50.157 164.482C49.9373 164.648 49.7137 164.809 49.4867 164.965Z" 
            fill={getToothFillColor(16)} 
            stroke={getToothStrokeColor(16)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(16, e)} 
          />
          <text x="39" y="145" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(16)}</text>

          <path d="M47.2475 200.67C46.6039 203.798 45.5455 206.951 43.413 209.306C41.9722 210.896 40.1122 212.04 38.1828 212.957C33.67 215.102 28.6321 216.1 23.6541 215.838C19.6721 215.628 15.6657 214.585 12.3543 212.335C9.04288 210.084 6.48966 206.541 5.89896 202.545C5.54433 200.146 5.89019 197.704 6.23607 195.303C6.89353 190.737 7.55137 186.171 8.20883 181.606C8.50144 179.575 8.80499 177.507 9.68939 175.66C11.7833 171.289 16.8419 169.004 21.6372 168.964C26.4324 168.924 31.0405 170.738 35.4242 172.707C37.9989 173.864 40.5748 175.102 42.7613 176.901C44.9946 178.739 46.693 181.155 47.3056 184.029C48.0459 187.502 48.2407 191.139 48.0335 194.679C47.9156 196.692 47.6536 198.696 47.2475 200.67Z" 
            fill={getToothFillColor(17)} 
            stroke={getToothStrokeColor(17)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(17, e)} 
          />
          <text x="27" y="192" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(17)}</text>

          <path d="M44.112 236.83C43.3126 241.888 43.3312 242.048 42.3235 246.097C41.9977 247.406 41.7299 251.309 40.4182 253.798C38.1511 258.099 32.9293 259.816 28.2271 260.854C24.0112 261.784 19.6443 262.262 15.3792 261.603C4.53765 259.928 1.53458 255.227 0.359756 247.321C-0.186061 243.646 -0.0510812 239.86 0.64542 236.211C2.1632 228.258 2.36022 224.148 7.20143 220.554C10.681 217.972 15.2862 217.54 19.5874 217.869C24.3911 218.236 29.5231 218.851 33.9305 220.818C36.1743 221.82 38.3335 223.017 40.373 224.396C42.1243 225.58 43.6526 227.583 44.1039 229.662C44.6093 231.991 44.5101 234.312 44.112 236.83Z" 
            fill={getToothFillColor(18)} 
            stroke={getToothStrokeColor(18)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(18, e)} 
          />
          <text x="22" y="240" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(18)}</text>

          {/* Upper Left - Teeth 21-28 */}
          <path d="M181.369 1.84693C182.095 1.91791 182.820 2.00255 183.542 2.11123C184.978 2.32786 186.411 2.63728 187.773 3.1563C189.060 3.64685 190.292 4.33775 191.273 5.32662C191.506 5.56173 191.720 5.84565 191.910 6.11921C192.115 6.4142 192.278 6.73803 192.409 7.07258C192.677 7.75166 192.823 8.47251 192.963 9.18782C193 9.37894 193.036 9.57265 193.04 9.76821C193.043 9.92605 193.017 10.082 193.027 10.2403C193.083 11.1452 192.935 12.0661 192.774 12.9548C192.097 16.7106 190.430 20.1999 188.772 23.5953C185.730 29.8239 182.359 36.4147 176.384 39.8272C174.268 41.0356 171.792 41.7898 169.403 41.3421C164.691 40.4593 162.008 35.4854 160.198 30.9902C157.248 23.6656 154.796 15.7021 156.292 7.93723C156.618 6.24192 157.164 4.52221 158.326 3.25794C160.507 0.883183 164.125 0.771914 167.325 0.893535C172.014 1.07135 176.698 1.38928 181.369 1.84693Z" 
            fill={getToothFillColor(21)} 
            stroke={getToothStrokeColor(21)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(21, e)} 
          />
          <text x="174" y="22" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(21)}</text>

          <path d="M194.761 14.4549C193.734 16.0814 193.085 18.0684 192.532 19.9337C191.084 24.8171 190.739 29.9817 190.906 35.0562C191.079 40.3554 191.252 48.2878 197.563 49.9853C199.856 50.6023 202.292 49.887 204.469 48.9295C211.715 45.7426 217.702 39.7177 220.896 32.3975C223.317 26.8481 221.685 21.3219 217.096 17.4769C214.249 15.0918 210.763 13.6427 207.282 12.3903C204.866 11.5212 202.324 10.7186 199.781 11.0484C197.426 11.3537 195.872 12.693 194.761 14.4549Z" 
            fill={getToothFillColor(22)} 
            stroke={getToothStrokeColor(22)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(22, e)} 
          />
          <text x="206" y="31" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(22)}</text>

          <path d="M217.786 41.3085C215.048 46.2447 213.203 51.6508 211.933 57.1644C211.407 59.4456 210.976 61.8149 211.390 64.1194C211.804 66.4243 213.228 68.6741 215.413 69.4404C216.819 69.9339 218.36 69.772 219.831 69.5432C226.444 68.514 232.985 66.1629 238.154 61.8592C241.089 59.4153 243.620 56.1885 244.230 52.3894C244.674 49.618 244.052 46.7438 242.843 44.2167C241.635 41.6897 239.867 39.4779 237.952 37.4473C236.449 35.8522 234.814 34.3314 232.858 33.3636C231.553 32.7178 230.093 32.3393 228.635 32.3892C227.699 32.4209 226.709 32.4897 225.853 32.9096C223.652 33.9898 221.743 35.6252 220.229 37.5579C219.308 38.7327 218.510 40.0018 217.786 41.3085Z" 
            fill={getToothFillColor(23)} 
            stroke={getToothStrokeColor(23)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md"
            onClick={readMode ? undefined : (e) => safeOnToothClick(23, e)} 
          />
          <text x="229" y="51" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(23)}</text>

          <path d="M226.176 79.3365C225.384 81.1231 224.682 82.9799 224.472 84.9266C224.262 86.8733 224.587 88.9372 225.701 90.5378C226.559 91.7722 227.831 92.6583 229.175 93.3107C233.316 95.3199 238.114 95.2552 242.697 94.9705C247.469 94.6744 252.476 94.0959 256.374 91.2916C258.417 89.8229 260.055 87.7834 261.06 85.4593C262.198 82.8273 262.516 79.8962 262.44 77.0238C262.363 74.0517 261.864 71.0481 260.575 68.3772C259.286 65.7064 257.149 63.386 254.426 62.2758C253.044 61.7117 251.555 61.4703 250.075 61.287C248.874 61.138 247.659 61.0426 246.449 61.1184C245.276 61.192 244.210 61.5143 243.096 61.8663C241.483 62.376 240.031 63.0385 238.582 63.9349C236.783 65.0484 235.138 66.4058 233.657 67.9229C232.156 69.4593 230.822 71.1583 229.637 72.9545C228.449 74.7552 227.410 76.6549 226.502 78.6152C226.391 78.8544 226.283 79.0951 226.176 79.3365Z" 
            fill={getToothFillColor(24)} 
            stroke={getToothStrokeColor(24)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(24, e)} 
          />
          <text x="244" y="76" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(24)}</text>

          <path d="M245.145 100.746C241.667 103.998 239.106 108.443 238.798 113.228C238.490 118.013 240.715 123.064 244.837 125.421C247.290 126.824 250.170 127.21 252.977 127.44C256.405 127.72 259.896 127.802 263.242 126.996C269.216 125.557 274.471 121.09 276.614 115.26C278.757 109.43 277.580 102.402 273.429 97.8176C270.692 94.7948 266.718 92.9967 262.687 92.7964C258.652 92.596 255.039 94.4207 251.545 96.2709C249.243 97.4904 247.057 98.9573 245.145 100.746Z" 
            fill={getToothFillColor(25)} 
            stroke={getToothStrokeColor(25)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(25, e)} 
          />
          <text x="258" y="113" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(25)}</text>

          <path d="M260.801 164.965C266.673 169.001 274.469 169.706 281.208 167.452C286.230 165.773 291.085 161.968 291.866 156.667C292.459 152.636 290.615 148.711 289.479 144.802C289.059 143.359 288.734 141.892 288.387 140.431C287.369 136.143 285.853 130.863 282.123 128.154C278.922 125.829 274.565 125.861 270.762 126.9C263.321 128.933 256.938 134.604 253.976 141.812C251.573 147.657 251.923 153.804 255.284 159.167C256.566 161.214 258.210 163.033 260.130 164.482C260.350 164.648 260.574 164.809 260.801 164.965Z" 
            fill={getToothFillColor(26)} 
            stroke={getToothStrokeColor(26)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(26, e)} 
          />
          <text x="271" y="145" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(26)}</text>

          <path d="M263.039 200.67C263.683 203.798 264.741 206.951 266.874 209.306C268.314 210.896 270.175 212.04 272.104 212.957C276.617 215.102 281.655 216.1 286.633 215.838C290.615 215.628 294.621 214.585 297.933 212.335C301.244 210.084 303.797 206.541 304.388 202.545C304.743 200.146 304.397 197.704 304.051 195.303C303.393 190.737 302.736 186.171 302.078 181.606C301.786 179.575 301.482 177.507 300.598 175.66C298.504 171.289 293.445 169.004 288.650 168.964C283.855 168.924 279.247 170.738 274.863 172.707C272.288 173.864 269.712 175.102 267.526 176.901C265.292 178.739 263.594 181.155 262.981 184.029C262.241 187.502 262.046 191.139 262.254 194.679C262.371 196.692 262.633 198.696 263.039 200.67Z" 
            fill={getToothFillColor(27)} 
            stroke={getToothStrokeColor(27)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(27, e)} 
          />
          <text x="283" y="192" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(27)}</text>

          <path d="M266.175 236.83C266.975 241.888 266.956 242.048 267.964 246.097C268.290 247.406 268.558 251.309 269.869 253.798C272.136 258.099 277.358 259.816 282.060 260.854C286.276 261.784 290.643 262.262 294.908 261.603C305.750 259.928 308.753 255.227 309.928 247.321C310.474 243.646 310.339 239.86 309.642 236.211C308.124 228.258 307.927 224.148 303.086 220.554C299.606 217.972 295.001 217.54 290.700 217.869C285.896 218.236 280.764 218.851 276.357 220.818C274.113 221.82 271.954 223.017 269.914 224.396C268.163 225.58 266.635 227.583 266.183 229.662C265.678 231.991 265.777 234.312 266.175 236.83Z" 
            fill={getToothFillColor(28)} 
            stroke={getToothStrokeColor(28)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(28, e)} 
          />
          <text x="288" y="240" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(28)}</text>
        </g>

        Bite Line
        <line x1="80" y1="315" x2="320" y2="315" stroke="#ddd" strokeWidth="1" strokeDasharray="3,2" />
        <rect x="170" y="308" width="60" height="16" rx="8" fill="white" stroke="#e5e5e5" strokeWidth="0.5" />
        <text x="200" y="315" fill="#666" textAnchor="middle" dominantBaseline="middle" className="text-xs font-medium">
          Bite Line
        </text>

        {/* Bite Line */}
        <line x1="55" y1="315" x2="360" y2="315" stroke="#231F20" strokeWidth="1" strokeDasharray="3,2" />
        <g transform="translate(200, 315)">
          <rect x={-40} y={-12} width={80} height={24} rx={8} fill="#07AD94" />
          <text
            x={0}
            y={0}
            fill="#FFF"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium"
            style={{ fontSize: 12 }}
          >
            Bite Line
          </text>
        </g>

        {/* Lower Jaw Teeth */}
        <g transform="translate(50, 340)">
          <path d="M181.369 260.153C182.095 260.082 182.820 259.997 183.542 259.889C184.978 259.672 186.411 259.363 187.773 258.844C189.060 258.353 190.292 257.662 191.273 256.673C191.506 256.438 191.720 256.154 191.910 255.881C192.115 255.586 192.278 255.262 192.409 254.927C192.677 254.248 192.823 253.527 192.963 252.812C193 252.621 193.036 252.427 193.04 252.232C193.043 252.074 193.017 251.918 193.027 251.76C193.083 250.855 192.935 249.934 192.774 249.045C192.097 245.289 190.430 241.8 188.772 238.405C185.730 232.176 182.359 225.585 176.384 222.173C174.268 220.964 171.792 220.21 169.403 220.658C164.691 221.541 162.008 226.515 160.198 231.01C157.248 238.334 154.796 246.298 156.292 254.063C156.618 255.758 157.164 257.478 158.326 258.742C160.507 261.117 164.125 261.228 167.325 261.106C172.014 260.929 176.698 260.611 181.369 260.153Z" 
            fill={getToothFillColor(31)} 
            stroke={getToothStrokeColor(31)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(31, e)} 
          />
          <text x="174" y="240" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(31)}</text>

          <path d="M194.761 247.545C193.734 245.919 193.085 243.932 192.532 242.066C191.084 237.183 190.739 232.018 190.906 226.944C191.079 221.645 191.252 213.712 197.563 212.015C199.856 211.398 202.292 212.113 204.469 213.07C211.715 216.257 217.702 222.282 220.896 229.602C223.317 235.152 221.685 240.678 217.096 244.523C214.249 246.908 210.763 248.357 207.282 249.61C204.866 250.479 202.324 251.281 199.781 250.952C197.426 250.646 195.872 249.307 194.761 247.545Z" 
            fill={getToothFillColor(32)} 
            stroke={getToothStrokeColor(32)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(32, e)} 
          />
          <text x="206" y="231" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(32)}</text>

          <path d="M217.786 220.691C215.048 215.755 213.203 210.349 211.933 204.836C211.407 202.554 210.976 200.185 211.390 197.881C211.804 195.576 213.228 193.326 215.413 192.56C216.819 192.066 218.36 192.228 219.831 192.457C226.444 193.486 232.985 195.837 238.154 200.141C241.089 202.585 243.620 205.812 244.230 209.611C244.674 212.382 244.052 215.256 242.843 217.783C241.635 220.31 239.867 222.522 237.952 224.553C236.449 226.148 234.814 227.669 232.858 228.636C231.553 229.282 230.093 229.661 228.635 229.611C227.699 229.579 226.709 229.51 225.853 229.09C223.652 228.01 221.743 226.375 220.229 224.442C219.308 223.267 218.510 221.998 217.786 220.691Z" 
            fill={getToothFillColor(33)} 
            stroke={getToothStrokeColor(33)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md"
            onClick={readMode ? undefined : (e) => safeOnToothClick(33, e)} 
          />
          <text x="229" y="211" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(33)}</text>

          <path d="M226.176 182.663C225.384 180.877 224.682 179.02 224.472 177.073C224.262 175.127 224.587 173.063 225.701 171.462C226.559 170.228 227.831 169.342 229.175 168.689C233.316 166.68 238.114 166.745 242.697 167.029C247.469 167.326 252.476 167.904 256.374 170.708C258.417 172.177 260.055 174.217 261.06 176.541C262.198 179.173 262.516 182.104 262.44 184.976C262.363 187.948 261.864 190.952 260.575 193.623C259.286 196.294 257.149 198.614 254.426 199.724C253.044 200.288 251.555 200.53 250.075 200.713C248.874 200.862 247.659 200.957 246.449 200.882C245.276 200.808 244.210 200.486 243.096 200.134C241.483 199.624 240.031 198.961 238.582 198.065C236.783 196.952 235.138 195.594 233.657 194.077C232.156 192.541 230.822 190.842 229.637 189.045C228.449 187.245 227.410 185.345 226.502 183.385C226.391 183.146 226.283 182.905 226.176 182.663Z" 
            fill={getToothFillColor(34)} 
            stroke={getToothStrokeColor(34)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(34, e)} 
          />
          <text x="244" y="186" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(34)}</text>

          <path d="M245.145 161.254C241.667 158.002 239.106 153.557 238.798 148.772C238.490 143.987 240.715 138.936 244.837 136.579C247.290 135.176 250.170 134.79 252.977 134.56C256.405 134.28 259.896 134.198 263.242 135.004C269.216 136.443 274.471 140.91 276.614 146.74C278.757 152.57 277.580 159.598 273.429 164.182C270.692 167.205 266.718 169.003 262.687 169.204C258.652 169.404 255.039 167.579 251.545 165.729C249.243 164.51 247.057 163.043 245.145 161.254Z" 
            fill={getToothFillColor(35)} 
            stroke={getToothStrokeColor(35)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(35, e)} 
          />
          <text x="258" y="149" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(35)}</text>

          <path d="M260.801 97.0345C266.673 92.999 274.469 92.294 281.208 94.548C286.230 96.227 291.085 100.032 291.866 105.333C292.459 109.364 290.615 113.289 289.479 117.198C289.059 118.641 288.734 120.108 288.387 121.569C287.369 125.857 285.853 131.137 282.123 133.846C278.922 136.171 274.565 136.139 270.762 135.1C263.321 133.067 256.938 127.396 253.976 120.188C251.573 114.343 251.923 108.196 255.284 102.833C256.566 100.786 258.210 98.967 260.130 97.518C260.350 97.352 260.574 97.191 260.801 97.0345Z" 
            fill={getToothFillColor(36)} 
            stroke={getToothStrokeColor(36)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(36, e)} 
          />
          <text x="271" y="117" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(36)}</text>

          <path d="M263.039 61.33C263.683 58.202 264.741 55.049 266.874 52.694C268.314 51.104 270.175 49.96 272.104 49.043C276.617 46.898 281.655 45.9 286.633 46.162C290.615 46.372 294.621 47.415 297.933 49.665C301.244 51.916 303.797 55.459 304.388 59.455C304.743 61.854 304.397 64.296 304.051 66.697C303.393 71.263 302.736 75.829 302.078 80.394C301.786 82.425 301.482 84.493 300.598 86.34C298.504 90.711 293.445 92.996 288.650 93.036C283.855 93.076 279.247 91.262 274.863 89.293C272.288 88.136 269.712 86.898 267.526 85.099C265.292 83.261 263.594 80.845 262.981 77.971C262.241 74.498 262.046 70.861 262.254 67.321C262.371 65.308 262.633 63.304 263.039 61.33Z" 
            fill={getToothFillColor(37)} 
            stroke={getToothStrokeColor(37)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(37, e)} 
          />
          <text x="283" y="70" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(37)}</text>

          <path d="M266.175 25.17C266.975 20.112 266.956 19.952 267.964 15.903C268.290 14.594 268.558 10.691 269.869 8.202C272.136 3.901 277.358 2.184 282.060 1.146C286.276 0.216 290.643 -0.262 294.908 0.397C305.750 2.072 308.753 6.773 309.928 14.679C310.474 18.354 310.339 22.14 309.642 25.789C308.124 33.742 307.927 37.852 303.086 41.446C299.606 44.028 295.001 44.46 290.700 44.131C285.896 43.764 280.764 43.149 276.357 41.182C274.113 40.18 271.954 38.983 269.914 37.604C268.163 36.42 266.635 34.417 266.183 32.338C265.678 30.009 265.777 27.688 266.175 25.17Z" 
            fill={getToothFillColor(38)} 
            stroke={getToothStrokeColor(38)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(38, e)} 
          />
          <text x="288" y="22" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(38)}</text>

          {/* Lower Right - Teeth 41-48 */}
          <path d="M128.916 260.153C128.19 260.082 127.465 259.997 126.743 259.889C125.307 259.672 123.874 259.363 122.512 258.844C121.225 258.353 119.992 257.662 119.012 256.673C118.779 256.438 118.565 256.154 118.375 255.881C118.17 255.586 118.007 255.262 117.875 254.927C117.607 254.248 117.461 253.527 117.322 252.812C117.285 252.621 117.248 252.427 117.244 252.232C117.241 252.074 117.268 251.918 117.258 251.76C117.202 250.855 117.35 249.934 117.51 249.045C118.188 245.289 119.854 241.8 121.512 238.405C124.554 232.176 127.925 225.585 133.9 222.173C136.016 220.964 138.493 220.21 140.881 220.658C145.593 221.541 148.276 226.515 150.087 231.01C153.037 238.334 155.487 246.298 153.993 254.063C153.666 255.758 153.12 257.478 151.959 258.742C149.777 261.117 146.159 261.228 142.959 261.106C138.271 260.929 133.587 260.611 128.916 260.153Z" 
            fill={getToothFillColor(41)} 
            stroke={getToothStrokeColor(41)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(41, e)} 
          />
          <text x="136" y="240" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(41)}</text>

          <path d="M115.527 247.545C116.553 245.919 117.202 243.932 117.755 242.066C119.204 237.183 119.548 232.018 119.382 226.944C119.208 221.645 119.035 213.712 112.725 212.015C110.431 211.398 107.995 212.113 105.818 213.07C98.5724 216.257 92.5856 222.282 89.3913 229.602C86.9698 235.152 88.6025 240.678 93.1916 244.523C96.0385 246.908 99.5247 248.357 103.006 249.61C105.421 250.479 107.964 251.281 110.506 250.952C112.861 250.646 114.415 249.307 115.527 247.545Z" 
            fill={getToothFillColor(42)} 
            stroke={getToothStrokeColor(42)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(42, e)} 
          />
          <text x="104" y="231" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(42)}</text>

          <path d="M92.5018 220.691C95.2389 215.755 97.0839 210.349 98.3547 204.836C98.8805 202.554 99.311 200.185 98.8972 197.881C98.4835 195.576 97.0591 193.326 94.8744 192.56C93.4679 192.066 91.9271 192.228 90.456 192.457C83.8435 193.486 77.3021 195.837 72.1336 200.141C69.1987 202.585 66.667 205.812 66.0577 209.611C65.613 212.382 66.2358 215.256 67.4442 217.783C68.6522 220.31 70.4206 222.522 72.335 224.553C73.8385 226.148 75.4731 227.669 77.4294 228.636C78.7345 229.282 80.1942 229.661 81.6522 229.611C82.5887 229.579 83.5786 229.51 84.4342 229.09C86.6357 228.01 88.5446 226.375 90.0587 224.442C90.9785 223.267 91.7772 221.998 92.5018 220.691Z" 
            fill={getToothFillColor(43)} 
            stroke={getToothStrokeColor(43)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(43, e)} 
          />
          <text x="81" y="211" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(43)}</text>

          <path d="M84.1115 182.663C84.9028 180.877 85.6052 179.02 85.815 177.073C86.0247 175.127 85.7004 173.063 84.5865 171.462C83.7277 170.228 82.4565 169.342 81.1124 168.689C76.971 166.68 72.1736 166.745 67.5903 167.029C62.8177 167.326 57.8115 167.904 53.9127 170.708C51.8703 172.177 50.2321 174.217 49.2269 176.541C48.089 179.173 47.7712 182.104 47.8464 184.976C47.9241 187.948 48.4225 190.952 49.7115 193.623C51.0005 196.294 53.1382 198.614 55.8603 199.724C57.2431 200.288 58.7317 200.53 60.2115 200.713C61.413 200.862 62.6279 200.957 63.8381 200.882C65.0104 200.808 66.0769 200.486 67.1904 200.134C68.8038 199.624 70.2559 198.961 71.7044 198.065C73.5034 196.952 75.1486 195.594 76.6299 194.077C78.1305 192.541 79.4651 190.842 80.6501 189.045C81.8381 187.245 82.8776 185.345 83.7846 183.385C83.8955 183.146 84.0042 182.905 84.1115 182.663Z" 
            fill={getToothFillColor(44)} 
            stroke={getToothStrokeColor(44)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(44, e)} 
          />
          <text x="66" y="186" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(44)}</text>

          <path d="M65.1418 161.254C68.62 158.002 71.1809 153.557 71.4888 148.772C71.7967 143.987 69.5712 138.936 65.4491 136.579C62.9965 135.176 60.1164 134.79 57.3096 134.56C53.8814 134.28 50.3905 134.198 47.0441 135.004C41.0704 136.443 35.8155 140.91 33.6727 146.74C31.5296 152.57 32.7058 159.598 36.8571 164.182C39.5946 167.205 43.5678 169.003 47.5991 169.204C51.6339 169.404 55.2471 167.579 58.7413 165.729C61.0435 164.51 63.2293 163.043 65.1418 161.254Z" 
            fill={getToothFillColor(45)} 
            stroke={getToothStrokeColor(45)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(45, e)} 
          />
          <text x="52" y="149" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(45)}</text>

          <path d="M49.4867 97.0345C43.6141 92.999 35.8187 92.294 29.0795 94.548C24.057 96.227 19.2023 100.032 18.4215 105.333C17.8279 109.364 19.6726 113.289 20.8087 117.198C21.2279 118.641 21.5534 120.108 21.9 121.569C22.9179 125.857 24.4343 131.137 28.1641 133.846C31.3653 136.171 35.7228 136.139 39.5256 135.1C46.966 133.067 53.3491 127.396 56.3117 120.188C58.7138 114.343 58.3643 108.196 55.0037 102.833C53.7212 100.786 52.0772 98.967 50.157 97.518C49.9373 97.352 49.7137 97.191 49.4867 97.0345Z" 
            fill={getToothFillColor(46)} 
            stroke={getToothStrokeColor(46)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(46, e)} 
          />
          <text x="39" y="117" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(46)}</text>

          <path d="M47.2475 61.33C46.6039 58.202 45.5455 55.049 43.413 52.694C41.9722 51.104 40.1122 49.96 38.1828 49.043C33.67 46.898 28.6321 45.9 23.6541 46.162C19.6721 46.372 15.6657 47.415 12.3543 49.665C9.04288 51.916 6.48966 55.459 5.89896 59.455C5.54433 61.854 5.89019 64.296 6.23607 66.697C6.89353 71.263 7.55137 75.829 8.20883 80.394C8.50144 82.425 8.80499 84.493 9.68939 86.34C11.7833 90.711 16.8419 92.996 21.6372 93.036C26.4324 93.076 31.0405 91.262 35.4242 89.293C37.9989 88.136 40.5748 86.898 42.7613 85.099C44.9946 83.261 46.693 80.845 47.3056 77.971C48.0459 74.498 48.2407 70.861 48.0335 67.321C47.9156 65.308 47.6536 63.304 47.2475 61.33Z" 
            fill={getToothFillColor(47)} 
            stroke={getToothStrokeColor(47)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(47, e)} 
          />
          <text x="27" y="70" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(47)}</text>

          <path d="M44.112 25.17C43.3126 20.112 43.3312 19.952 42.3235 15.903C41.9977 14.594 41.7299 10.691 40.4182 8.202C38.1511 3.901 32.9293 2.184 28.2271 1.146C24.0112 0.216 19.6443 -0.262 15.3792 0.397C4.53765 2.072 1.53458 6.773 0.359756 14.679C-0.186061 18.354 -0.0510812 22.14 0.64542 25.789C2.1632 33.742 2.36022 37.852 7.20143 41.446C10.681 44.028 15.2862 44.46 19.5874 44.131C24.3911 43.764 29.5231 43.149 33.9305 41.182C36.1743 40.18 38.3335 38.983 40.373 37.604C42.1243 36.42 43.6526 34.417 44.1039 32.338C44.6093 30.009 44.5101 27.688 44.112 25.17Z" 
            fill={getToothFillColor(48)} 
            stroke={getToothStrokeColor(48)} 
            strokeWidth="1.2" 
            className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-md" 
            onClick={readMode ? undefined : (e) => safeOnToothClick(48, e)} 
          />
          <text x="22" y="22" textAnchor="middle" className="text-xs fill-gray-600 pointer-events-none font-medium">{getPalmerNotation(48)}</text>
        </g>

        {/* Connector dots for selected teeth */}
        {[...selectedTeeth, ...selectedGroups.flatMap(g => g.teeth.map(t => ({ toothNumber: t, type: 'abutment' as const })))].map(tooth => {
          const pos = getDotPosition(tooth.toothNumber);
          const isInChain = connectionChain.includes(tooth.toothNumber);
          const isHovered = lastHoveredDot === tooth.toothNumber;
          const isTouchActive = touchStartInfo && touchStartInfo.tooth === tooth.toothNumber;
          return (
            <circle
              key={`dot-${tooth.toothNumber}`}
              cx={pos.x}
              cy={pos.y}
              r={isTouchActive ? dotHoverRadius : (isHovered ? dotHoverRadius : dotRadius)}
              fill={isInChain ? TOOTH_CHART_COLORS.connectionLine.temporary : TOOTH_CHART_COLORS.validation.info}
              stroke={isTouchActive ? TOOTH_CHART_COLORS.validation.warning : TOOTH_CHART_COLORS.defaultFill}
              strokeWidth={isTouchActive ? 4 : 2}
              className="cursor-pointer transition-all duration-200"
              onMouseDown={readMode ? undefined : (e) => handleDotMouseDown(tooth.toothNumber, e)}
              style={{
                filter: isHovered || isTouchActive ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
                touchAction: 'none',
              }}
            />
          );
        })}

        {/* Connection lines */}
        {generateConnectionLines()}

        {/* Chain connection lines */}
        {generateChainLines()}

        {/* Suggestion line - shows when dragging but not over a dot */}
        {isDragging && dragStart && mousePosition && !lastHoveredDot && (
          <line
            x1={getDotPosition(dragStart).x}
            y1={getDotPosition(dragStart).y}
            x2={mousePosition.x}
            y2={mousePosition.y}
            stroke={TOOTH_CHART_COLORS.connectionLine.temporary}
            strokeWidth="2"
            strokeDasharray="6,3"
            strokeLinecap="round"
            className="pointer-events-none opacity-60"
          />
        )}

        {/* Drag line - shows when actively dragging */}
        {dragLine && (
          <line
            x1={dragLine.x1}
            y1={dragLine.y1}
            x2={dragLine.x2}
            y2={dragLine.y2}
            stroke={TOOTH_CHART_COLORS.validation.info}
            strokeWidth="3"
            strokeLinecap="round"
            className="pointer-events-none"
          />
        )}

        {/* Connection chain indicator */}
        {connectionChain.length > 0 && (
          <g className="pointer-events-none">
            {connectionChain.map((toothNumber, index) => {
              const pos = getDotPosition(toothNumber);
              return (
                <circle
                  key={`chain-${toothNumber}-${index}`}
                  cx={pos.x}
                  cy={pos.y}
                  r="4"
                  fill="#10B981"
                  stroke="white"
                  strokeWidth="1"
                  className="animate-pulse"
                />
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};

export default ToothChart;