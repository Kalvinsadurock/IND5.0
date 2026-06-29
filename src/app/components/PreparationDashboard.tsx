// src/app/components/PreparationDashboard.tsx (Updated)
import { useState } from 'react';
import { Camera, PlusCircle, Package, Scissors, Droplets } from 'lucide-react';
import { supabase } from '@/shared/api/supabase';
import { Button } from '@/shared/ui/button';

export function PreparationDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Registration Buttons for the three preparation processes
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Preparation Registry</h1>
          <p className="text-slate-400 text-sm">Register new kits, glass kits, and resin batches</p>
        </div>
        <div className="flex gap-3">
          {/* Button for Process 10 (Incoming) */}
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Package className="mr-2 h-4 w-4" /> Add Material Kit
          </Button>
          
          {/* Button for Process 20 (Glass Cutting) */}
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Scissors className="mr-2 h-4 w-4" /> Add Glass Kit
          </Button>
          
          {/* Button for Process 30 (Degassing) */}
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Droplets className="mr-2 h-4 w-4" /> Add Resin Lot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder for real-time inventory count cards based on your data model */}
        <InventorySummaryCard title="Available Kits" count={12} />
        <InventorySummaryCard title="Glass Kits (Cut)" count={5} />
        <InventorySummaryCard title="Resin Batches" count={2} />
      </div>
      
      {/* List of registered items with photos would go here */}
    </div>
  );
}

function InventorySummaryCard({ title, count }: { title: string, count: number }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
      <div className="text-slate-400 text-sm font-medium">{title}</div>
      <div className="text-3xl font-bold text-white mt-1">{count}</div>
    </div>
  );
}
