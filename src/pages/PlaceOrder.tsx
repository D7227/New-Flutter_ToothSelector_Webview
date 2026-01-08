import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Order } from "../components/order-wizard/Order";

const PlaceOrder = () => {
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [prescriptionType, setPrescriptionType] = useState("");
  const [subPrescriptionTypes, setSubPrescriptionTypes] =
    useState("full-dentures");

    console.log('selectedTeeth', selectedTeeth)
    console.log('selectedGroups', selectedGroups)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Order
          prescriptionType={prescriptionType}
          subPrescriptionTypes={subPrescriptionTypes}
          selectedGroups={selectedGroups}
          selectedTeeth={selectedTeeth}
          onSelectionChange={(groups, teeth) => {
            console.log("🦷 [DEBUG] onSelectionChange", groups);
            console.log("teeth", teeth);
            setSelectedGroups(groups);
            setSelectedTeeth(teeth);
          }}
        />
      </div>
    </div>
  );
};

export default PlaceOrder;
