import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  ConnectionLineType,
  Node,
  Edge,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Server, Shield, Activity, Database, 
  Network, Laptop, Video, Power, AlertTriangle 
} from "lucide-react";

// Custom Node Component to make it look like the existing cards but for a map
const TopologyNode = ({ data }: any) => {
  const isCritical = data.risk_level === "Critical";
  const isMedium = data.risk_level === "Medium";
  const isOffline = data.status === "Offline" || data.isAffected;
  
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
    : isMedium
      ? "bg-yellow-500/20 text-yellow-500"
      : isOffline 
        ? "bg-gray-500/20 text-gray-500" 
        : "bg-emerald-500/20 text-emerald-500";

  return (
    <div className={`px-4 py-3 rounded-xl border shadow-lg bg-card min-w-[180px] transition-all ${
      isCritical ? 'border-red-500/50 shadow-red-500/10' : 
      isMedium ? 'border-yellow-500/50 shadow-yellow-500/10' :
      isOffline ? 'border-dashed border-gray-500/50 opacity-70 grayscale' : 
      'border-border'
    }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
      
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBgClass}`}>
          {getIcon(data.type)}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold text-foreground truncate">{data.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.status}</span>
        </div>
      </div>

      {isCritical && (
        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-lg">
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}

      {isMedium && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg">
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
    </div>
  );
};

const nodeTypes = {
  topologyNode: TopologyNode,
};

interface NetworkTopologyMapProps {
  assets: any[];
}

export const NetworkTopologyMap = ({ assets }: NetworkTopologyMapProps) => {
  const { nodes, edges } = useMemo(() => {
    // 1. Build adjacency list and identify parents/children for propagation
    const adj = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    assets.forEach((asset) => {
      const name = asset.name.toLowerCase();
      const isCoreDevice = /router|switch|gateway|server|control unit|controller|hub|modem|scada/.test(name);
      
      if (!isCoreDevice) {
        const parent = assets.find(p => 
          /router|switch|gateway|server|control unit|controller|hub|modem|scada/.test(p.name.toLowerCase()) &&
          p.id !== asset.id
        );

        if (parent) {
          const parentId = parent.id.toString();
          const childId = asset.id.toString();
          if (!adj.has(parentId)) adj.set(parentId, []);
          adj.get(parentId)!.push(childId);
          parentMap.set(childId, parentId);
        }
      }
    });

    // 2. Calculate cascading offline status
    const affectedStatus = new Map<string, boolean>();
    
    // Helper to propagate offline status down the tree
    const propagateOffline = (nodeId: string, isParentOffline: boolean) => {
      const asset = assets.find(a => a.id.toString() === nodeId);
      if (!asset) return;

      const currentlyOffline = asset.status === "Offline" || isParentOffline;
      affectedStatus.set(nodeId, currentlyOffline);

      const children = adj.get(nodeId) || [];
      children.forEach(childId => propagateOffline(childId, currentlyOffline));
    };

    // Start propagation from all potential root nodes (nodes without parents)
    const allIds = assets.map(a => a.id.toString());
    const roots = allIds.filter(id => !parentMap.has(id));
    roots.forEach(rootId => propagateOffline(rootId, false));

    // 3. Create Nodes with stable ID-based positioning
    // Pre-define fixed positions for known equipment to ensure layout stability
    const fixedPositions: Record<number, { x: number; y: number }> = {};
    const sortedAssets = [...assets].sort((a, b) => a.id - b.id);
    sortedAssets.forEach((asset, index) => {
      fixedPositions[asset.id] = {
        x: (index % 4) * 300 + 50,
        y: Math.floor(index / 4) * 250 + 50
      };
    });

    const mappedNodes: Node[] = assets.map((asset) => ({
      id: asset.id.toString(),
      type: 'topologyNode',
      data: { 
        ...asset, 
        isAffected: affectedStatus.get(asset.id.toString()) && asset.status !== "Offline" 
      },
      position: fixedPositions[asset.id] || { x: 50, y: 50 },
    }));

    // 4. Create Edges
    const mappedEdges: Edge[] = [];
    assets.forEach((asset) => {
      const name = asset.name.toLowerCase();
      const isCoreDevice = /router|switch|gateway|server|control unit|controller|hub|modem|scada/.test(name);

      if (!isCoreDevice) {
        const parent = assets.find(p => 
          /router|switch|gateway|server|control unit|controller|hub|modem|scada/.test(p.name.toLowerCase()) &&
          p.id !== asset.id
        );

        if (parent) {
          const isParentOffline = parent.status === "Offline";
          mappedEdges.push({
            id: `e${parent.id}-${asset.id}`,
            source: parent.id.toString(),
            target: asset.id.toString(),
            type: 'smoothstep' as any,
            animated: isParentOffline,
            style: { 
              stroke: isParentOffline ? '#ef4444' : 
                (asset.risk_level === 'Critical' ? '#ef4444' : 
                  (asset.risk_level === 'Medium' ? '#eab308' : '#64748b')),
              strokeWidth: isParentOffline ? 3 : 1
            },
          });
        }
      }
    });

    return { nodes: mappedNodes, edges: mappedEdges };
  }, [assets]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-xl border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#333" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};