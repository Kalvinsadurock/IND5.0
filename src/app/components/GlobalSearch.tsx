import { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock, AlertTriangle, CheckCircle, Pause, Play, ChevronDown, ChevronUp, Package, RotateCcw } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';

interface TimelineEvent {
  event: {
    id: number;
    eventType: string;
    description: string;
    occurredAt: string;
    eventData?: any;
  };
  step?: { name: string; stepNumber: string } | null;
  employee?: { name: string } | null;
}

interface PartTimeline {
  part: any;
  process: any;
  currentStep: any;
  currentMould: any;
  blockers: any[];
  timeline: TimelineEvent[];
  reworks: any[];
}

const statusIcons: Record<string, any> = {
  in_progress: { icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  hold: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-900/30' },
  rework: { icon: RotateCcw, color: 'text-orange-400', bg: 'bg-orange-900/30' },
  completed: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-900/30' },
  planned: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-800' },
  active: { icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  paused: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-900/30' },
  waiting: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/30' },
  blocked: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/30' },
  breakdown: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-900/40' },
};

const priorityColors: Record<string, string> = {
  normal: 'text-slate-400 bg-slate-800',
  high: 'text-amber-400 bg-amber-900/40',
  critical: 'text-red-400 bg-red-900/40 animate-pulse',
};

const eventTypeIcons: Record<string, any> = {
  part_created: { icon: Package, color: 'text-emerald-400' },
  step_started: { icon: Play, color: 'text-blue-400' },
  state_change: { icon: Clock, color: 'text-amber-400' },
  shift_log: { icon: Clock, color: 'text-slate-400' },
  priority_change: { icon: AlertTriangle, color: 'text-orange-400' },
  rework_initiated: { icon: RotateCcw, color: 'text-red-400' },
  rework_completed: { icon: CheckCircle, color: 'text-green-400' },
};

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartTimeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const searchParts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/parts/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchParts(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchParts]);

  const loadTimeline = async (partId: number) => {
    setLoadingTimeline(true);
    try {
      const response = await fetch(`/api/parts/${partId}/timeline`);
      const timeline = await response.json();
      setSelectedPart(timeline);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const toggleEvent = (eventId: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-slate-900 rounded-xl border-2 border-slate-700 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-400" />
          <Input
            autoFocus
            placeholder="Search parts by number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 h-12 bg-slate-800 border-slate-600 text-slate-100 text-lg"
          />
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedPart ? (
            <div className="p-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedPart(null)}
                className="mb-4 text-slate-400 hover:text-slate-200"
              >
                ← Back to results
              </Button>

              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-mono text-emerald-400">{selectedPart.part?.partNumber}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${priorityColors[selectedPart.part?.priority || 'normal']}`}>
                      {selectedPart.part?.priority?.toUpperCase()}
                    </span>
                    {selectedPart.part?.status && (
                      <span className={`px-2 py-1 rounded text-xs ${statusIcons[selectedPart.part.status]?.bg} ${statusIcons[selectedPart.part.status]?.color}`}>
                        {selectedPart.part.status.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Process:</span>
                    <span className="text-slate-200 ml-2">{selectedPart.process?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Current Step:</span>
                    <span className="text-slate-200 ml-2">{selectedPart.currentStep?.name || 'N/A'}</span>
                  </div>
                  {selectedPart.currentMould && (
                    <div>
                      <span className="text-slate-500">Mould:</span>
                      <span className="text-slate-200 ml-2">{selectedPart.currentMould.name}</span>
                    </div>
                  )}
                  {selectedPart.part?.entryReason && selectedPart.part.entryReason !== 'normal' && (
                    <div>
                      <span className="text-slate-500">Entry Reason:</span>
                      <span className="text-amber-400 ml-2">{selectedPart.part.entryReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedPart.blockers && selectedPart.blockers.length > 0 && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                  <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Active Blockers
                  </h4>
                  {selectedPart.blockers.map((blocker) => (
                    <div key={blocker.instance.id} className="text-sm text-red-300">
                      <span className="font-mono">{blocker.step?.stepNumber}</span> - {blocker.step?.name}:
                      <span className="ml-2 text-red-400">{blocker.instance.status}</span>
                      {blocker.instance.waitingReason && <span className="ml-2">({blocker.instance.waitingReason})</span>}
                      {blocker.instance.blockedReason && <span className="ml-2">({blocker.instance.blockedReason})</span>}
                    </div>
                  ))}
                </div>
              )}

              {selectedPart.reworks && selectedPart.reworks.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4 mb-4">
                  <h4 className="text-orange-400 font-medium mb-2 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Rework History
                  </h4>
                  {selectedPart.reworks.map((rework) => (
                    <div key={rework.rework.id} className="text-sm text-orange-300 mb-2">
                      <div>From step {rework.fromStep?.stepNumber} to {rework.rework.toStepId}</div>
                      <div className="text-orange-400">{rework.rework.reason}</div>
                      <div className="text-slate-500 text-xs">{formatDate(rework.rework.initiatedAt)}</div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Timeline
              </h4>
              <div className="space-y-2">
                {selectedPart.timeline.map((item) => {
                  const eventConfig = eventTypeIcons[item.event.eventType] || { icon: Clock, color: 'text-slate-400' };
                  const EventIcon = eventConfig.icon;
                  const isExpanded = expandedEvents.has(item.event.id);

                  return (
                    <div
                      key={item.event.id}
                      className="bg-slate-800 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleEvent(item.event.id)}
                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-700/50"
                      >
                        <EventIcon className={`w-4 h-4 ${eventConfig.color}`} />
                        <div className="flex-1">
                          <div className="text-slate-200 text-sm">{item.event.description}</div>
                          <div className="text-slate-500 text-xs">
                            {formatDate(item.event.occurredAt)}
                            {item.step && <span className="ml-2">@ {item.step.stepNumber}</span>}
                            {item.employee && <span className="ml-2">by {item.employee.name}</span>}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      {isExpanded && item.event.eventData && (
                        <div className="px-3 pb-3 text-xs">
                          <pre className="bg-slate-900 rounded p-2 text-slate-400 overflow-x-auto">
                            {JSON.stringify(item.event.eventData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                {selectedPart.timeline.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No timeline events recorded</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Searching...</div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((result) => {
                    const status = statusIcons[result.part?.status] || statusIcons.in_progress;
                    const StatusIcon = status.icon;

                    return (
                      <button
                        key={result.part.id}
                        onClick={() => loadTimeline(result.part.id)}
                        className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <StatusIcon className={`w-5 h-5 ${status.color}`} />
                          <div className="text-left">
                            <div className="text-emerald-400 font-mono">{result.part.partNumber}</div>
                            <div className="text-slate-400 text-sm">{result.process?.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${priorityColors[result.part.priority || 'normal']}`}>
                            {result.part.priority?.toUpperCase()}
                          </span>
                          {result.currentStep && (
                            <span className="text-slate-500 text-sm">@ {result.currentStep.name}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="text-center py-8 text-slate-500">No parts found matching "{query}"</div>
              ) : (
                <div className="text-center py-8 text-slate-500">Enter a part number to search</div>
              )}
            </div>
          )}

          {loadingTimeline && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
              <div className="text-slate-400">Loading timeline...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
