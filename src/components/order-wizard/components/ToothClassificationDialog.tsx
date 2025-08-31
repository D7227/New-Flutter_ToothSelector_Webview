
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToothGroup } from '../types/tooth';

interface ToothModificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clickedTooth: number;
  currentGroup: ToothGroup | null;
  onMakeAbutment: () => void;
  onMakePontic: () => void;
  onRemoveTooth: () => void;
  onSplitGroup: () => void;
}

const ToothModificationDialog = ({
  isOpen,
  onClose,
  clickedTooth,
  currentGroup,
  onMakeAbutment,
  onMakePontic,
  onRemoveTooth,
  onSplitGroup
}: ToothModificationDialogProps) => {
  // Early return if currentGroup is null
  if (!currentGroup) {
    return null;
  }

  const isPontic = currentGroup.pontics?.includes(clickedTooth) || false;
  const isAbutment = !isPontic && currentGroup.teeth.includes(clickedTooth);
  const isBridge = currentGroup.type === 'bridge';
  const isJoint = currentGroup.type === 'joint';
  const canSplit = currentGroup.teeth.length > 1; // Can split if more than 1 tooth in group

  const handleSplitGroup = () => {
    console.log('Split group clicked for tooth:', clickedTooth, 'in group:', currentGroup);
    onSplitGroup();
    onClose();
  };

  const handleMakeAbutment = () => {
    console.log('Make abutment clicked for tooth:', clickedTooth);
    onMakeAbutment();
    onClose();
  };

  const handleMakePontic = () => {
    console.log('Make pontic clicked for tooth:', clickedTooth);
    onMakePontic();
    onClose();
  };

  const handleRemoveTooth = () => {
    console.log('Remove tooth clicked for tooth:', clickedTooth);
    onRemoveTooth();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🦷 Modify Tooth {clickedTooth}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800 mb-2">
              Current Status: Tooth {clickedTooth}
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                {currentGroup.type === 'bridge' ? 'Bridge' : 
                 currentGroup.type === 'joint' ? 'Joint' : 'Separate'}
              </Badge>
              {isPontic && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                  Pontic
                </Badge>
              )}
              {isAbutment && isBridge && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                  Abutment
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-800 mb-2">
              Group includes teeth: {currentGroup.teeth.join(', ')}
            </div>
            {currentGroup.pontics && currentGroup.pontics.length > 0 && (
              <div className="text-sm text-purple-800">
                Pontics: {currentGroup.pontics.join(', ')}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to modify Tooth {clickedTooth}:
          </p>

          <div className="space-y-3">
            {isBridge && isPontic && (
              <div className="p-3 border rounded-lg bg-orange-50">
                <div className="font-medium text-sm mb-1">🏗️ Make Abutment</div>
                <div className="text-xs text-gray-600">
                  Convert this pontic tooth to an abutment tooth in the bridge.
                </div>
              </div>
            )}
            
            {isBridge && isAbutment && currentGroup.teeth.length > 2 && (
              <div className="p-3 border rounded-lg bg-purple-50">
                <div className="font-medium text-sm mb-1">🌉 Make Pontic</div>
                <div className="text-xs text-gray-600">
                  Convert this abutment tooth to a pontic in the bridge.
                </div>
              </div>
            )}

            {canSplit && (
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="font-medium text-sm mb-1">✂️ Split Group</div>
                <div className="text-xs text-gray-600">
                  Remove this tooth from the group and make it individual. Remaining teeth stay grouped.
                </div>
              </div>
            )}

            <div className="p-3 border rounded-lg bg-red-50">
              <div className="font-medium text-sm mb-1">🗑️ Remove Tooth</div>
              <div className="text-xs text-gray-600">
                Remove this tooth from the restoration completely.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isBridge && isPontic && (
            <Button
              variant="outline"
              onClick={handleMakeAbutment}
              className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              🏗️ Make Abutment
            </Button>
          )}
          
          {isBridge && isAbutment && currentGroup.teeth.length > 2 && (
            <Button
              variant="outline"
              onClick={handleMakePontic}
              className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              🌉 Make Pontic
            </Button>
          )}

          {canSplit && (
            <Button
              variant="outline"
              onClick={handleSplitGroup}
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              ✂️ Split
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleRemoveTooth}
            className="flex-1"
          >
            🗑️ Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToothModificationDialog;
