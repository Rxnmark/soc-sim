import { useState, useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { 
  Server, Shield, Search, RefreshCw, AlertTriangle, 
  Activity, Database, Network, Laptop, Video, Power, ShieldAlert
} from "lucide-react";
import { Button } from "../components/ui/button";

interface Asset {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: string;
  risk_level: string;
}

export default function CyberAssetsPage() {
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
      console.error("Помилка завантаження активів:", error);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchAssets();
    // Автооновлення кожні 5 секунд (щоб бачити, як в майбутньому атаки з'являються самі)
    const interval = setInterval(() => fetchAssets(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Фільтрація по пошуку
  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.ip_address.includes(searchQuery) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Статистика
  const totalAssets = assets.length;
  const criticalAssets = assets.filter(a => a.risk_level === "Critical").length;
  const offlineAssets = assets.filter(a => a.status === "Offline").length;
  const safeAssets = assets.filter(a => a.risk_level === "Safe" && a.status === "Online").length;

  // Вибір іконки залежно від типу обладнання
  const getAssetIcon = (type: string, className: string) => {
    switch (type) {
      case "Network": return <Network className={className} />;
      case "Database": return <Database className={className} />;
      case "ICS": return <Activity className={className} />;
      case "IoT": return <Video className={className} />;
      case "Endpoint": return <Laptop className={className} />;
      default: return <Server className={className} />; // Server, Sensor etc.
    }
  };

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10">
          <div>
            <h1 className="text-card-foreground font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Asset Protection Registry
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP, name or type..."
                className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchAssets(true)} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* STATS CARDS */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Server className="w-6 h-6 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-2xl font-bold">{totalAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center"><Shield className="w-6 h-6 text-emerald-500" /></div>
                <div><p className="text-xs text-muted-foreground">Healthy & Protected</p><p className="text-2xl font-bold text-emerald-500">{safeAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-6 h-6 text-red-500" /></div>
                <div><p className="text-xs text-muted-foreground">Critical Threats</p><p className="text-2xl font-bold text-red-500">{criticalAssets}</p></div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center"><Power className="w-6 h-6 text-gray-400" /></div>
                <div><p className="text-xs text-muted-foreground">Systems Offline</p><p className="text-2xl font-bold text-gray-400">{offlineAssets}</p></div>
              </div>
            </div>

            {/* ASSETS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                <div className="col-span-full py-20 text-center text-muted-foreground">Scanning network assets...</div>
              ) : filteredAssets.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground">No assets match your search.</div>
              ) : (
                filteredAssets.map(asset => {
                  // Динамічні стилі залежно від статусу та ризику
                  const isCritical = asset.risk_level === "Critical";
                  const isOffline = asset.status === "Offline";
                  
                  let cardStyle = "bg-card border-border hover:border-primary/50";
                  let iconBg = "bg-muted";
                  let iconColor = "text-muted-foreground";

                  if (isCritical) {
                    cardStyle = "bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
                    iconBg = "bg-red-500/20";
                    iconColor = "text-red-500 animate-pulse";
                  } else if (isOffline) {
                    cardStyle = "bg-muted/30 border-dashed border-border opacity-70 grayscale";
                  } else if (asset.risk_level === "Medium") {
                    cardStyle = "bg-yellow-500/5 border-yellow-500/30";
                    iconColor = "text-yellow-500";
                  } else {
                    iconColor = "text-emerald-500";
                  }

                  return (
                    <div key={asset.id} className={`p-4 rounded-xl border transition-all duration-300 flex flex-col h-full ${cardStyle}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                          {getAssetIcon(asset.type, `w-5 h-5 ${iconColor}`)}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {/* Статус (Online/Offline) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{asset.status}</span>
                            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-gray-500' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}></div>
                          </div>
                          {/* Ризик-лейбл */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                            isCritical ? 'bg-red-500 text-white' : 
                            asset.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {asset.risk_level} RISK
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 flex-1">
                        <h3 className="font-semibold text-card-foreground line-clamp-1" title={asset.name}>{asset.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{asset.type} Endpoint</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          {asset.ip_address}
                        </code>
                        {isCritical && (
                          <button className="text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-400 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5" /> Isolate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}