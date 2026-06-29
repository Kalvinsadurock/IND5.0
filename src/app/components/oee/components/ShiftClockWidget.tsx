import { useState, useEffect } from 'react'
import { Clock, UserPlus, Play, Square, ClipboardList, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { useAuth } from '@/lib/AuthContext'

interface ActiveShiftLog {
  id: number;
  shiftCode: string;
  shiftDate: string;
  startTime: string;
  crewMembers: string[];
}

export function ShiftClockWidget() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<ActiveShiftLog | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Clock-in form states
  const [shiftCode, setShiftCode] = useState<'A' | 'B' | 'C'>('A');
  const [newCrewMember, setNewCrewMember] = useState('');
  const [crewMembers, setCrewMembers] = useState<string[]>([]);
  
  const [handoverNotes, setHandoverNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // Recent logs for handover alerts
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [showHandoverAlert, setShowHandoverAlert] = useState(false);

  // Fetch active shift log on mount
  const fetchActiveShift = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/shifts/active/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data);
      }
      
      // Fetch recent logs to show handover alert
      const logsRes = await fetch('/api/shifts/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setRecentLogs(logsData);
        // Find last completed shift with notes
        const lastCompleted = logsData.find((l: any) => l.endTime && l.handoverNotes);
        if (lastCompleted) {
          setShowHandoverAlert(true);
        }
      }
    } catch (err) {
      console.error('Failed to load active shift log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveShift();
  }, [user?.id]);

  // Elapsed time timer
  useEffect(() => {
    if (!activeShift) return;
    
    const interval = setInterval(() => {
      const start = new Date(activeShift.startTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      
      setElapsedTime(`${hrs}:${mins}:${secs}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleAddCrew = () => {
    if (newCrewMember.trim()) {
      setCrewMembers([...crewMembers, newCrewMember.trim()]);
      setNewCrewMember('');
    }
  };

  const handleRemoveCrew = (idx: number) => {
    setCrewMembers(crewMembers.filter((_, i) => i !== idx));
  };

  const handleClockIn = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/shifts/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftCode,
          crewMembers,
          recordedById: user.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveShift(data);
        
        // Push OEE shift sync if linked in background
        const oeeUser = user?.auth_user_id;
        if (oeeUser) {
          // Find first active machine or default OEE setup
          const { supabase } = await import('@/shared/api/supabase');
          const { data: machines } = await supabase
            .from('machines')
            .select('*')
            .eq('is_active', true)
            .limit(1);
          
          if (machines && machines.length > 0) {
            // Automatically insert an active OEE shift log in background
            await supabase.from('shifts').insert({
              machine_id: machines[0].id,
              shift_type: shiftCode,
              operator_id: oeeUser,
              planned_duration_min: 480,
            });
          }
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to clock in');
      }
    } catch (err) {
      console.error('Clock-in error:', err);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    try {
      const res = await fetch('/api/shifts/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          handoverNotes
        })
      });

      if (res.ok) {
        setActiveShift(null);
        setHandoverNotes('');
        setCrewMembers([]);
        
        // Push OEE clock-out sync in background if OEE is active
        const oeeUser = user?.auth_user_id;
        if (oeeUser) {
          const { supabase } = await import('@/shared/api/supabase');
          // Find operator's active shift
          const { data: activeShifts } = await supabase
            .from('shifts')
            .select('*')
            .eq('operator_id', oeeUser)
            .eq('status', 'active')
            .limit(1);
          
          if (activeShifts && activeShifts.length > 0) {
            await supabase
              .from('shifts')
              .update({
                status: 'completed',
                end_time: new Date().toISOString()
              })
              .eq('id', activeShifts[0].id);
          }
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to clock out');
      }
    } catch (err) {
      console.error('Clock-out error:', err);
    }
  };

  if (loading) {
    return <div className="text-slate-400 py-4 text-center">Loading shift clock...</div>;
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-850 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base text-slate-105 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-450" />
          Shift Clock & Handover Notes
        </CardTitle>
        {activeShift ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
            Active: Shift {activeShift.shiftCode}
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
            Clocked Out
          </span>
        )}
      </CardHeader>
      
      <CardContent className="pt-4">
        {showHandoverAlert && recentLogs.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-4 relative">
            <div className="flex gap-2">
              <ClipboardList className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-305">Previous Crew Handover Notes</p>
                <p className="text-xs text-slate-300 mt-1 italic">
                  "{recentLogs.find((l: any) => l.endTime && l.handoverNotes)?.handoverNotes}"
                </p>
                <p className="text-[10px] text-slate-450 mt-1.5 font-medium">
                  Logged by: {recentLogs.find((l: any) => l.endTime && l.handoverNotes)?.operatorName || 'System'} | Shift {recentLogs.find((l: any) => l.endTime && l.handoverNotes)?.shiftCode}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHandoverAlert(false)}
              className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-xs font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {activeShift ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-850">
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase">Shift Elapsed Time</p>
                <p className="text-2xl font-black text-white tracking-widest mt-0.5">{elapsedTime}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-450 font-bold uppercase">Clocked In At</p>
                <p className="text-xs text-slate-300 font-semibold mt-1">
                  {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {activeShift.crewMembers && activeShift.crewMembers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-350">Active Crew Members</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeShift.crewMembers.map((member, idx) => (
                    <span key={idx} className="bg-slate-800 border border-slate-750 text-slate-205 text-[10px] px-2 py-0.5 rounded font-medium">
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="handover" className="text-slate-350 text-xs font-semibold">End-of-Shift Crew Handover Notes</Label>
              <Textarea
                id="handover"
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Log cleanups, tooling calibrations, or pending composite mold cures..."
                className="bg-slate-800 border-slate-750 min-h-[96px] text-white"
              />
            </div>

            <Button
              onClick={handleClockOut}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 rounded-xl mt-2"
            >
              <Square className="w-4 h-4 fill-white" />
              Clock Out & Pass Handover
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-350 text-xs font-semibold">Select Shift Code</Label>
                <select
                  value={shiftCode}
                  onChange={(e) => setShiftCode(e.target.value as 'A' | 'B' | 'C')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg h-11 text-white px-3 focus:outline-none"
                >
                  <option value="A">Shift A (06:00 – 14:00)</option>
                  <option value="B">Shift B (14:00 – 22:00)</option>
                  <option value="C">Shift C (22:00 – 06:00)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-350 text-xs font-semibold">Add Crew Members</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCrewMember}
                    onChange={(e) => setNewCrewMember(e.target.value)}
                    placeholder="Enter name..."
                    className="bg-slate-800 border-slate-700 h-11"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCrew())}
                  />
                  <Button onClick={handleAddCrew} className="h-11 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-205">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {crewMembers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Current Crew List</Label>
                <div className="flex flex-wrap gap-1.5">
                  {crewMembers.map((member, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRemoveCrew(idx)}
                      className="bg-slate-800 hover:bg-red-900/30 hover:border-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                    >
                      {member} &times;
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleClockIn}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl"
            >
              <Play className="w-4 h-4 fill-white" />
              Clock In Shift
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
