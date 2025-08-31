import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LegacyToothGroup, PrescriptionType } from "../types/orderTypes";
import { useIsMobile } from "@/hooks/use-mobile";
import ImplantDetailsModal from "./ImplantDetailsModal";

interface ToothTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  position: { x: number; y: number };
  onSelectType: (type: "abutment" | "pontic", implantDetails?: any) => void;
  selectedGroups: LegacyToothGroup[];
  onJoinGroup?: (toothNumber: number, groupId: string) => void;
  debugMode?: boolean; // Add debug mode for testing
  prescriptionType: PrescriptionType;
}

const ToothTypeDialog = ({
  isOpen,
  onClose,
  toothNumber,
  position,
  onSelectType,
  selectedGroups,
  onJoinGroup,
  debugMode = false,
  prescriptionType,
}: ToothTypeDialogProps) => {
  const isMobile = useIsMobile();
  const [showImplantModal, setShowImplantModal] = useState(false);

  // Check if tooth can join existing groups
  const getJoinableGroups = () => {
    const joinableGroups: {
      group: LegacyToothGroup;
      direction: "upper" | "lower";
      isAdjacent: boolean;
    }[] = [];

    // Define arch sequences (FDI numbering)
    const upperArch = [
      18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    ];
    const lowerArch = [
      48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
    ];

    // console.log('ToothTypeDialog: Checking joinable groups for tooth', toothNumber);
    // console.log('ToothTypeDialog: Available groups:', selectedGroups.map(g => ({ id: g.groupId, teeth: g.teeth })));

    selectedGroups.forEach((group) => {
      if (group.teeth.length === 0) return;

      // console.log('ToothTypeDialog: Checking group', group.groupId, 'with teeth', group.teeth);

      // Determine which arch the group belongs to (majority rule)
      const upperTeethInGroup = group.teeth.filter((t) =>
        upperArch.includes(t)
      );
      const lowerTeethInGroup = group.teeth.filter((t) =>
        lowerArch.includes(t)
      );

      const groupInUpper = upperTeethInGroup.length > lowerTeethInGroup.length;
      const groupInLower = lowerTeethInGroup.length > upperTeethInGroup.length;

      const newToothInUpper = upperArch.includes(toothNumber);
      const newToothInLower = lowerArch.includes(toothNumber);

      // console.log('ToothTypeDialog: Group arch - upper:', groupInUpper, 'lower:', groupInLower);
      // console.log('ToothTypeDialog: New tooth arch - upper:', newToothInUpper, 'lower:', newToothInLower);

      if (groupInUpper && newToothInUpper) {
        // Sort group teeth by arch order
        const sortedGroupTeeth = group.teeth
          .slice()
          .sort((a, b) => upperArch.indexOf(a) - upperArch.indexOf(b));
        const first = sortedGroupTeeth[0];
        const last = sortedGroupTeeth[sortedGroupTeeth.length - 1];
        const newToothIndex = upperArch.indexOf(toothNumber);
        const firstIndex = upperArch.indexOf(first);
        const lastIndex = upperArch.indexOf(last);
        if (newToothIndex === firstIndex - 1) {
          joinableGroups.push({ group, direction: "upper", isAdjacent: true });
        } else if (newToothIndex === lastIndex + 1) {
          joinableGroups.push({ group, direction: "upper", isAdjacent: true });
        }
      } else if (groupInLower && newToothInLower) {
        const sortedGroupTeeth = group.teeth
          .slice()
          .sort((a, b) => lowerArch.indexOf(a) - lowerArch.indexOf(b));
        const first = sortedGroupTeeth[0];
        const last = sortedGroupTeeth[sortedGroupTeeth.length - 1];
        const newToothIndex = lowerArch.indexOf(toothNumber);
        const firstIndex = lowerArch.indexOf(first);
        const lastIndex = lowerArch.indexOf(last);
        if (newToothIndex === firstIndex - 1) {
          joinableGroups.push({ group, direction: "lower", isAdjacent: true });
        } else if (newToothIndex === lastIndex + 1) {
          joinableGroups.push({ group, direction: "lower", isAdjacent: true });
        }
      }
    });

    // console.log('ToothTypeDialog: Final joinable groups:', joinableGroups.length);
    return joinableGroups;
  };

  const joinableGroups = getJoinableGroups();

  // Debug mode: Show test join options
  const debugJoinableGroups = debugMode
    ? [
        {
          group: { groupId: "debug-upper", teeth: [11, 12, 13, 14, 15, 16] },
          direction: "upper" as const,
          isAdjacent: true,
        },
        {
          group: { groupId: "debug-lower", teeth: [31, 32, 33, 34] },
          direction: "lower" as const,
          isAdjacent: false,
        },
      ]
    : [];

  const finalJoinableGroups = debugMode ? debugJoinableGroups : joinableGroups;

  const handleImplantToothClick = () => {
    if (prescriptionType === "implant") {
      setShowImplantModal(true);
    } else {
      onSelectType("abutment");
    }
  };

  const handleImplantDetailsSave = (implantDetails: any) => {
    onSelectType("abutment", implantDetails);
    setShowImplantModal(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-min p-4"
        style={
          isMobile
            ? {
                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }
            : {
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: "translate(-50%, -50%)",
              }
        }
      >
        <DialogHeader>
          <DialogTitle className="text-sm">Tooth {toothNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 flex flex-col items-center gap-1">
          <Button
            type="button"
            onClick={handleImplantToothClick}
            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 w-full"
          >
            {prescriptionType === "implant"
              ? "Implant Tooth"
              : "Abutment Tooth"}
            {/* Abutment */}
          </Button>
          <Button
            type="button"
            onClick={() => onSelectType("pontic")}
            className="text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1 w-full"
          >
            Pontic
          </Button>

          {/* Join options */}
          {finalJoinableGroups.map(({ group, direction, isAdjacent }) => (
            <Button
              type="button"
              key={group.groupId}
              onClick={() => onJoinGroup?.(toothNumber, group.groupId)}
              className={`w-full text-sm ${
                (group as any).type === "separate"
                  ? "bg-green-500 hover:bg-green-600"
                  : (group as any).type === "bridge"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Join With ({group.teeth.join(", ")})
            </Button>
          ))}
        </div>
      </DialogContent>

      <ImplantDetailsModal
        isOpen={showImplantModal}
        onClose={() => setShowImplantModal(false)}
        toothNumber={toothNumber}
        onSave={handleImplantDetailsSave}
      />
    </Dialog>
  );
};

export default ToothTypeDialog;
