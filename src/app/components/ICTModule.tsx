import * as Icons from '@/shared/ui/icons';

const metrics = [
  { label: 'Line Connectivity', value: '96.8%', helper: '37 of 39 production endpoints online', tone: 'emerald', icon: Icons.Wifi },
  { label: 'Open ICT Tickets', value: '12', helper: '3 affect active production areas', tone: 'amber', icon: Icons.Ticket },
  { label: 'Backup Compliance', value: '99.1%', helper: 'MES and historian backups verified', tone: 'emerald', icon: Icons.Database },
  { label: 'Security Exceptions', value: '2', helper: 'USB policy review pending', tone: 'red', icon: Icons.ShieldAlert },
];

const tickets = [
  { id: 'ICT-1048', line: 'Moulding Bay 2', issue: 'Operator HMI intermittent disconnect', owner: 'Ravi K.', priority: 'critical', eta: '22 min' },
  { id: 'ICT-1042', line: 'Curing Chamber 1', issue: 'PLC historian tag drift', owner: 'Neha S.', priority: 'high', eta: 'Today 16:30' },
  { id: 'ICT-1037', line: 'Quality Lab', issue: 'Gauge station calibration export failed', owner: 'Anil P.', priority: 'medium', eta: 'Tomorrow 10:00' },
  { id: 'ICT-1029', line: 'Material Store A', issue: 'Barcode scanner battery replacement', owner: 'Priya M.', priority: 'low', eta: 'Planned' },
];

const lineSystems = [
  { id: 'LINE-MB1', name: 'Moulding Bay 1', area: 'Production', uptime: 99.4, signal: 'online', devices: 14, heartbeat: '48 sec ago' },
  { id: 'LINE-MB2', name: 'Moulding Bay 2', area: 'Production', uptime: 91.2, signal: 'degraded', devices: 11, heartbeat: '4 min ago' },
  { id: 'LINE-CC1', name: 'Curing Chamber 1', area: 'Thermal', uptime: 97.8, signal: 'online', devices: 8, heartbeat: '1 min ago' },
  { id: 'LINE-QA', name: 'Quality Lab', area: 'Inspection', uptime: 94.6, signal: 'degraded', devices: 9, heartbeat: '6 min ago' },
];

const assets = [
  { name: 'MES App Server', type: 'Application', location: 'Server Room', health: 98, action: 'Patch window Sunday 02:00' },
  { name: 'Historian DB', type: 'Database', location: 'Server Room', health: 96, action: 'Storage review in 3 days' },
  { name: 'Bay 2 Edge Gateway', type: 'Gateway', location: 'Moulding Bay 2', health: 73, action: 'Replace network cable' },
  { name: 'QA Workstation 04', type: 'Workstation', location: 'Quality Lab', health: 82, action: 'Driver update queued' },
];

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-700 bg-emerald-950/35 text-emerald-300',
  amber: 'border-amber-700 bg-amber-950/35 text-amber-300',
  red: 'border-red-700 bg-red-950/35 text-red-300',
  blue: 'border-blue-700 bg-blue-950/35 text-blue-300',
};

const priorityClasses: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-amber-500 text-slate-950',
  medium: 'bg-blue-500 text-white',
  low: 'bg-slate-600 text-slate-100',
};

function HealthBar({ value }: { value: number }) {
  const color = value >= 95 ? 'bg-emerald-500' : value >= 80 ? 'bg-amber-500' : 'bg-red-500';
  return <div className="h-2 rounded-full bg-slate-700 overflow-hidden"><div className={'h-full ' + color} style={{ width: value + '%' }} /></div>;
}

