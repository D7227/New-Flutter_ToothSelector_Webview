import { useState, useCallback, useEffect } from "react";
import {
  ToothGroup,
  ToothDetail,
  LegacyToothGroup,
  SelectedTooth,
  PrescriptionType,
} from "./types/orderTypes";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import ToothChart from "@/components/order-wizard/components/ToothChart";
import { Pencil } from "lucide-react";
import SelectedToothGroups from "@/components/order-wizard/components/SelectedToothGroups";
import ToothTypeDialog from "@/components/order-wizard/components/ToothTypeDialog";
import ToothUnselectDialog from "@/components/order-wizard/components/ToothUnselectDialog";
import ImplantDetailsModal from "@/components/order-wizard/components/ImplantDetailsModal";

export interface ToothSelectorManagerProps {
  prescriptionType: string;
  selectedGroups: ToothGroup[];
  selectedTeeth: SelectedTooth[];
  onGroupsChange?: (groups: ToothGroup[], teeth: SelectedTooth[]) => void;
  onSelectionChange: (groups: ToothGroup[], teeth: SelectedTooth[]) => void;
  onProductComplete?: () => void;
  subPrescriptionTypes?: string;
  formData?: any;
  editMode?: boolean;
  readMode?: boolean;
}

// Helper functions to convert between new and legacy formats
export const convertToLegacyGroups = (
  groups: ToothGroup[]
): LegacyToothGroup[] => {
  return groups
    .filter(
      (group) =>
        group.groupType === "joint" ||
        group.groupType === "bridge" ||
        group.groupType === "separate"
    )
    .map((group, index) => {
      const allTeeth = group.teethDetails
        .flat()
        .map((tooth) => tooth.teethNumber);
      const pontics = group.teethDetails
        .flat()
        .filter((tooth) => tooth.type === "pontic")
        .map((tooth) => tooth.teethNumber);
      return {
        groupId: `group-${Date.now()}-${index}`,
        teeth: allTeeth,
        type: group.groupType as "joint" | "bridge" | "separate",
        productType: "implant",
        notes: "",
        material: (group.teethDetails.flat()[0]?.productName || []).join(", "),
        shade: group.teethDetails.flat()[0]?.shadeDetails || "",
        pontics: pontics.length > 0 ? pontics : undefined,
      };
    });
};

const convertToNewGroups = (legacyGroups: LegacyToothGroup[]): ToothGroup[] => {
  return legacyGroups.map((group) => {
    const teethDetails: ToothDetail[][] = [];

    // Group teeth by adjacency
    const sortedTeeth = group.teeth.sort((a, b) => a - b);
    let currentGroup: ToothDetail[] = [];

    sortedTeeth.forEach((toothNumber) => {
      const isPontic = group.pontics?.includes(toothNumber) || false;
      const toothDetail: ToothDetail = {
        teethNumber: toothNumber,
        productName: [group.material],
        productQuantity: 1,
        // shadeDetails: group.shade || "",
        // occlusalStaining: group.occlusalStaining || "",
        // shadeGuide: [],
        // shadeNotes: "",
        // trialRequirements: "",
        type: isPontic ? "pontic" : "abutment",
      };

      currentGroup.push(toothDetail);
    });

    if (currentGroup.length > 0) {
      teethDetails.push(currentGroup);
    }

    return {
      groupType: group.type,
      teethDetails,
    };
  });
};

// Helper to get full details from individual teeth if present
function getFullToothDetail(
  toothNumber: number,
  type: "abutment" | "pontic",
  localSelectedTeeth: SelectedTooth[]
) {
  const individual = localSelectedTeeth.find(
    (t) => t.toothNumber === toothNumber
  );
  const detail: any = {
    teethNumber: toothNumber,
    productName: individual?.productName || [],
    productQuantity: 1,
    shadeDetails: individual?.shadeDetails || "",
    occlusalStaining: individual?.occlusalStaining || "",
    shadeGuide: individual?.shadeGuide || null,
    shadeNotes: individual?.shadeNotes || "",
    trialRequirements: individual?.trialRequirements || "",
    type: type,
    implantDetails: individual?.implantDetails,
    selectedProducts: individual?.selectedProducts || [],
  };
  if (individual && "productDetails" in individual) {
    detail.productDetails = (individual as any).productDetails;
  }
  return detail;
}

