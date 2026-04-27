import { Node, Edge } from 'reactflow';

export function buildTopologyData(assets: any[], mode: 'grid' | 'hierarchical' = 'hierarchical') {
  // Явні зв'язки мережевої топології
  const explicitConnections: [number, number][] = [
    [2, 1],   // Core Switch Alpha → Main Gateway Router
    [3, 2],   // Auth Server → Core Switch
    [6, 2],   // Web Server Prod-1 → Core Switch
    [7, 2],   // Web Server Prod-2 → Core Switch
    [18, 2],  // Backup NAS Server → Core Switch
    [19, 2],  // Email Exchange Server → Core Switch
    [4, 6],   // Database Cluster Node 1 → Web Server Prod-1
    [5, 7],   // Database Cluster Node 2 → Web Server Prod-2
    [16, 2],  // CEO Workstation → Core Switch
    [17, 2],  // DevSecOps Terminal → Core Switch
    [13, 20], // Perimeter Camera 01 → Guest WiFi Gateway
    [14, 20], // Perimeter Camera 02 → Guest WiFi Gateway
    [15, 20], // Smart HVAC Controller → Guest WiFi Gateway
    [8, 1],   // SCADA Control Unit A → Main Gateway Router
    [9, 8],   // Cooling System PLC → SCADA Control Unit
    [10, 8],  // Wind Turbine 1 Telemetry → SCADA Control Unit
    [11, 8],  // Wind Turbine 2 Telemetry → SCADA Control Unit
    [12, 8],  // Solar Array B Inverter → SCADA Control Unit
  ];

  const adj = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  explicitConnections.forEach(([childId, parentId]) => {
    if (!adj.has(parentId.toString())) adj.set(parentId.toString(), []);
    adj.get(parentId.toString())!.push(childId.toString());
    parentMap.set(childId.toString(), parentId.toString());
  });

  // Каскадне відключення
  const affectedStatus = new Map<string, boolean>();
  
  const propagateOffline = (nodeId: string, isParentOffline: boolean) => {
    const asset = assets.find(a => a.id.toString() === nodeId);
    if (!asset) return;
    const currentlyOffline = asset.status === "Offline" || isParentOffline;
    affectedStatus.set(nodeId, currentlyOffline);
    const children = adj.get(nodeId) || [];
    children.forEach(childId => propagateOffline(childId, currentlyOffline));
  };

  const allIds = assets.map(a => a.id.toString());
  const roots = allIds.filter(id => !parentMap.has(id));
  roots.forEach(rootId => propagateOffline(rootId, false));

  // РОЗРАХУНОК ПОЗИЦІЙ ЗЛЕЖНО ВІД РЕЖИМУ
  const positions: Record<number, { x: number; y: number }> = {};

  if (mode === 'grid') {
    // Режим сітки
    const sortedAssets = [...assets].sort((a, b) => a.id - b.id);
    sortedAssets.forEach((asset, index) => {
      positions[asset.id] = {
        x: (index % 4) * 400 + 50,
        y: Math.floor(index / 4) * 200 + 50
      };
    });
  } else {
    // Топологічний режим (Дерево зліва направо)
    const depths = new Map<string, number>();
    
    // Рекурсивно знаходимо глибину (рівень) кожного вузла
    const getDepth = (id: string): number => {
      if (depths.has(id)) return depths.get(id)!;
      const parentId = parentMap.get(id);
      if (!parentId) {
        depths.set(id, 0);
        return 0;
      }
      const d = getDepth(parentId) + 1;
      depths.set(id, d);
      return d;
    };

    // Рахуємо кількість вузлів на кожному рівні, щоб розмістити їх по вертикалі
    const levelCounts = new Map<number, number>();
    const nodeLevels = new Map<string, { level: number; index: number }>();

    // 🛑 ФІКС: Жорстко сортуємо масив за ID, щоб позиції ніколи не стрибали
    const consistentAssets = [...assets].sort((a, b) => a.id - b.id);

    consistentAssets.forEach(asset => {
      const id = asset.id.toString();
      const level = getDepth(id);
      const index = levelCounts.get(level) || 0;
      levelCounts.set(level, index + 1);
      nodeLevels.set(id, { level, index });
    });

    consistentAssets.forEach(asset => {
      const { level, index } = nodeLevels.get(asset.id.toString())!;
      positions[asset.id] = {
        x: level * 450 + 50, // Горизонтальний потік (зліва направо)
        y: index * 130 + 50  // Вертикальний відступ між сусідами
      };
    });
  }

  // Створення вузлів (Nodes)
  const nodes: Node[] = assets.map((asset) => ({
    id: asset.id.toString(),
    type: 'topologyNode',
    data: { 
      ...asset, 
      isAffected: affectedStatus.get(asset.id.toString()) && asset.status !== "Offline",
      layoutMode: mode // Передаємо режим у компонент вузла
    },
    position: positions[asset.id] || { x: 50, y: 50 },
  }));

  // Створення зв'язків (Edges)
  const edges: Edge[] = [];
  explicitConnections.forEach(([childId, parentId]) => {
    const child = assets.find(a => a.id === childId);
    const parent = assets.find(a => a.id === parentId);
    if (!child || !parent) return;

    const isParentOffline = parent.status === "Offline" || 
      parent.status === "Encrypted" || 
      parent.status === "Unreachable" ||
      affectedStatus.get(parentId.toString());

    edges.push({
      id: `e${parentId}-${childId}`,
      source: parentId.toString(),
      target: childId.toString(),
      type: mode === 'hierarchical' ? 'default' : 'smoothstep', // Плавні криві для дерева
      animated: isParentOffline,
      style: { 
        stroke: isParentOffline ? '#ef4444' : 
          (child.risk_level === 'Critical' ? '#ef4444' : 
            (child.risk_level === 'Medium' ? '#eab308' : '#64748b')),
        strokeWidth: isParentOffline ? 3 : 1
      },
    });
  });

  return { nodes, edges };
}