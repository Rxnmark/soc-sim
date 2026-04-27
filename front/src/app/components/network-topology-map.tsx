import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { Server, Activity, Database, Network, Laptop, Video, AlertTriangle } from "lucide-react";
import { buildTopologyData } from './network-topology-map-layout';

const TopologyNode = ({ data }: any) => {
  const isCritical = data.risk_level === "Critical";
  const isMedium = data.risk_level === "Medium";
  const isOffline = data.status === "Offline" || data.isAffected;
  const isHierarchical = data.layoutMode === 'hierarchical'; // Визначаємо режим
  
  const getIcon = (type: string) => {
    switch (type) {
      case "Network": return <Network className="w-5 h-5" />;
      case "Database": return <Database className="w-5 h-5" />;
      case "ICS": return <Activity className="w-5 h-5" />;
      case "IoT": return <Video className="w-5 h-5" />;
      case "Endpoint": return <Laptop className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const iconBgClass = isCritical 
    ? "bg-red-500/20 text-red-500 animate-pulse" 
    : isMedium ? "bg-yellow-500/20 text-yellow-500"
    : isOffline ? "bg-gray-500/20 text-gray-500" : "bg-emerald-500/20 text-emerald-500";

  return (
    <div className={`px-5 py-4 rounded-xl border shadow-lg bg-card min-w-[280px] max-w-[320px] transition-all ${
      isCritical ? 'border-red-500/50 shadow-red-500/10' : 
      isMedium ? 'border-yellow-500/50 shadow-yellow-500/10' :
      isOffline ? 'border-dashed border-gray-500/50 opacity-70 grayscale' : 'border-border'
    }`}>
      {/* Вхідна точка (Target) */}
      <Handle 
        type="target" 
        position={isHierarchical ? Position.Left : Position.Top} 
        className="w-3 h-3 !bg-primary" 
      />
      
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBgClass}`}>{getIcon(data.type)}</div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-base font-semibold text-foreground truncate">{data.name}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{data.status}</span>
        </div>
      </div>

      {(isCritical || isMedium) && (
        <div className={`absolute -top-2 -right-2 rounded-full p-1 shadow-lg ${isCritical ? 'bg-red-500' : 'bg-yellow-500'}`}>
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Вихідна точка (Source) */}
      <Handle 
        type="source" 
        position={isHierarchical ? Position.Right : Position.Bottom} 
        className="w-3 h-3 !bg-primary" 
      />
    </div>
  );
};

const nodeTypes = { topologyNode: TopologyNode };

interface NetworkTopologyMapProps {
  assets: any[];
  layoutMode: 'grid' | 'hierarchical'; // Приймаємо пропс
}

export const NetworkTopologyMap = ({ assets, layoutMode }: NetworkTopologyMapProps) => {
  const { nodes, edges } = useMemo(() => {
    return buildTopologyData(assets, layoutMode);
  }, [assets, layoutMode]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-xl border border-border overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#333" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};