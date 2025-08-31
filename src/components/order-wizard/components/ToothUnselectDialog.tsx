import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ToothUnselectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  onUnselect: () => void;
  onAddPontic: () => void;
}

const ToothUnselectDialog = ({
  isOpen,
  onClose,
  toothNumber,
  onUnselect,
  onAddPontic,
}: ToothUnselectDialogProps) => {
  const handleUnselect = () => {
    onUnselect();
    onClose();
  };

  const handleAddPontic = () => {
    onAddPontic();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            Pontic Tooth {toothNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-center">
          <p className="text-sm text-gray-600 mb-4">
            What would you like to do with this pontic?
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleUnselect} className="flex-1">
            🗑️ Remove
          </Button>

          <Button
            variant="default"
            onClick={handleAddPontic}
            className="flex-1"
          >
            ➕ Add Another
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToothUnselectDialog;
