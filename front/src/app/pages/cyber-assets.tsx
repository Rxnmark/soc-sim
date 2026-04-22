import { useState, useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { 
  Server, Shield, Search, RefreshCw, AlertTriangle, 
  Activity, Database, Network, Laptop, Video, Power, ShieldAlert
} from "lucide-react";
import { Button } from "../components/ui/button";
import { NetworkTopologyMap } from "../components/network-topology-map";
import { useTranslation } from "../../context/LanguageContext";

interface Asset {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: string;
  risk_level: string;
}

export default function CyberAssetsPage() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAssets = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/equipment");
      const data = await res.json();
      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(() => fetchAssets(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.ip_address.includes(searchQuery) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalAssets = assets.filter(a => a.risk_level === "Critical").length;
  const offlineAssets = assets.filter(a => a.status === "Offline" || a.status === "Encrypted" || a.status === "Unreachable").length;
  const safeAssets = assets.filter(a => a.risk_level === "Safe" && a.status === "Online").length;
  const requiresAttentionAssets = assets.filter(a => a.risk_level === "Medium").length;

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div>
            <h1 className="text-card-foreground font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              {t('assets.title')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
            <Button variant="outline" size="icon" onClick={() => fetchAssets(true)} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-6">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            
            {/* STATS CARDS */}
            <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center"><Shield className="w-6 h-6 text-emerald-500" /></div>
                <div><p className="text-xs text-muted-foreground">{t('assets.healthy')}</p><p className="text-2xl font-bold text-emerald-500">{safeAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center"><Power className="w-6 h-6 text-gray-400" /></div>
                <div><p className="text-xs text-muted-foreground">{t('assets.systems_offline')}</p><p className="text-2xl font-bold text-gray-400">{offlineAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-6 h-6 text-red-500" /></div>
                <div><p className="text-xs text-muted-foreground">{t('assets.critical_threats')}</p><p className="text-2xl font-bold text-red-500">{criticalAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-yellow-500" /></div>
                <div><p className="text-xs text-muted-foreground">{t('assets.requires_attention')}</p><p className="text-2xl font-bold text-yellow-500">{requiresAttentionAssets}</p></div>
              </div>
            </div>

            {/* NETWORK TOPOLOGY MAP */}
            <div className="flex-1 min-h-0">
              <NetworkTopologyMap assets={filteredAssets} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
