import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { 
  Server, Search, Network, LayoutGrid 
} from "lucide-react";
import { Button } from "../components/ui/button";
import { NetworkTopologyMap } from "../components/network-topology-map";
import { NotificationsPopover } from "../components/notifications-popover";
import { useTranslation } from "../../context/LanguageContext";
import { classifyThreat } from "../components/expert-utils";

interface Asset {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: string;
  risk_level: string;
}

interface SecurityLog {
  _id: string;
  event_type: string;
  title: string;
  description: string;
  source_ip: string;
  target_ip?: string;
  timestamp: string;
}

function isResolvedLog(eventType: string): boolean {
  return "auto-fix applied success neutralized".split(" ").some(k => eventType.toLowerCase().includes(k));
}

export default function CyberAssetsPage() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskSummary, setRiskSummary] = useState<any>(null);
  const [allLogs, setAllLogs] = useState<SecurityLog[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<'grid' | 'hierarchical'>('hierarchical');

  const fetchAssets = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/equipment");
      const data = await res.json();
      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setAllLogs(data))
      .catch((err) => console.error("Error loading logs:", err));
  };

  const fetchRiskSummary = () => {
    fetch("http://127.0.0.1:8000/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setRiskSummary(data))
      .catch((err) => console.error("Error fetching risk summary:", err));
  };

  const fetchArchived = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/threats/archived");
      const data = await res.json();
      setArchivedThreats(new Set<string>(data.map((a: any) => String(a.source_ip))));
    } catch (err) {
      console.error("Error loading archived:", err);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchLogs();
    fetchRiskSummary();
    fetchArchived();
    const interval = setInterval(() => fetchAssets(), 5000);
    const logInterval = setInterval(fetchLogs, 5000);
    const riskInterval = setInterval(fetchRiskSummary, 5000);
    const archivedInterval = setInterval(fetchArchived, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
      clearInterval(riskInterval);
      clearInterval(archivedInterval);
    };
  }, []);

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.ip_address.includes(searchQuery) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedLogsCount = useMemo(() => {
    return allLogs.filter(log => !isResolvedLog(log.event_type) && !archivedThreats.has(log.source_ip) && classifyThreat(log.event_type) !== "warning").length;
  }, [allLogs, archivedThreats]);

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t('assets.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('assets.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('riskManagement.last_updated', 'Last updated')}: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* ТУМБЛЕР РЕЖИМУ КАРТИ */}
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('hierarchical')}
                className={`p-1.5 rounded-md transition-all ${layoutMode === 'hierarchical' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Topology View"
              >
                <Network className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('assets.search_placeholder')}
                className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
            <NotificationsPopover apiData={riskSummary} displayedLogsCount={displayedLogsCount} />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-6">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            <div className="flex-1 min-h-0">
              {/* ПЕРЕДАЄМО РЕЖИМ */}
              <NetworkTopologyMap assets={filteredAssets} layoutMode={layoutMode} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}