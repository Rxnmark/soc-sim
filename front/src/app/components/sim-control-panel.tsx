import { useState, useEffect, useRef, useCallback } from "react";
import { Cpu, Play, Pause, Square, Zap, Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { Switch } from "@radix-ui/react-switch";
import { toast } from "sonner";
import { isResolvedThreat, isMinorEventType } from "./expert-utils";

const speedOptions = [
  { label: "1x", val: 1 },
  { label: "2x", val: 0.5 },
  { label: "4x", val: 0.25 },
  { label: "10x", val: 0.1 },
];

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

function speedMultiplierToHuman(multiplier: number | undefined): string {
  if (multiplier === undefined) return "1x";
  const map: Record<number, string> = { 1: "1x", 0.5: "2x", 0.25: "4x", 0.1: "10x" };
  return map[multiplier] ?? `${multiplier}x`;
}

export function SimControlPanel() {
  const [status, setStatus] = useState<{
    is_running: boolean;
    is_paused: boolean;
    speed_multiplier: number;
  }>({ is_running: false, is_paused: false, speed_multiplier: 1 });

  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [autoFixInterval, setAutoFixInterval] = useState<number>(30);
  const [activeSpeed, setActiveSpeed] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const speedRef = useRef(status.speed_multiplier);
  const autoFixRef = useRef(autoFixEnabled);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/simulation/status`);
      const data = await res.json();
      setStatus(data);
      setBackendStatus(data);
      speedRef.current = data.speed_multiplier ?? 1;
    } catch { /* ignore */ }
  }, []);

  // Periodic status refresh
  useEffect(() => {
    const id = setInterval(refresh, 3000);
    refresh();
    return () => clearInterval(id);
  }, [refresh]);

  // Real-time telemetry polling every 2 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/v1/simulation/status`);
        const data = await res.json();
        setBackendStatus(data);
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Auto-Neutralize interval with Ghost Sweeper failsafe
  useEffect(() => {
    autoFixRef.current = autoFixEnabled;
    if (!autoFixEnabled) return;

    const interval = setInterval(async () => {
      try {
        // Step 1: Check if system is completely safe
        const eqRes = await fetch(`${API}/api/v1/equipment`);
        const eqData: any[] = await eqRes.json();
        const allSafe = eqData.every((eq: any) => eq.status === "Online");

        if (allSafe) {
          // Ghost Sweeper: clear stale states
          await fetch(`${API}/api/v1/simulation/clear-ghosts`, { method: "POST" });
          toast.success("Ghost Sweeper: stale states cleared");
          refresh();
          return;
        }

        // Step 2: System not fully safe — proceed with normal auto-neutralize
        const logsRes = await fetch(`${API}/api/v1/logs`);
        const logs: any[] = await logsRes.json();
        const active = logs.find(
          (l) => !isResolvedThreat(l.event_type) && !isMinorEventType(l.event_type)
        );
        if (active) {
          await fetch(`${API}/api/v1/threats/archive-and-reboot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_ip: active.source_ip,
              target_equipment_id: active.target_equipment_id,
            }),
          });
          toast.success("Auto-Neutralize: Threat eliminated");
          refresh();
        }
      } catch { /* ignore */ }
    }, autoFixInterval * 1000);

    return () => clearInterval(interval);
  }, [autoFixEnabled, refresh, autoFixInterval]);

  const start = async () => {
    await fetch(`${API}/api/v1/simulation/start`, { method: "POST" });
    refresh();
  };
  const stop = async () => {
    await fetch(`${API}/api/v1/simulation/stop`, { method: "POST" });
    refresh();
  };
  const pause = async () => {
    await fetch(`${API}/api/v1/simulation/pause`, { method: "POST" });
    refresh();
  };
  const resume = async () => {
    await fetch(`${API}/api/v1/simulation/resume`, { method: "POST" });
    refresh();
  };
  const setSpeed = async (val: number) => {
    setActiveSpeed(val);
    await fetch(`${API}/api/v1/simulation/speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed_multiplier: val }),
    });
    speedRef.current = val;
    refresh();
  };
  const simulateThreat = async () => {
    await fetch(`${API}/api/v1/threats/simulate`, { method: "POST" });
    refresh();
  };
  const resetDb = async () => {
    await fetch(`${API}/api/v1/reset`, { method: "POST" });
    refresh();
  };

  const displayState = status.is_running
    ? status.is_paused
      ? "Paused"
      : "Running"
    : "Stopped";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-lg bg-card text-card-foreground text-sm font-medium border border-border hover:bg-muted/80 transition-all shadow-lg backdrop-blur-sm">
          <Cpu className="w-4 h-4" />
          SIM CONTROL
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-80 p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xl">
        {/* Status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Status</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              displayState === "Running"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                : displayState === "Paused"
                ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {displayState}
          </span>
        </div>

        {/* Telemetry Dashboard */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground block">Backend Speed</span>
            <span className="text-xs font-mono text-card-foreground">
              {speedMultiplierToHuman(backendStatus?.speed_multiplier)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground block">Auto-Fix Speed</span>
            <span className="text-xs font-mono text-card-foreground">{autoFixInterval}s</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground block">Active Attacks</span>
            <span className="text-xs font-mono text-card-foreground">{backendStatus?.active_attacks_count ?? 0}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex gap-2 mb-3">
          <button onClick={start} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 transition">
            <Play className="w-3 h-3" /> Start
          </button>
          {status.is_running && !status.is_paused && (
            <button onClick={pause} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/40 transition">
              <Pause className="w-3 h-3" /> Pause
            </button>
          )}
          {status.is_paused && (
            <button onClick={resume} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 transition">
              <Play className="w-3 h-3" /> Resume
            </button>
          )}
          {status.is_running && (
            <button onClick={stop} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition">
              <Square className="w-3 h-3" /> Stop
            </button>
          )}
        </div>

        {/* Speed */}
        <div className="mb-3">
          <span className="text-xs text-muted-foreground block mb-1">Speed</span>
          <div className="flex gap-1">
            {speedOptions.map((option) => (
              <button
                key={option.val}
                onClick={() => setSpeed(option.val)}
                className={`flex-1 py-1 rounded text-xs font-mono transition ${
                  activeSpeed === option.val
                    ? "bg-primary text-primary-foreground border border-primary"
                    : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-3">
          <button onClick={simulateThreat} className="flex-1 py-1.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/40 transition flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" /> New Threat
          </button>
          <button onClick={resetDb} className="flex-1 py-1.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition">
            DB Reset
          </button>
        </div>

        {/* Auto-Neutralize */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Auto-Neutralize AI</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={autoFixInterval}
              onChange={(e) => setAutoFixInterval(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm bg-muted border border-border rounded text-card-foreground"
              min={1}
            />
            <Switch
              checked={autoFixEnabled}
              onCheckedChange={setAutoFixEnabled}
              className="data-[state=checked]:bg-primary w-9 h-5 rounded-full bg-muted border border-border transition"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}