export function Order({
  prescriptionType,
  selectedGroups,
  selectedTeeth,
  onGroupsChange,
  onSelectionChange,
  onProductComplete,
  subPrescriptionTypes,
  formData,
  editMode,
  readMode,
}: ToothSelectorManagerProps) {
  // --- State ---
  const [localSelectedTeeth, setLocalSelectedTeeth] = useState<SelectedTooth[]>(
    selectedTeeth || []
  );
  const [localSelectedGroups, setLocalSelectedGroups] = useState<ToothGroup[]>(
    selectedGroups || []
  );

  // --- Messaging: React -> Flutter ---
  useEffect(() => {
    const data = {
      selectedTeeth: localSelectedTeeth,
      selectedGroups: localSelectedGroups,
      prescriptionType,
      subPrescriptionTypes,
    };

    // Log the data structure for debugging
    console.log("🦷 [Flutter Sync] Sending selection data:", data);

    // 1. Standard postMessage (for WebView parent)
    window.postMessage(
      JSON.stringify({
        type: "TOOTH_SELECTION_UPDATE",
        payload: data,
      }),
      "*"
    );

    // 2. Flutter inappwebview channel
    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler(
        "onSelectionChange",
        JSON.stringify(data)
      );
    }

    // 3. Custom JS channel
    if (window.onSelectionChange) {
      window.onSelectionChange.postMessage(JSON.stringify(data));
    }
  }, [
    localSelectedTeeth,
    localSelectedGroups,
    prescriptionType,
    subPrescriptionTypes,
  ]);

  // --- Expose global functions for Flutter ---
  useEffect(() => {
    window.setToothSelection = (data) => {
      if (data.selectedTeeth) setLocalSelectedTeeth(data.selectedTeeth);
      if (data.selectedGroups) setLocalSelectedGroups(data.selectedGroups);
      if (data.prescriptionType) setPrescriptionType(data.prescriptionType);
      if (data.subPrescriptionTypes)
        setSubPrescriptionTypes(data.subPrescriptionTypes);
    };
    window.getToothSelection = () => ({
      selectedTeeth: localSelectedTeeth,
      selectedGroups: localSelectedGroups,
      prescriptionType,
      subPrescriptionTypes,
    });
    return () => {
      delete window.setToothSelection;
      delete window.getToothSelection;
    };
  }, [
    localSelectedTeeth,
    localSelectedGroups,
    prescriptionType,
    subPrescriptionTypes,
  ]);

  // --- Example: updateSelection handler ---
  const updateSelection = (groups: ToothGroup[], teeth: SelectedTooth[]) => {
    setLocalSelectedGroups(groups);
    setLocalSelectedTeeth(teeth);
    onSelectionChange(groups, teeth);
    if (onGroupsChange) onGroupsChange(groups, teeth);
  };

  const [productSelection, setProductSelection] = useState<
    "implant" | "crown-bridge" | null
  >(null);
  //   const [localSelectedTeeth, setLocalSelectedTeeth] = useState<SelectedTooth[]>(
  //     selectedTeeth || []
  //   );
  //   const [localSelectedGroups, setLocalSelectedGroups] = useState<ToothGroup[]>(
  //     selectedGroups || []
  //   );
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showUnselectDialog, setShowUnselectDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({
    x: 0,
    y: 0,
  });
  const [clickedTooth, setClickedTooth] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"digital" | "manual" | null>(
    null
  );

  // Define allowed teeth for specific subcategories
  const getAllowedTeeth = (subcategory: string | undefined): number[] => {
    if (!subcategory) return [];

    switch (subcategory) {
      case "inlay":
      case "onlay":
        return [
          14, 15, 16, 17, 18, 24, 25, 26, 27, 28, 34, 35, 36, 37, 38, 44, 45,
          46, 47, 48,
        ];
      case "veneers":
        return [
          11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 31, 32, 33, 34, 35, 41, 42,
          43, 44, 45,
        ];
      default:
        return [];
    }
  };

  const allowedTeeth = getAllowedTeeth(subPrescriptionTypes);
  const hasTeethRestriction = allowedTeeth.length > 0;

  // Check if this is splints-guards prescription type or other types that need arch selection
  const isSplints =
    prescriptionType === "splints-guards" ||
    formData?.prescriptionType === "splints-guards";

  // Check if current subcategory needs arch selection
  const needsArchSelection =
    isSplints ||
    [
      "clear-aligner",
      "retainer",
      "full-dentures",
      "sleep-apnea",
      "implant-full-arch",
    ].includes(subPrescriptionTypes || formData?.subPrescriptionTypes || "");

  // State for implant full arch workflow
  const [selectedArchTeeth, setSelectedArchTeeth] = useState<number[]>([]);
  const [showImplantSelection, setShowImplantSelection] = useState(false);
  const [selectedImplantTeeth, setSelectedImplantTeeth] = useState<number[]>(
    []
  );
  const [implantDetailsData, setImplantDetailsData] = useState<
    Record<number, any>
  >({});
  const [currentImplantToothForDetails, setCurrentImplantToothForDetails] =
    useState<number | null>(null);
  const [showImplantDetailsModal, setShowImplantDetailsModal] = useState(false);

  // Define arch teeth groups
  const upperArchTeeth = [
    11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
  ];
  const lowerArchTeeth = [
    31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  ];
  const allArchTeeth = [...upperArchTeeth, ...lowerArchTeeth];

  // Check if this is implant full arch
  const isImplantFullArch =
    subPrescriptionTypes === "implant-full-arch" ||
    formData?.subPrescriptionTypes === "implant-full-arch";

  // Arch selection handlers
  const handleArchSelection = (archType: "upper" | "lower" | "both") => {
    let teethToSelect: number[] = [];

    switch (archType) {
      case "upper":
        teethToSelect = upperArchTeeth;
        break;
      case "lower":
        teethToSelect = lowerArchTeeth;
        break;
      case "both":
        teethToSelect = allArchTeeth;
        break;
    }

    if (isImplantFullArch) {
      // For implant full arch, show implant selection step
      setSelectedArchTeeth(teethToSelect);
      setShowImplantSelection(true);
      // Don't reset selectedImplantTeeth and implantDetailsData to preserve existing details
      // Only reset if no existing data
      if (selectedImplantTeeth.length === 0) {
        setSelectedImplantTeeth([]);
      }
    } else {
      // For other types, directly select all teeth as abutments
      const newTeeth = teethToSelect.map((toothNumber) => ({
        toothNumber,
        type: "abutment" as const,
        prescriptionType,
      }));

      updateSelection([], newTeeth);
    }
  };

  // Handle implant tooth selection
  const handleImplantToothToggle = (toothNumber: number) => {
    if (selectedImplantTeeth.includes(toothNumber)) {
      // If already selected, remove from selection and clear details
      setSelectedImplantTeeth((prev) => prev.filter((t) => t !== toothNumber));
      setImplantDetailsData((prev) => {
        const newData = { ...prev };
        delete newData[toothNumber];
        return newData;
      });
    } else {
      // If not selected, open details modal for this tooth
      setCurrentImplantToothForDetails(toothNumber);
      setShowImplantDetailsModal(true);
    }
  };

  // Handle implant details save from modal
  const handleImplantDetailsSaveForSelection = (implantDetails: any) => {
    if (currentImplantToothForDetails !== null) {
      // Add tooth to selected implants
      setSelectedImplantTeeth((prev) => [
        ...prev,
        currentImplantToothForDetails,
      ]);

      // Store implant details
      setImplantDetailsData((prev) => ({
        ...prev,
        [currentImplantToothForDetails]: implantDetails,
      }));

      // Close modal and reset current tooth
      setShowImplantDetailsModal(false);
      setCurrentImplantToothForDetails(null);
    }
  };

  // Confirm implant selection and create bridge
  const handleConfirmImplantSelection = () => {
    if (selectedImplantTeeth.length === 0) {
      console.log("No implant teeth selected");
      return;
    }

    // Create tooth details for all arch teeth
    const teethDetails: ToothDetail[] = selectedArchTeeth
      .sort((a, b) => a - b)
      .map((toothNumber) => ({
        teethNumber: toothNumber,
        toothNumber: toothNumber, // Add compatibility field
        type: selectedImplantTeeth.includes(toothNumber)
          ? "abutment"
          : "pontic",
        productName: [],
        productDetails: {
          shade: "B1 - Vita Classic",
          productName: [],
          notes: "",
          ponticDesign: "",
          occlusalStaining: "medium",
        },
        selectedProducts: [],
        shadeGuide: [],
        shadeNotes: "",
        shadeDetails: "",
        productQuantity: 1,
        occlusalStaining: "",
        trialRequirements: "",
        // Add implant details if this is an implant tooth
        implantDetails: selectedImplantTeeth.includes(toothNumber)
          ? implantDetailsData[toothNumber]
          : undefined,
      }));

    // Create a bridge group
    const newGroup: ToothGroup = {
      groupType: "bridge",
      teethDetails: [teethDetails],
    };

    // Preserve existing groups and teeth by adding to them instead of replacing
    const updatedGroups = [...localSelectedGroups, newGroup];
    const updatedTeeth = [...localSelectedTeeth];

    updateSelection(updatedGroups, updatedTeeth);
    setShowImplantSelection(false);
    setSelectedArchTeeth([]);
    setSelectedImplantTeeth([]);
  };

  // Cancel implant selection
  const handleCancelImplantSelection = () => {
    setShowImplantSelection(false);
    setSelectedArchTeeth([]);
    // Don't clear selectedImplantTeeth and implantDetailsData to preserve existing details
    // Only clear if user explicitly wants to start over
    setCurrentImplantToothForDetails(null);
    setShowImplantDetailsModal(false);
  };

  // Check if a tooth is allowed for selection
  const isToothAllowed = (toothNumber: number): boolean => {
    if (!hasTeethRestriction) return true;
    return allowedTeeth.includes(toothNumber);
  };

  // console.log("selectedTeeth", selectedTeeth);
  // console.log("selectedGroups", selectedGroups);
  // console.log("onGroupsChange", onGroupsChange);
  // console.log("onSelectionChange", onSelectionChange);
  // console.log("onProductComplete", onProductComplete);

  useEffect(() => {
    setLocalSelectedTeeth(selectedTeeth || []);
  }, [selectedTeeth]);

  useEffect(() => {
    setLocalSelectedGroups(selectedGroups || []);
  }, [selectedGroups]);

  //   const updateSelection = (groups: ToothGroup[], teeth: SelectedTooth[]) => {
  //     setLocalSelectedGroups(groups);
  //     setLocalSelectedTeeth(teeth);
  //     onSelectionChange(groups, teeth);
  //     if (onGroupsChange) onGroupsChange(groups, teeth);
  //   };

  const isToothSelected = useCallback(
    (toothNumber: number) => {
      const inGroups = localSelectedGroups.some((group) =>
        group.teethDetails
          .flat()
          .some((tooth) => tooth.teethNumber === toothNumber)
      );
      const inIndividualTeeth = localSelectedTeeth.some(
        (tooth) => tooth.toothNumber === toothNumber
      );
      return inGroups || inIndividualTeeth;
    },
    [localSelectedTeeth, localSelectedGroups]
  );

  const getToothType = useCallback(
    (toothNumber: number): "abutment" | "pontic" | null => {
      // Check individual teeth first
      const selectedTooth = localSelectedTeeth.find(
        (tooth) => tooth.toothNumber === toothNumber
      );
      if (selectedTooth) {
        return selectedTooth.type;
      }

      // Check in groups
      for (const group of localSelectedGroups) {
        const toothDetail = group.teethDetails
          .flat()
          .find((tooth) => tooth.teethNumber === toothNumber);
        if (toothDetail) {
          return toothDetail.type;
        }
      }
      return null;
    },
    [localSelectedTeeth, localSelectedGroups]
  );

  const areTeethStrictlyAdjacent = (
    tooth1: number,
    tooth2: number
  ): boolean => {
    console.log("Checking strict adjacency between", tooth1, "and", tooth2);

    const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
    const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
    const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
    const lowerRight = [41, 42, 43, 44, 45, 46, 47, 48];

    const checkQuadrantAdjacency = (quadrant: number[]) => {
      const index1 = quadrant.indexOf(tooth1);
      const index2 = quadrant.indexOf(tooth2);
      if (index1 !== -1 && index2 !== -1) {
        return Math.abs(index1 - index2) === 1;
      }
      return false;
    };

    if (checkQuadrantAdjacency(upperRight)) return true;
    if (checkQuadrantAdjacency(upperLeft)) return true;
    if (checkQuadrantAdjacency(lowerLeft)) return true;
    if (checkQuadrantAdjacency(lowerRight)) return true;

    if ((tooth1 === 11 && tooth2 === 21) || (tooth1 === 21 && tooth2 === 11))
      return true;
    if ((tooth1 === 31 && tooth2 === 41) || (tooth1 === 41 && tooth2 === 31))
      return true;
    console.log("Teeth", tooth1, "and", tooth2, "are NOT strictly adjacent");
    return false;
  };

  const validateTeethSequence = (teeth: number[]): boolean => {
    if (teeth.length < 2) return true;
    for (let i = 0; i < teeth.length - 1; i++) {
      if (!areTeethStrictlyAdjacent(teeth[i], teeth[i + 1])) {
        console.log(
          "Invalid sequence: gap between",
          teeth[i],
          "and",
          teeth[i + 1]
        );
        return false;
      }
    }
    console.log("Sequence is valid");
    return true;
  };

  const handleToothClick = (toothNumber: number, event: React.MouseEvent) => {
    const rect = (event.target as Element).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    // Check if tooth is allowed for selection
    if (!isToothAllowed(toothNumber)) {
      console.log(
        `Tooth ${toothNumber} is not allowed for subcategory ${subPrescriptionTypes}`
      );
      return;
    }

    if (isToothSelected(toothNumber)) {
      // Only show unselect dialog for pontic teeth
      const toothType = getToothType(toothNumber);
      if (toothType === "pontic") {
        setClickedTooth(toothNumber);
        setDialogPosition(position);
        setShowUnselectDialog(true);
        return;
      } else {
        // For abutment teeth, directly unselect
        handleToothDeselection(toothNumber);
        return;
      }
    }

    // setClickedTooth(toothNumber);
    // setDialogPosition(position);
    // setShowTypeDialog(true);
  };

  const handleToothDeselection = (toothNumber: number) => {
    console.log("Deselecting tooth:", toothNumber);

    const groupContainingTooth = localSelectedGroups.find((g) =>
      g.teethDetails.flat().some((tooth) => tooth.teethNumber === toothNumber)
    );

    if (groupContainingTooth) {
      console.log("Tooth is in group:", groupContainingTooth.groupType);
      // Find all instances of this tooth number in the group
      const allTeethInGroup = groupContainingTooth.teethDetails.flat();
      const pontics = allTeethInGroup.filter(
        (t) => t.teethNumber === toothNumber && t.type === "pontic"
      );
      const abutments = allTeethInGroup.filter(
        (t) => t.teethNumber === toothNumber && t.type === "abutment"
      );

      // If there are multiple pontics, remove only one
      if (pontics.length > 0) {
        let removed = false;
        const updatedTeethDetails = groupContainingTooth.teethDetails
          .map((group) =>
            group.filter((tooth) => {
              if (
                !removed &&
                tooth.teethNumber === toothNumber &&
                tooth.type === "pontic"
              ) {
                removed = true;
                return false; // remove only one instance
              }
              return true;
            })
          )
          .filter((group) => group.length > 0);

        // If group is empty after removal, remove the group
        if (updatedTeethDetails.length === 0) {
          updateSelection(
            localSelectedGroups.filter((g) => g !== groupContainingTooth),
            localSelectedTeeth
          );
        } else {
          // Check if any pontics remain in the group
          const flatTeeth = updatedTeethDetails.flat();
          const hasPontics = flatTeeth.some((t) => t.type === "pontic");
          if (hasPontics) {
            const updatedGroup: ToothGroup = {
              ...groupContainingTooth,
              groupType: "bridge",
              teethDetails: updatedTeethDetails,
            };
            updateSelection(
              localSelectedGroups.map((g) =>
                g === groupContainingTooth ? updatedGroup : g
              ),
              localSelectedTeeth
            );
          } else {
            // No pontics remain: split into contiguous abutment fragments
            // 1. Get all abutment teeth in order
            const abutmentTeeth = flatTeeth
              .filter((t) => t.type === "abutment")
              .map((t) => t.teethNumber);
            // 2. Find contiguous fragments
            const upperArch = [
              18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
            ];
            const lowerArch = [
              48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
            ];
            const isUpper = abutmentTeeth.every((t) => upperArch.includes(t));
            const isLower = abutmentTeeth.every((t) => lowerArch.includes(t));
            const arch = isUpper ? upperArch : isLower ? lowerArch : null;
            const sortedTeeth = arch
              ? abutmentTeeth
                  .slice()
                  .sort((a, b) => arch.indexOf(a) - arch.indexOf(b))
              : abutmentTeeth.slice().sort((a, b) => a - b);
            const fragments: number[][] = [];
            let currentFragment = sortedTeeth.length ? [sortedTeeth[0]] : [];
            for (let i = 1; i < sortedTeeth.length; i++) {
              const currentTooth = sortedTeeth[i];
              const previousTooth = sortedTeeth[i - 1];
              if (areTeethStrictlyAdjacent(previousTooth, currentTooth)) {
                currentFragment.push(currentTooth);
              } else {
                fragments.push(currentFragment);
                currentFragment = [currentTooth];
              }
            }
            if (currentFragment.length) fragments.push(currentFragment);
            // 3. Build new groups/individuals
            const newGroups = localSelectedGroups.filter(
              (g) => g !== groupContainingTooth
            );
            let newIndividualTeeth = [...localSelectedTeeth];
            fragments.forEach((fragment) => {
              if (fragment.length === 1) {
                // Add as individual abutment
                const toothNum = fragment[0];
                newIndividualTeeth.push({
                  toothNumber: toothNum,
                  type: "abutment",
                  prescriptionType,
                });
              } else if (fragment.length > 1) {
                // Add as joint group
                const fragmentTeethDetails: ToothDetail[] = fragment.map(
                  (toothNum) => {
                    const toothDetail = flatTeeth.find(
                      (t) => t.teethNumber === toothNum
                    );
                    return (
                      toothDetail || {
                        teethNumber: toothNum,
                        productName: [],
                        productQuantity: 1,
                        // shadeDetails: "",
                        // occlusalStaining: "",
                        // shadeGuide: [],
                        // shadeNotes: "",
                        // trialRequirements: "",
                        type: "abutment",
                      }
                    );
                  }
                );
                newGroups.push({
                  groupType: "joint",
                  teethDetails: [fragmentTeethDetails],
                });
              }
            });
            updateSelection(newGroups, newIndividualTeeth);
          }
        }
        return;
      }

      // If there are abutments (and no pontics), remove the abutment as before
      if (abutments.length > 0) {
        // Remove abutment logic (same as before)
        const allTeethNumbers = allTeethInGroup.map((t) => t.teethNumber);
        const remainingTeeth = allTeethNumbers.filter((t) => t !== toothNumber);
        if (remainingTeeth.length === 0) {
          updateSelection(
            localSelectedGroups.filter((g) => g !== groupContainingTooth),
            localSelectedTeeth.filter((t) => t.toothNumber !== toothNumber)
          );
        } else if (remainingTeeth.length === 1) {
          const remainingToothNumber = remainingTeeth[0];
          const remainingToothDetail = groupContainingTooth.teethDetails
            .flat()
            .find((tooth) => tooth.teethNumber === remainingToothNumber);
          const remainingToothType = remainingToothDetail?.type || "abutment";
          updateSelection(
            localSelectedGroups.filter((g) => g !== groupContainingTooth),
            localSelectedTeeth
              .filter((t) => t.toothNumber !== toothNumber)
              .concat({
                toothNumber: remainingToothNumber,
                type: remainingToothType,
                prescriptionType,
              })
          );
        } else {
          if (validateTeethSequence(remainingTeeth)) {
            const updatedTeethDetails = groupContainingTooth.teethDetails
              .map((group) =>
                group.filter((tooth) => tooth.teethNumber !== toothNumber)
              )
              .filter((group) => group.length > 0);
            const updatedGroup: ToothGroup = {
              ...groupContainingTooth,
              teethDetails: updatedTeethDetails,
            };
            updateSelection(
              localSelectedGroups.map((g) =>
                g === groupContainingTooth ? updatedGroup : g
              ),
              localSelectedTeeth.filter((t) => t.toothNumber !== toothNumber)
            );
          } else {
            const fragments = findValidAdjacentFragments(remainingTeeth);
            const remainingGroups = localSelectedGroups.filter(
              (g) => g !== groupContainingTooth
            );
            const newGroups = [...remainingGroups];
            const newIndividualTeeth = [
              ...localSelectedTeeth.filter(
                (t) => t.toothNumber !== toothNumber
              ),
            ];
            fragments.forEach((fragment, index) => {
              if (fragment.length === 1) {
                const toothNum = fragment[0];
                const toothDetail = groupContainingTooth.teethDetails
                  .flat()
                  .find((t) => t.teethNumber === toothNum);
                const type = toothDetail?.type || "abutment";
                newIndividualTeeth.push({
                  toothNumber: toothNum,
                  type,
                  prescriptionType,
                });
              } else {
                const fragmentTeethDetails: ToothDetail[] = fragment.map(
                  (toothNum) => {
                    const toothDetail = groupContainingTooth.teethDetails
                      .flat()
                      .find((t) => t.teethNumber === toothNum);
                    return (
                      toothDetail || {
                        teethNumber: toothNum,
                        productName: [],
                        productQuantity: 1,
                        // shadeDetails: "",
                        // occlusalStaining: "",
                        // shadeGuide: [],
                        // shadeNotes: "",
                        // trialRequirements: "",
                        type: "abutment" as "abutment",
                      }
                    );
                  }
                );
                const hasPontics = fragmentTeethDetails.some(
                  (tooth) => tooth.type === "pontic"
                );
                const newGroup: ToothGroup = {
                  groupType: hasPontics ? "bridge" : "joint",
                  teethDetails: [fragmentTeethDetails],
                };
                newGroups.push(newGroup);
              }
            });
            updateSelection(newGroups, newIndividualTeeth);
          }
        }
      }
    } else {
      // Not in a group, remove from individual teeth
      updateSelection(
        localSelectedGroups,
        localSelectedTeeth.filter((t) => t.toothNumber !== toothNumber)
      );
    }
  };

  const findValidAdjacentFragments = (teeth: number[]): number[][] => {
    if (teeth.length === 0) return [];
    const upperArch = [
      18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    ];
    const lowerArch = [
      48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
    ];
    const isUpper = teeth.every((t) => upperArch.includes(t));
    const isLower = teeth.every((t) => lowerArch.includes(t));
    const arch = isUpper ? upperArch : isLower ? lowerArch : null;
    const sortedTeeth = arch
      ? teeth.slice().sort((a, b) => arch.indexOf(a) - arch.indexOf(b))
      : teeth.slice().sort((a, b) => a - b);
    const fragments: number[][] = [];
    let currentFragment = [sortedTeeth[0]];
    for (let i = 1; i < sortedTeeth.length; i++) {
      const currentTooth = sortedTeeth[i];
      const previousTooth = sortedTeeth[i - 1];
      if (areTeethStrictlyAdjacent(previousTooth, currentTooth)) {
        currentFragment.push(currentTooth);
      } else {
        fragments.push(currentFragment);
        currentFragment = [currentTooth];
      }
    }
    fragments.push(currentFragment);
    return fragments;
  };

  const handleToothUnselect = () => {
    if (clickedTooth === null) return;
    handleToothDeselection(clickedTooth);
  };

  const handleAddPontic = () => {
    if (clickedTooth === null) return;
    // Find the group containing this tooth
    const groupContainingTooth = localSelectedGroups.find((g) =>
      g.teethDetails.flat().some((tooth) => tooth.teethNumber === clickedTooth)
    );

    if (groupContainingTooth) {
      // Find the group array and index of the last occurrence
      let lastGroupIdx = -1;
      let lastToothIdx = -1;
      groupContainingTooth.teethDetails.forEach((groupArr, groupIdx) => {
        groupArr.forEach((tooth, toothIdx) => {
          if (tooth.teethNumber === clickedTooth) {
            lastGroupIdx = groupIdx;
            lastToothIdx = toothIdx;
          }
        });
      });
      if (lastGroupIdx !== -1 && lastToothIdx !== -1) {
        const groupArr = groupContainingTooth.teethDetails[lastGroupIdx];
        const existingToothDetail = groupArr[lastToothIdx];
        const newPonticDetail: ToothDetail = {
          ...existingToothDetail,
          type: "pontic",
        };
        // Insert after the last occurrence
        const updatedGroupArr = [
          ...groupArr.slice(0, lastToothIdx + 1),
          newPonticDetail,
          ...groupArr.slice(lastToothIdx + 1),
        ];
        const updatedTeethDetails = groupContainingTooth.teethDetails.map(
          (arr, idx) => (idx === lastGroupIdx ? updatedGroupArr : arr)
        );
        // Check if any pontics remain in the group after addition
        const flatTeeth = updatedTeethDetails.flat();
        const hasPontics = flatTeeth.some((t) => t.type === "pontic");
        const updatedGroup: ToothGroup = {
          ...groupContainingTooth,
          groupType: hasPontics ? "bridge" : "joint",
          teethDetails: updatedTeethDetails,
        };
        updateSelection(
          localSelectedGroups.map((g) =>
            g === groupContainingTooth ? updatedGroup : g
          ),
          localSelectedTeeth
        );
        return;
      }
    }
    // If it's an individual tooth, convert it to a group with two pontics
    const individualTooth = localSelectedTeeth.find(
      (t) => t.toothNumber === clickedTooth
    );
    if (individualTooth) {
      const newGroup: ToothGroup = {
        groupType: "bridge",
        prescriptionType: prescriptionType,
        subPrescriptionTypes: subPrescriptionTypes || "",
        productName: [],
        shade: "",
        occlusalStaining: "",
        ponticDesign: "",
        // shadeGuide: [],
        trial: "",
        shadeNote: "",
        teethDetails: [
          [
            {
              teethNumber: clickedTooth,
              productName: [],
              productQuantity: 1,
              // shadeDetails: "",
              // occlusalStaining: "",
              // shadeGuide: [],
              // shadeNotes: "",
              // trialRequirements: "",
              type: "pontic",
            },
            {
              teethNumber: clickedTooth,
              productName: [],
              productQuantity: 1,
              // shadeDetails: "",
              // occlusalStaining: "",
              // shadeGuide: [],
              // shadeNotes: "",
              // trialRequirements: "",
              type: "pontic",
            },
          ],
        ],
      };
      updateSelection(
        [...localSelectedGroups, newGroup],
        localSelectedTeeth.filter((t) => t.toothNumber !== clickedTooth)
      );
    }
  };

  const handleToothTypeSelection = (
    type: "abutment" | "pontic",
    toothNumber: number,
    implantDetails?: any
  ) => {
    // If prescriptionType is 'implant', ensure implantDetails is set
    let details = implantDetails;
    if (prescriptionType === "implant" && !details) {
      // Placeholder: In real UI, collect these from a modal or form
      details = {
        companyName: "",
        systemName: "",
        remarks: "",
        photo: undefined,
      };
    }
    const newToothDetail: ToothDetail = {
      teethNumber: toothNumber,
      type: type,
      productName: [],
      productDetails: {
        shade: "B1 - Vita Classic",
        productName: [],
        notes: "",
        ponticDesign: "",
        occlusalStaining: "medium",
      },
      selectedProducts: [],
      shadeGuide: [],
      shadeNotes: "",
      shadeDetails: "",
      productQuantity: 1,
      occlusalStaining: "",
      trialRequirements: "",
      implantDetails: prescriptionType === "implant" ? details : undefined,
    };

    updateSelection(
      localSelectedGroups,
      localSelectedTeeth.concat({
        toothNumber: toothNumber,
        type: type,
        prescriptionType,
        subPrescriptionTypes,
        selectedProducts: [],
        productDetails: {},
        implantDetails: prescriptionType === "implant" ? details : undefined,
      })
    );

    setShowTypeDialog(false);
    setClickedTooth(null);
  };

  const handleJoinGroup = (toothNumber: number, groupIndex: number) => {
    console.log("Joining tooth", toothNumber, "to group", groupIndex);

    const targetGroup = localSelectedGroups[groupIndex];
    if (!targetGroup) return;

    // Create new tooth detail
    const newToothDetail: ToothDetail = {
      teethNumber: toothNumber,
      productName: [],
      productQuantity: 1,
      shadeDetails: "",
      occlusalStaining: "",
      shadeGuide: [],
      shadeNotes: "",
      trialRequirements: "",
      type: "abutment",
    };

    // Insert at the beginning or end based on adjacency
    let updatedTeethDetails = [...targetGroup.teethDetails];
    if (updatedTeethDetails.length > 0) {
      const groupArr = updatedTeethDetails[0];
      if (groupArr.length > 0) {
        // If the new tooth is adjacent to the first, insert at the beginning
        if (areTeethStrictlyAdjacent(toothNumber, groupArr[0].teethNumber)) {
          updatedTeethDetails[0] = [newToothDetail, ...groupArr];
        } else if (
          areTeethStrictlyAdjacent(
            toothNumber,
            groupArr[groupArr.length - 1].teethNumber
          )
        ) {
          updatedTeethDetails[0] = [...groupArr, newToothDetail];
        } else {
          // Default: append to the end
          updatedTeethDetails[0] = [...groupArr, newToothDetail];
        }
      } else {
        updatedTeethDetails[0] = [newToothDetail];
      }
    } else {
      updatedTeethDetails.push([newToothDetail]);
    }

    const updatedGroup: ToothGroup = {
      ...targetGroup,
      teethDetails: updatedTeethDetails,
    };

    updateSelection(
      localSelectedGroups.map((g, index) =>
        index === groupIndex ? updatedGroup : g
      ),
      localSelectedTeeth.filter((t) => t.toothNumber !== toothNumber)
    );

    setShowTypeDialog(false);
    setClickedTooth(null);
  };

  const handleDragConnection = (teeth: number[] | number, splitData?: any) => {
    if (typeof teeth === "number") {
      if (teeth === -3) {
        // Remove group and add its teeth as individual teeth, preserving type/order
        if (splitData?.groupToRemove) {
          const group = splitData.groupToRemove;
          // Find the original group in localSelectedGroups by matching teethDetails
          const foundGroup = localSelectedGroups.find((g) => {
            const a = g.teethDetails
              .flat()
              .map((t) => t.teethNumber)
              .join(",");
            const b = group.teeth.join(",");
            return a === b;
          });
          let newIndividualTeeth = [...localSelectedTeeth];
          if (foundGroup) {
            // Add each tooth as an individual tooth with correct type/order
            foundGroup.teethDetails.flat().forEach((tooth) => {
              newIndividualTeeth.push({
                toothNumber: tooth.teethNumber,
                type: tooth.type,
                prescriptionType,
              });
            });
          }
          updateSelection(
            localSelectedGroups.filter((g) => g !== foundGroup),
            newIndividualTeeth
          );
        }
        return;
      }
      if (teeth === -4) {
        // Split group into new groups or individual teeth, preserving type/order
        if (splitData?.originalGroup && splitData?.newGroups) {
          const { originalGroup, newGroups } = splitData;
          // Find the original group in localSelectedGroups
          const foundGroup = localSelectedGroups.find((g) => {
            const a = g.teethDetails
              .flat()
              .map((t) => t.teethNumber)
              .join(",");
            const b = originalGroup.teeth.join(",");
            return a === b;
          });
          const updatedGroups = localSelectedGroups.filter(
            (g) => g !== foundGroup
          );
          let finalGroups = [...updatedGroups];
          let newIndividualTeeth = [
            ...localSelectedTeeth.filter(
              (t) => !originalGroup.teeth.includes(t.toothNumber)
            ),
          ];
          newGroups.forEach((group: LegacyToothGroup) => {
            if (group.teeth.length === 1) {
              const toothNumber = group.teeth[0];
              const wasPontic = group.pontics?.includes(toothNumber);
              const type = wasPontic ? "pontic" : "abutment";
              newIndividualTeeth.push({
                toothNumber,
                type,
                prescriptionType,
              });
            } else {
              // Build ToothDetail[] in the order of group.teeth
              const fragmentTeethDetails: ToothDetail[] = group.teeth.map(
                (toothNumber) => {
                  const isPontic =
                    group.pontics?.includes(toothNumber) || false;
                  return {
                    teethNumber: toothNumber,
                    productName: [],
                    productQuantity: 1,
                    // shadeDetails: group.shade || "",
                    // occlusalStaining: group.occlusalStaining || "",
                    // shadeGuide: [],
                    // shadeNotes: "",
                    // trialRequirements: "",
                    type: isPontic ? "pontic" : "abutment",
                  };
                }
              );
              const hasPontics = fragmentTeethDetails.some(
                (tooth) => tooth.type === "pontic"
              );
              const newGroup: ToothGroup = {
                groupType: hasPontics ? "bridge" : "joint",
                teethDetails: [fragmentTeethDetails],
              };
              finalGroups.push(newGroup);
            }
          });
          updateSelection(finalGroups, newIndividualTeeth);
        }
        return;
      }
    }

    if (Array.isArray(teeth) && teeth.length > 1) {
      console.log("Drag connection received:", teeth);

      // Find involved groups and individual teeth
      const involvedGroups = localSelectedGroups.filter((group) =>
        group.teethDetails
          .flat()
          .some((tooth) => teeth.includes(tooth.teethNumber))
      );

      console.log("Involved groups:", involvedGroups);

      // Check if we're trying to merge into an existing group
      if (involvedGroups.length === 1) {
        const existingGroup = involvedGroups[0];
        const existingGroupTeeth = existingGroup.teethDetails
          .flat()
          .map((t) => t.teethNumber);
        const newTeeth = teeth.filter((t) => !existingGroupTeeth.includes(t));

        console.log("Existing group teeth:", existingGroupTeeth);
        console.log("New teeth to add:", newTeeth);

        if (newTeeth.length > 0) {
          // We're adding new teeth to an existing group
          // Build the complete sequence by combining existing and new teeth
          let completeSequence: number[] = [];

          // Start with existing group teeth in their current order
          completeSequence = [...existingGroupTeeth];

          // Add new teeth in the order they were dragged
          newTeeth.forEach((toothNumber) => {
            // Find the best position to insert based on adjacency
            let insertIndex = -1;

            // Check if we can insert at the beginning
            if (
              completeSequence.length > 0 &&
              areTeethStrictlyAdjacent(toothNumber, completeSequence[0])
            ) {
              insertIndex = 0;
            } else {
              // Check for insertion in the middle or end
              for (let i = 0; i < completeSequence.length; i++) {
                if (
                  areTeethStrictlyAdjacent(toothNumber, completeSequence[i])
                ) {
                  // Insert after this tooth
                  insertIndex = i + 1;
                  break;
                }
              }
            }

            if (insertIndex === -1) {
              // If no adjacency found, append to the end
              completeSequence.push(toothNumber);
            } else {
              completeSequence.splice(insertIndex, 0, toothNumber);
            }
          });

          console.log("Complete sequence:", completeSequence);

          // Validate the complete sequence
          if (!validateTeethSequence(completeSequence)) {
            console.log("Invalid sequence after merging");
            return;
          }

          // Build the new teeth details in the complete sequence order
          const newTeethDetails: ToothDetail[] = completeSequence.map(
            (toothNumber) => {
              // First check if it exists in the existing group
              const existingTooth = existingGroup.teethDetails
                .flat()
                .find((t) => t.teethNumber === toothNumber);
              if (existingTooth) {
                return existingTooth;
              }

              // Check if it exists in individual teeth
              const individualTooth = localSelectedTeeth.find(
                (t) => t.toothNumber === toothNumber
              );
              if (individualTooth) {
                return {
                  teethNumber: toothNumber,
                  toothNumber: toothNumber, // Add compatibility field
                  productName: [],
                  productQuantity: 1,
                  shadeDetails: "",
                  occlusalStaining: "",
                  shadeGuide: [],
                  shadeNotes: "",
                  trialRequirements: "",
                  type: individualTooth.type,
                  implantDetails: individualTooth
                    ? individualTooth.implantDetails
                    : undefined,
                };
              }

              // New tooth, default to abutment
              return {
                teethNumber: toothNumber,
                toothNumber: toothNumber, // Add compatibility field
                productName: [],
                productQuantity: 1,
                // shadeDetails: "",
                // occlusalStaining: "",
                // shadeGuide: [],
                // shadeNotes: "",
                // trialRequirements: "",
                type: "abutment",
              };
            }
          );

          const hasPontics = newTeethDetails.some((t) => t.type === "pontic");
          const groupType = hasPontics ? "bridge" : "joint";

          const updatedGroup: ToothGroup = {
            ...existingGroup,
            groupType,
            teethDetails: [newTeethDetails],
          };

          // Remove the old group and any individual teeth now in the group
          const remainingGroups = localSelectedGroups.filter(
            (g) => g !== existingGroup
          );
          const remainingIndividualTeeth = localSelectedTeeth.filter(
            (t) => !completeSequence.includes(t.toothNumber)
          );

          updateSelection(
            [...remainingGroups, updatedGroup],
            remainingIndividualTeeth
          );
          return;
        }
        // If no new teeth, do nothing (already in group)
        return;
      }

      // Handle case where teeth span multiple groups or are all individual
      // First, check if we're trying to connect to an existing group from outside
      if (involvedGroups.length === 0 && teeth.length === 2) {
        // This might be connecting an individual tooth to an existing group
        const [tooth1, tooth2] = teeth;
        const group1 = localSelectedGroups.find((g) =>
          g.teethDetails.flat().some((t) => t.teethNumber === tooth1)
        );
        const group2 = localSelectedGroups.find((g) =>
          g.teethDetails.flat().some((t) => t.teethNumber === tooth2)
        );

        if (group1 && !group2) {
          // tooth1 is in a group, tooth2 is individual - merge tooth2 into group1
          const existingGroupTeeth = group1.teethDetails
            .flat()
            .map((t) => t.teethNumber);
          if (areTeethStrictlyAdjacent(tooth1, tooth2)) {
            // Find the best position to insert tooth2
            let insertIndex = -1;
            if (areTeethStrictlyAdjacent(tooth2, existingGroupTeeth[0])) {
              insertIndex = 0;
            } else {
              for (let i = 0; i < existingGroupTeeth.length; i++) {
                if (areTeethStrictlyAdjacent(tooth2, existingGroupTeeth[i])) {
                  insertIndex = i + 1;
                  break;
                }
              }
            }

            if (insertIndex !== -1) {
              const newSequence = [...existingGroupTeeth];
              newSequence.splice(insertIndex, 0, tooth2);

              if (validateTeethSequence(newSequence)) {
                const individualTooth = localSelectedTeeth.find(
                  (t) => t.toothNumber === tooth2
                );
                const newToothDetail: ToothDetail = {
                  teethNumber: tooth2,
                  productName: [],
                  productQuantity: 1,
                  shadeDetails: "",
                  occlusalStaining: "",
                  shadeGuide: [],
                  shadeNotes: "",
                  trialRequirements: "",
                  type: individualTooth ? individualTooth.type : "abutment",
                };

                const newTeethDetails: ToothDetail[] = newSequence.map(
                  (toothNumber) => {
                    const existing = group1.teethDetails
                      .flat()
                      .find((t) => t.teethNumber === toothNumber);
                    return existing || newToothDetail;
                  }
                );

                const hasPontics = newTeethDetails.some(
                  (t) => t.type === "pontic"
                );
                const updatedGroup: ToothGroup = {
                  ...group1,
                  groupType: hasPontics ? "bridge" : "joint",
                  teethDetails: [newTeethDetails],
                };

                const remainingGroups = localSelectedGroups.filter(
                  (g) => g !== group1
                );
                const remainingIndividualTeeth = localSelectedTeeth.filter(
                  (t) => t.toothNumber !== tooth2
                );

                updateSelection(
                  [...remainingGroups, updatedGroup],
                  remainingIndividualTeeth
                );
                return;
              }
            }
          }
        } else if (!group1 && group2) {
          // tooth2 is in a group, tooth1 is individual - merge tooth1 into group2
          const existingGroupTeeth = group2.teethDetails
            .flat()
            .map((t) => t.teethNumber);
          if (areTeethStrictlyAdjacent(tooth1, tooth2)) {
            // Find the best position to insert tooth1
            let insertIndex = -1;
            if (areTeethStrictlyAdjacent(tooth1, existingGroupTeeth[0])) {
              insertIndex = 0;
            } else {
              for (let i = 0; i < existingGroupTeeth.length; i++) {
                if (areTeethStrictlyAdjacent(tooth1, existingGroupTeeth[i])) {
                  insertIndex = i + 1;
                  break;
                }
              }
            }

            if (insertIndex !== -1) {
              const newSequence = [...existingGroupTeeth];
              newSequence.splice(insertIndex, 0, tooth1);

              if (validateTeethSequence(newSequence)) {
                const individualTooth = localSelectedTeeth.find(
                  (t) => t.toothNumber === tooth1
                );
                const newToothDetail: ToothDetail = {
                  teethNumber: tooth1,
                  productName: [],
                  productQuantity: 1,
                  shadeDetails: "",
                  occlusalStaining: "",
                  shadeGuide: [],
                  shadeNotes: "",
                  trialRequirements: "",
                  type: individualTooth ? individualTooth.type : "abutment",
                };

                const newTeethDetails: ToothDetail[] = newSequence.map(
                  (toothNumber) => {
                    const existing = group2.teethDetails
                      .flat()
                      .find((t) => t.teethNumber === toothNumber);
                    return existing || newToothDetail;
                  }
                );

                const hasPontics = newTeethDetails.some(
                  (t) => t.type === "pontic"
                );
                const updatedGroup: ToothGroup = {
                  ...group2,
                  groupType: hasPontics ? "bridge" : "joint",
                  teethDetails: [newTeethDetails],
                };

                const remainingGroups = localSelectedGroups.filter(
                  (g) => g !== group2
                );
                const remainingIndividualTeeth = localSelectedTeeth.filter(
                  (t) => t.toothNumber !== tooth1
                );

                updateSelection(
                  [...remainingGroups, updatedGroup],
                  remainingIndividualTeeth
                );
                return;
              }
            }
          }
        }
      }

      // Build the connectedTeethData array in the order of the drag/select
      const connectedTeethData: ToothDetail[] = teeth.map((toothNumber) => {
        // Check if tooth exists in individual teeth
        const individualTooth = localSelectedTeeth.find(
          (t) => t.toothNumber === toothNumber
        );
        if (individualTooth) {
          return {
            teethNumber: toothNumber,
            toothNumber: toothNumber, // Add compatibility field
            productName: [],
            productQuantity: 1,
            shadeDetails: "",
            occlusalStaining: "",
            shadeGuide: [],
            shadeNotes: "",
            trialRequirements: "",
            type: individualTooth.type,
            implantDetails: individualTooth.implantDetails,
          };
        } else {
          // Check if tooth exists in groups
          for (const group of involvedGroups) {
            const toothDetail = group.teethDetails
              .flat()
              .find((t) => t.teethNumber === toothNumber);
            if (toothDetail) {
              return toothDetail;
            }
          }
          // New tooth, default to abutment
          return {
            teethNumber: toothNumber,
            toothNumber: toothNumber, // Add compatibility field
            productName: [],
            productQuantity: 1,
            shadeDetails: "",
            occlusalStaining: "",
            shadeGuide: [],
            shadeNotes: "",
            trialRequirements: "",
            type: "abutment",
          };
        }
      });

      // Validate adjacency
      if (!validateTeethSequence(teeth)) {
        console.log(
          "Connection rejected: final sequence would create non-adjacent connections"
        );
        return;
      }

      // Determine group type
      const pontics = connectedTeethData
        .filter((tooth) => tooth.type === "pontic")
        .map((tooth) => tooth.teethNumber);
      const groupType = pontics.length > 0 ? "bridge" : "joint";

      // Create new group in the order of selection
      const newGroup: ToothGroup = {
        groupType,
        teethDetails: [connectedTeethData],
      };

      // Remove involved groups and individual teeth
      const allTeethInConnection = new Set(teeth);
      const remainingGroups = localSelectedGroups.filter(
        (g) => !involvedGroups.includes(g)
      );
      const remainingIndividualTeeth = localSelectedTeeth.filter(
        (t) => !allTeethInConnection.has(t.toothNumber)
      );

      updateSelection([...remainingGroups, newGroup], remainingIndividualTeeth);
    }
  };
  // Convert to legacy format for child components that still expect it
  const legacyGroups = convertToLegacyGroups(localSelectedGroups);

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-fit">
      <div className="min-w-[320px] sm:min-w-0 p-2 sm:p-3 relative overflow-x-auto bg-[#E2F4F1] rounded-lg">
        <ToothChart
          selectedGroups={legacyGroups}
          selectedTeeth={localSelectedTeeth}
          onToothClick={readMode ? undefined : handleToothClick}
          onDragConnection={readMode ? undefined : handleDragConnection}
          isToothSelected={isToothSelected}
          getToothType={getToothType}
          onGroupsChange={
            readMode
              ? undefined
              : (groups) => {
                  const newGroups = convertToNewGroups(groups);
                  updateSelection(newGroups, localSelectedTeeth);
                }
          }
          setSelectedTeeth={
            readMode
              ? undefined
              : (teeth) =>
                  updateSelection(localSelectedGroups, teeth as SelectedTooth[])
          }
          // allowedTeeth and hasTeethRestriction are fine to pass always
          allowedTeeth={allowedTeeth}
          hasTeethRestriction={hasTeethRestriction}
          readMode={readMode}
        />
      </div>
      <ToothTypeDialog
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        toothNumber={clickedTooth || 0}
        position={dialogPosition}
        onSelectType={(type, implantDetails) =>
          handleToothTypeSelection(type, clickedTooth!, implantDetails)
        }
        selectedGroups={legacyGroups}
        onJoinGroup={(toothNumber, groupId) => {
          const index = legacyGroups.findIndex((g) => g.groupId === groupId);
          if (index !== -1) handleJoinGroup(toothNumber, index);
        }}
        debugMode={false}
        prescriptionType={prescriptionType}
      />
      <ToothUnselectDialog
        isOpen={showUnselectDialog}
        onClose={() => setShowUnselectDialog(false)}
        toothNumber={clickedTooth || 0}
        onUnselect={handleToothUnselect}
        onAddPontic={handleAddPontic}
      />
      <ImplantDetailsModal
        isOpen={showImplantDetailsModal}
        onClose={() => {
          setShowImplantDetailsModal(false);
          setCurrentImplantToothForDetails(null);
        }}
        toothNumber={currentImplantToothForDetails || 0}
        onSave={handleImplantDetailsSaveForSelection}
      />
    </div>
  );
}
