import { ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';

interface Alert {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
}

export function SafetyAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      message: 'Temperature threshold exceeded in Mould 2 - Monitor closely',
      severity: 'warning',
    },
  ]);

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center gap-4 px-6 py-4 rounded-lg border-2 ${
            alert.severity === 'critical'
              ? 'bg-red-950/50 border-red-600 text-red-100'
              : 'bg-amber-950/50 border-amber-600 text-amber-100'
          }`}
        >
          <ShieldAlert className="w-6 h-6 flex-shrink-0" />
          <p className="flex-1">{alert.message}</p>
          <Button
            onClick={() => dismissAlert(alert.id)}
            variant="ghost"
            size="sm"
            className="text-current hover:bg-white/10 h-10 w-10 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