export default function ICTModule() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ICT Command Center</h1>
          <p className="text-sm text-slate-400">Production systems, shop-floor connectivity, support tickets, and compliance readiness.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"><Icons.Clock className="h-4 w-4 text-emerald-400" />Live status refreshed 2 min ago</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return <div key={metric.label} className={'rounded-lg border p-4 ' + toneClasses[metric.tone]}>
            <div className="flex items-start justify-between gap-3"><div><div className="text-sm text-slate-300">{metric.label}</div><div className="mt-2 text-2xl font-semibold text-white">{metric.value}</div></div><MetricIcon className="h-5 w-5" /></div>
            <div className="mt-3 text-xs text-slate-400">{metric.helper}</div>
          </div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><div><h2 className="font-semibold text-white">Production Network</h2><p className="text-xs text-slate-400">Line devices, gateways, and heartbeat health.</p></div><Icons.RadioTower className="h-5 w-5 text-emerald-400" /></div>
          <div className="divide-y divide-slate-700">{lineSystems.map((line) => <div key={line.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_110px_120px] md:items-center"><div><div className="flex items-center gap-2"><span className={(line.signal === 'online' ? 'bg-emerald-500' : 'bg-amber-500') + ' h-2.5 w-2.5 rounded-full'} /><span className="font-medium text-slate-100">{line.name}</span></div><div className="mt-1 text-xs text-slate-400">{line.id} / {line.area}</div></div><div><div className="text-xs text-slate-400">Uptime</div><div className="text-sm text-white">{line.uptime}%</div></div><div><div className="text-xs text-slate-400">Devices</div><div className="text-sm text-white">{line.devices}</div></div><div><div className="text-xs text-slate-400">Heartbeat</div><div className="text-sm text-white">{line.heartbeat}</div></div></div>)}</div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-800/70">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><div><h2 className="font-semibold text-white">ICT Service Queue</h2><p className="text-xs text-slate-400">Incidents that may affect manufacturing flow.</p></div><Icons.Ticket className="h-5 w-5 text-blue-400" /></div>
          <div className="space-y-3 p-4">{tickets.map((ticket) => <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-mono text-sm text-slate-200">{ticket.id}</span><span className={'rounded px-2 py-0.5 text-xs font-semibold ' + priorityClasses[ticket.priority]}>{ticket.priority}</span></div><div className="mt-2 text-sm font-medium text-white">{ticket.issue}</div><div className="mt-1 text-xs text-slate-400">{ticket.line} / {ticket.owner}</div></div><div className="text-right text-xs"><div className="text-slate-400">ETA</div><div className="mt-1 text-slate-100">{ticket.eta}</div></div></div></div>)}</div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-700 bg-slate-800/70"><div className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><div><h2 className="font-semibold text-white">Critical ICT Assets</h2><p className="text-xs text-slate-400">Infrastructure health tied to MES availability.</p></div><Icons.Server className="h-5 w-5 text-slate-300" /></div><div className="space-y-4 p-4">{assets.map((asset) => <div key={asset.name} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-medium text-slate-100">{asset.name}</div><div className="text-xs text-slate-400">{asset.type} / {asset.location}</div></div><div className="text-sm font-semibold text-white">{asset.health}%</div></div><div className="mt-3"><HealthBar value={asset.health} /></div><div className="mt-2 text-xs text-slate-400">{asset.action}</div></div>)}</div></section>
        <section className="rounded-lg border border-slate-700 bg-slate-800/70"><div className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><div><h2 className="font-semibold text-white">Change And Compliance</h2><p className="text-xs text-slate-400">Planned windows, controls, and backup checks.</p></div><Icons.Settings className="h-5 w-5 text-slate-300" /></div><div className="grid gap-3 p-4 sm:grid-cols-2"><div className="rounded-lg border border-blue-800 bg-blue-950/30 p-4"><Icons.Wrench className="mb-3 h-5 w-5 text-blue-300" /><div className="font-medium text-white">Patch Window</div><div className="mt-1 text-sm text-slate-300">MES app and gateway firmware</div><div className="mt-3 text-xs text-blue-200">Sunday 02:00 - 03:30</div></div><div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4"><Icons.HardDrive className="mb-3 h-5 w-5 text-emerald-300" /><div className="font-medium text-white">Backup Drill</div><div className="mt-1 text-sm text-slate-300">Historian restore verified</div><div className="mt-3 text-xs text-emerald-200">Last pass: Today 05:10</div></div><div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4"><Icons.Cable className="mb-3 h-5 w-5 text-amber-300" /><div className="font-medium text-white">Network Action</div><div className="mt-1 text-sm text-slate-300">Bay 2 cable replacement</div><div className="mt-3 text-xs text-amber-200">Requires 10 min downtime</div></div><div className="rounded-lg border border-red-800 bg-red-950/30 p-4"><Icons.ShieldAlert className="mb-3 h-5 w-5 text-red-300" /><div className="font-medium text-white">Policy Review</div><div className="mt-1 text-sm text-slate-300">Two USB exceptions open</div><div className="mt-3 text-xs text-red-200">Due before shift handover</div></div></div></section>
      </div>
    </div>
  );
}
