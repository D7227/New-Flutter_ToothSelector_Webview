
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ToothSelectionControlsProps {
  tempSelection: number[];
  showRestorationType: boolean;
  selectedRestorationType?: 'separate' | 'joint' | 'bridge' | null;
  onCreateGroup: (type: 'separate' | 'joint' | 'bridge') => void;
  onRestorationTypeSelect?: (type: 'separate' | 'joint' | 'bridge') => void;
  showPonticDialog?: boolean;
  bridgeTeeth?: number[];
  onPonticSelect?: (ponticTeeth: number[]) => void;
  onPonticDialogClose?: () => void;
}

const ToothSelectionControls = ({ 
  tempSelection, 
  showRestorationType, 
  selectedRestorationType,
  onCreateGroup,
  onRestorationTypeSelect,
  showPonticDialog = false,
  bridgeTeeth = [],
  onPonticSelect,
  onPonticDialogClose
}: ToothSelectionControlsProps) => {
  const [selectedPontics, setSelectedPontics] = React.useState<number[]>([]);

  if (tempSelection.length === 0) {
    return null;
  }

  const handleTypeSelect = (type: 'separate' | 'joint' | 'bridge') => {
    if (onRestorationTypeSelect) {
      onRestorationTypeSelect(type);
    }
  };

  const getRestorationTypeColor = (type: 'separate' | 'joint' | 'bridge') => {
    const colors = {
      separate: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
      joint: 'bg-green-600 hover:bg-green-700 border-green-500',
      bridge: 'bg-orange-600 hover:bg-orange-700 border-orange-500'
    };
    return colors[type];
  };

  const getSelectedColor = (type: 'separate' | 'joint' | 'bridge') => {
    if (selectedRestorationType === type) {
      return getRestorationTypeColor(type) + ' ring-2 ring-offset-2 ring-blue-400';
    }
    return getRestorationTypeColor(type);
  };

  const handlePonticToggle = (toothNumber: number) => {
    setSelectedPontics(prev => 
      prev.includes(toothNumber) 
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    );
  };

  const handlePonticConfirm = () => {
    if (onPonticSelect) {
      onPonticSelect(selectedPontics);
    }
    setSelectedPontics([]);
    if (onPonticDialogClose) {
      onPonticDialogClose();
    }
  };

  const handlePonticCancel = () => {
    setSelectedPontics([]);
    if (onPonticDialogClose) {
      onPonticDialogClose();
    }
  };

  return (
    <>
      <div className="mb-4">
        {/* Show selected teeth as badges using FDI numbering */}
        <div className="mb-3">
          <div className="text-sm font-medium mb-1">Selected Teeth (FDI Numbering):</div>
          <div className="flex flex-wrap gap-1">
            {tempSelection.sort((a, b) => a - b).map((tooth) => {
              // Apply restoration type styling to tooth badges
              let badgeClass = "border-blue-200";
              if (selectedRestorationType === 'separate') {
                badgeClass = "bg-blue-50 text-blue-700 border-blue-300";
              } else if (selectedRestorationType === 'joint') {
                badgeClass = "bg-green-50 text-green-700 border-green-300";
              } else if (selectedRestorationType === 'bridge') {
                badgeClass = "bg-orange-50 text-orange-700 border-orange-300";
              }
              
              return (
                <Badge 
                  key={tooth} 
                  variant="outline" 
                  className={badgeClass}
                >
                  {tooth}
                </Badge>
              );
            })}
          </div>
          
          {/* Show restoration type indicator */}
          {selectedRestorationType && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600">Restoration Type:</span>
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${
                  selectedRestorationType === 'separate' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  selectedRestorationType === 'joint' ? 'bg-green-100 text-green-800 border-green-300' :
                  'bg-orange-100 text-orange-800 border-orange-300'
                }`}
              >
                {selectedRestorationType === 'separate' ? '🔷 Separate' :
                 selectedRestorationType === 'joint' ? '✓ Joint' :
                 '🌉 Bridge'}
              </Badge>
            </div>
          )}
        </div>

        {/* Restoration Type Selection */}
        {showRestorationType && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-center mb-3">
              <span className="text-sm font-medium">
                Selected: {tempSelection.sort((a, b) => a - b).join(', ')} - Choose restoration type:
              </span>
            </div>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => handleTypeSelect('separate')}
                className={`text-white px-6 py-2 ${getSelectedColor('separate')}`}
              >
                🔷 Separate
              </Button>
              <Button
                onClick={() => handleTypeSelect('joint')}
                className={`text-white px-6 py-2 ${getSelectedColor('joint')}`}
              >
                ✓ Joint
              </Button>
              <Button
                onClick={() => handleTypeSelect('bridge')}
                className={`text-white px-6 py-2 ${getSelectedColor('bridge')}`}
              >
                🌉 Bridge
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pontic Selection Dialog */}
      <Dialog open={showPonticDialog} onOpenChange={onPonticDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Pontic Teeth</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              For bridge restoration with teeth {bridgeTeeth.sort((a, b) => a - b).join(', ')}, 
              please select which teeth should be marked as pontics (artificial teeth):
            </p>
            <div className="flex flex-wrap gap-2">
              {bridgeTeeth.sort((a, b) => a - b).map((tooth) => (
                <Button
                  key={tooth}
                  variant={selectedPontics.includes(tooth) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePonticToggle(tooth)}
                  className={selectedPontics.includes(tooth) ? 
                    "bg-orange-600 hover:bg-orange-700" : 
                    "border-orange-300 text-orange-600 hover:bg-orange-50"
                  }
                >
                  Tooth {tooth}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Pontics are artificial teeth that replace missing natural teeth in a bridge
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePonticCancel}
            >
              Skip
            </Button>
            <Button
              onClick={handlePonticConfirm}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Confirm Pontics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ToothSelectionControls;
