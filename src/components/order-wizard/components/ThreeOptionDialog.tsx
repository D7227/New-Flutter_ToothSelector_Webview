
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ThreeOptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  adjacentTooth: number;
  gapTeeth: number[];
  onSelectSeparate: () => void;
  onSelectJoint: () => void;
  onSelectBridge: () => void;
}

const ThreeOptionDialog = ({
  isOpen,
  onClose,
  toothNumber,
  adjacentTooth,
  gapTeeth,
  onSelectSeparate,
  onSelectJoint,
  onSelectBridge
}: ThreeOptionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🦷 Multiple Options for Tooth {toothNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800 mb-2">
              Tooth {toothNumber} is adjacent to Tooth {adjacentTooth}
            </div>
          </div>

          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-800 mb-2">
              Missing teeth between selections:
            </div>
            <div className="flex flex-wrap gap-1">
              {gapTeeth.map(tooth => (
                <Badge key={tooth} className="bg-purple-100 text-purple-800 border-purple-300">
                  Tooth {tooth}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to restore Tooth {toothNumber}:
          </p>

          <div className="space-y-3">
            <div className="p-3 border rounded-lg bg-blue-50">
              <div className="font-medium text-sm mb-1">🔷 Separate Restoration</div>
              <div className="text-xs text-gray-600">
                Tooth {toothNumber} will be a separate restoration.
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-green-50">
              <div className="font-medium text-sm mb-1">🔗 Joint Restoration</div>
              <div className="text-xs text-gray-600">
                Tooth {toothNumber} will be joined with adjacent tooth {adjacentTooth}.
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-orange-50">
              <div className="font-medium text-sm mb-1">🌉 Bridge Restoration</div>
              <div className="text-xs text-gray-600">
                Create a bridge using {gapTeeth.join(', ')} as pontic(s).
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onSelectSeparate}
            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            🔷 Separate
          </Button>
          <Button
            variant="outline"
            onClick={onSelectJoint}
            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
          >
            🔗 Joint
          </Button>
          <Button
            onClick={onSelectBridge}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            🌉 Bridge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThreeOptionDialog;
