import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Camera, X } from "lucide-react";

interface ImplantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  onSave: (details: ImplantDetails) => void;
}

interface ImplantDetails {
  companyName: string;
  systemName: string;
  remarks: string;
  photo?: File;
}

const ImplantDetailsModal = ({
  isOpen,
  onClose,
  toothNumber,
  onSave,
}: ImplantDetailsModalProps) => {
  const [formData, setFormData] = useState<ImplantDetails>({
    companyName: "",
    systemName: "",
    remarks: "",
    photo: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  const companies = [
    { id: "1", name: "Straumann" },
    { id: "2", name: "Nobel Biocare" },
    { id: "3", name: "Zimmer Biomet" },
    { id: "4", name: "Dentsply Sirona" },
    { id: "5", name: "Osstem" },
  ];

  const implantSystems = [
    { id: "1", name: "Straumann Bone Level Implant" },
    { id: "2", name: "Nobel Active" },
    { id: "3", name: "Zimmer TSV Implant" },
    { id: "4", name: "Astra Tech Implant System EV" },
    { id: "5", name: "Osstem TS III SA" },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName) {
      newErrors.companyName = "Company name is required";
    }
    if (!formData.systemName) {
      newErrors.systemName = "System name is required";
    }
    if (!formData.remarks.trim()) {
      newErrors.remarks = "Remarks are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
      // Reset form
      setFormData({
        companyName: "",
        systemName: "",
        remarks: "",
        photo: undefined,
      });
      setPhotoPreview(null);
      setErrors({});
    }
  };

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setFormData((prev) => ({ ...prev, photo: file }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const removePhoto = () => {
    setFormData((prev) => ({ ...prev, photo: undefined }));
    setPhotoPreview(null);
  };

  const handleClose = () => {
    setFormData({
      companyName: "",
      systemName: "",
      remarks: "",
      photo: undefined,
    });
    setPhotoPreview(null);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Implant Details - Tooth {toothNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="Enter company name"
              value={formData.companyName}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }));
                if (errors.companyName) {
                  setErrors((prev) => ({ ...prev, companyName: "" }));
                }
              }}
              className={`mt-1 ${errors.companyName ? "border-red-500" : ""}`}
            />
            {errors.companyName && (
              <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="systemName">System Name *</Label>
            <Input
              id="systemName"
              placeholder="Enter implant system name"
              value={formData.systemName}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  systemName: e.target.value,
                }));
                if (errors.systemName) {
                  setErrors((prev) => ({ ...prev, systemName: "" }));
                }
              }}
              className={`mt-1 ${errors.systemName ? "border-red-500" : ""}`}
            />
            {errors.systemName && (
              <p className="text-red-500 text-sm mt-1">{errors.systemName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="remarks">Remarks *</Label>
            <Textarea
              id="remarks"
              placeholder="Type your Scan body size here"
              value={formData.remarks}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, remarks: e.target.value }));
                if (errors.remarks) {
                  setErrors((prev) => ({ ...prev, remarks: "" }));
                }
              }}
              className={`mt-1 resize-none ${
                errors.remarks ? "border-red-500" : ""
              }`}
              rows={3}
            />
            {errors.remarks && (
              <p className="text-red-500 text-sm mt-1">{errors.remarks}</p>
            )}
          </div>

          <div>
            <Label>Upload Photo</Label>
            <div
              className={`mt-1 border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex justify-center space-x-4 mb-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Drag & drop an image here, or click to select
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="photo-upload"
                    capture="environment"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Choose file
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImplantDetailsModal;
