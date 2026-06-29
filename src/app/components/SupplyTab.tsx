import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react';

interface PrefabItem {
  id: string;
  name: string;
  status: 'ready' | 'curing' | 'delayed' | 'pending';
  curingEndTime?: number;
  eta?: string;
  quantity: number;
  location: string;
}

export function SupplyTab() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [items] = useState<PrefabItem[]>([
    {
      id: '1',
      name: 'Spar Boom Assembly M1',
      status: 'ready',
      quantity: 3,
      location: 'Bay A-12',
    },
    {
      id: '2',
      name: 'Spar Boom Assembly M2',
      status: 'curing',
      curingEndTime: Date.now() + 3600000, // 1 hour from now
      quantity: 3,
      location: 'Curing Chamber 2',
    },
    {
      id: '3',
      name: 'Spar Boom Assembly M3',
      status: 'curing',
      curingEndTime: Date.now() + 7200000, // 2 hours from now
      quantity: 3,
      location: 'Curing Chamber 1',
    },
    {
      id: '4',
      name: 'Shell Glazing Material',
      status: 'ready',
      quantity: 150,
      location: 'Material Store A',
    },
    {
      id: '5',
      name: 'Vacuum Bag Kit',
      status: 'ready',
      quantity: 12,
      location: 'Tool Crib',
    },
    {
      id: '6',
      name: 'Resin Batch #2447',
      status: 'delayed',
      eta: 'Tomorrow 08:00',
      quantity: 50,
      location: 'On Order',
    },
    {
      id: '7',
      name: 'Fiber Reinforcement',
      status: 'ready',
      quantity: 200,
      location: 'Material Store B',
    },
    {
      id: '8',
      name: 'Core Material Sheets',
      status: 'curing',
      curingEndTime: Date.now() + 1800000, // 30 minutes from now
      quantity: 24,
      location: 'Prep Area',
    },
    {
      id: '9',
      name: 'Release Agent',
      status: 'ready',
      quantity: 8,
      location: 'Chemical Store',
    },
    {
      id: '10',
      name: 'Adhesive Mix',
      status: 'pending',
      eta: 'Today 16:00',
      quantity: 30,
      location: 'Mixing Room',
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (endTime: number) => {
    const remaining = Math.max(0, endTime - currentTime);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const statusConfig = {
    ready: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/50',
      borderColor: 'border-emerald-800',
      label: 'Ready',
    },
    curing: {
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/50',
      borderColor: 'border-blue-800',
      label: 'Curing',
    },
    delayed: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-950/50',
      borderColor: 'border-red-800',
      label: 'Delayed',
    },
    pending: {
      icon: Package,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/50',
      borderColor: 'border-amber-800',
      label: 'Pending',
    },
  };

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const curingCount = items.filter((i) => i.status === 'curing').length;
  const delayedCount = items.filter((i) => i.status === 'delayed').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-4">
          <div className="text-slate-400 mb-1">Total Items</div>
          <div className="text-slate-100">{items.length}</div>
        </div>
        <div className="bg-emerald-950/50 rounded-xl border-2 border-emerald-800 p-4">
          <div className="text-emerald-400 mb-1">Ready</div>
          <div className="text-emerald-400">{readyCount}</div>
        </div>
        <div className="bg-blue-950/50 rounded-xl border-2 border-blue-800 p-4">
          <div className="text-blue-400 mb-1">Curing</div>
          <div className="text-blue-400">{curingCount}</div>
        </div>
        <div className="bg-red-950/50 rounded-xl border-2 border-red-800 p-4">
          <div className="text-red-400 mb-1">Delayed</div>
          <div className="text-red-400">{delayedCount}</div>
        </div>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={item.id}
              className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-6 backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    <h3 className="text-slate-100">{item.name}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-slate-400 mb-1">Status</div>
                      <div className={config.color}>{config.label}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Quantity</div>
                      <div className="text-slate-100">{item.quantity}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Location</div>
                      <div className="text-slate-100">{item.location}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {item.status === 'curing' && item.curingEndTime && (
                    <div>
                      <div className="text-slate-400 mb-1">Time Remaining</div>
                      <div className="text-blue-400 font-mono text-xl">
                        {formatCountdown(item.curingEndTime)}
                      </div>
                    </div>
                  )}
                  {(item.status === 'delayed' || item.status === 'pending') && item.eta && (
                    <div>
                      <div className="text-slate-400 mb-1">ETA</div>
                      <div className={config.color}>{item.eta}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
