import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  ConnectionMode,
  Handle,
  MiniMap,
} from 'react-flow-renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Bot, FileText, X, RefreshCw, Layers, ArrowRight, Play, Pause, Settings } from 'lucide-react';
import { apiService } from '@/services/api';
import { GraphNode, GraphEdge, PhaseInfo } from '@/types';
import { useWebSocket } from '@/context/WebSocketContext';
import StatusBadge from '@/components/StatusBadge';
import TaskDetailModal from '@/components/TaskDetailModal';
import RealTimeAgentOutput from '@/components/RealTimeAgentOutput';

// Custom node component for agents
const AgentNode: React.FC<{ data: any }> = ({ data }) => {
  const isExternal = data.status === 'external';
  const isHighlighted = data.isHighlighted;
  const isDimmed = data.isDimmed;

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const baseClasses = isExternal
    ? 'bg-purple-50 dark:bg-purple-950 border-purple-400 dark:border-purple-600'
    : 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600';
  const highlightClasses = isHighlighted ? 'ring-4 ring-red-400 dark:ring-red-500 ring-opacity-75 shadow-2xl scale-105' : '';
  const dimClasses = isDimmed ? 'opacity-30' : '';

  return (
    <div className={`${baseClasses} ${highlightClasses} ${dimClasses} border-2 rounded-lg p-3 min-w-[150px] shadow-md relative transition-all duration-300`}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: isExternal ? '#9333EA' : '#3B82F6', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: isExternal ? '#9333EA' : '#3B82F6', width: 10, height: 10 }}
      />
      <div className="flex items-center gap-1.5 mb-1.5">
        <Bot className={`w-4 h-4 ${isExternal ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`} />
        <span className="text-sm font-bold text-gray-900 dark:text-white">{isExternal ? 'MCP' : 'Agent'}</span>
      </div>
      <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mb-1">{data.id.substring(0, 8)}...</p>
      {data.created_at && (
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">🕐 {formatTime(data.created_at)}</p>
      )}
      {!isExternal && <StatusBadge status={data.status} size="sm" />}
    </div>
  );
};

// Custom node component for tasks
const TaskNode: React.FC<{ data: any }> = ({ data }) => {
  const isHighlighted = data.isHighlighted;
  const isDimmed = data.isDimmed;

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const phaseColors: Record<number, string> = {
    1: 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600',
    2: 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600',
    3: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-400 dark:border-yellow-600',
    4: 'bg-pink-50 dark:bg-pink-950 border-pink-400 dark:border-pink-600',
    5: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-600',
  };

  const bgClass = phaseColors[data.phase_order] || 'bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600';
  const highlightClasses = isHighlighted ? 'ring-4 ring-red-400 dark:ring-red-500 ring-opacity-75 shadow-2xl scale-105' : '';
  const dimClasses = isDimmed ? 'opacity-30' : '';

  return (
    <div className={`${bgClass} ${highlightClasses} ${dimClasses} border-2 rounded-lg p-3 min-w-[170px] max-w-[210px] shadow-md relative transition-all duration-300`}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#10B981', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#10B981', width: 10, height: 10 }}
      />
      <div className="flex items-center gap-1.5 mb-1.5">
        <FileText className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <span className="text-sm font-bold text-gray-900 dark:text-white">Task</span>
        {data.phase_name && (
          <span className="text-xs px-2 py-0.5 bg-white dark:bg-gray-900 bg-opacity-80 dark:bg-opacity-80 text-gray-800 dark:text-gray-200 rounded ml-auto font-bold border border-gray-300 dark:border-gray-600">
            P{data.phase_order}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-1 leading-snug">
        {data.description?.substring(0, 50)}...
      </p>
      {data.created_at && (
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">🕐 {formatTime(data.created_at)}</p>
      )}
      <StatusBadge status={data.status} size="sm" />
    </div>
  );
};

const nodeTypes = {
  agent: AgentNode,
  task: TaskNode,
};

// Node preview modal
const NodePreview: React.FC<{ node: any; onClose: () => void }> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              {node.type === 'agent' ? (
                <Bot className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              ) : (
                <FileText className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
              )}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {node.type === 'agent' ? 'Agent' : 'Task'} Details
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">ID</p>
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{node.data.id}</p>
            </div>

            {node.type === 'agent' ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <StatusBadge status={node.data.status} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">CLI Type</p>
                  <p className="text-base text-gray-900 dark:text-gray-100">{node.data.cli_type}</p>
                </div>
                {node.data.current_task_id && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Current Task</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {node.data.current_task_id}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">{node.data.description}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <StatusBadge status={node.data.status} />
                </div>
                {node.data.phase_name && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Phase</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      Phase {node.data.phase_order}: {node.data.phase_name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Priority</p>
                  <span
                    className={`text-sm px-3 py-1 rounded font-semibold ${
                      node.data.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : node.data.priority === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {node.data.priority}
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Layout direction type
type LayoutDirection = 'TB' | 'LR';

const Graph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [columnHeaders, setColumnHeaders] = useState<{ label: string; x: number; width: number; type: 'agents' | 'tasks' }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const { subscribe } = useWebSocket();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['graph'],
    queryFn: apiService.getGraphData,
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Create proper alternating columns
  const layoutNodes = useCallback((graphNodes: GraphNode[], graphEdges: GraphEdge[], phases: Record<string, PhaseInfo>): Node[] => {
    const nodeMap = new Map<string, Node>();

    // Add phase info to task nodes
    graphNodes.forEach(node => {
      if (node.type === 'task' && node.data.phase_id && phases[node.data.phase_id]) {
        const phase = phases[node.data.phase_id];
        node.data.phase_name = phase.name;
        node.data.phase_order = phase.order;
      }
    });

    // Sort phases and deduplicate
    const sortedPhases = Object.values(phases)
      .sort((a, b) => a.order - b.order)
      .filter((phase, index, array) =>
        index === 0 || phase.order !== array[index - 1].order
      );


    // Create alternating column structure: Agents → Tasks → Agents → Tasks
    const columns: { id: string; type: 'agents' | 'tasks'; nodes: GraphNode[]; label: string }[] = [];

    // Column 0: External agents
    columns.push({
      id: 'external_agents',
      type: 'agents',
      nodes: [],
      label: 'External Agents'
    });

    // For each phase: Tasks column, then Agents column (if not last phase)
    sortedPhases.forEach((phase, index) => {
      // Tasks column for this phase
      columns.push({
        id: `tasks_p${phase.order}`,
        type: 'tasks',
        nodes: [],
        label: `Phase ${phase.order}: ${phase.name}`
      });

      // Agents column for agents that work on NEXT phase (if there is a next phase)
      if (index < sortedPhases.length - 1) {
        const nextPhase = sortedPhases[index + 1];
        columns.push({
          id: `agents_for_p${nextPhase.order}`,
          type: 'agents',
          nodes: [],
          label: `Agents→P${nextPhase.order}`
        });
      }
    });


    // First pass: Place all tasks in their phase columns
    graphNodes.forEach(node => {
      if (node.type === 'task' && node.data.phase_order) {
        const column = columns.find(col => col.id === `tasks_p${node.data.phase_order}`);
        if (column) {
          column.nodes.push(node);
        }
      }
    });


    // Second pass: Place agents to create the alternating flow
    // Separate external and internal agents
    const externalAgents = graphNodes.filter(n => n.type === 'agent' && n.data.status === 'external');
    const internalAgents = graphNodes.filter(n => n.type === 'agent' && n.data.status !== 'external');

    // Place external agents in column 0
    externalAgents.forEach(agent => {
      columns[0].nodes.push(agent);
    });

    // Find the agent columns (agents_for_pX)
    const agentColumns = columns.filter(col => col.type === 'agents' && col.id !== 'external_agents');

    if (agentColumns.length > 0 && internalAgents.length > 0) {
      // Strategy: Distribute internal agents proportionally based on task counts in subsequent phases
      const p2TaskCount = graphNodes.filter(n => n.type === 'task' && n.data.phase_order === 2).length;
      const p3TaskCount = graphNodes.filter(n => n.type === 'task' && n.data.phase_order === 3).length;

      // Calculate proportional distribution
      const totalTasks = p2TaskCount + p3TaskCount;
      let agentsForP2 = 0;
      let agentsForP3 = 0;

      if (totalTasks > 0) {
        agentsForP2 = Math.round((p2TaskCount / totalTasks) * internalAgents.length);
        agentsForP3 = internalAgents.length - agentsForP2;
      } else {
        // Even split if no tasks
        agentsForP2 = Math.floor(internalAgents.length / 2);
        agentsForP3 = internalAgents.length - agentsForP2;
      }

      // Place agents in columns
      internalAgents.forEach((agent, index) => {
        if (index < agentsForP2) {
          // Place in agents_for_p2 column
          const p2Column = columns.find(col => col.id === 'agents_for_p2');
          if (p2Column) {
            p2Column.nodes.push(agent);
          } else {
            columns[0].nodes.push(agent); // fallback
          }
        } else {
          // Place in agents_for_p3 column
          const p3Column = columns.find(col => col.id === 'agents_for_p3');
          if (p3Column) {
            p3Column.nodes.push(agent);
          } else {
            columns[0].nodes.push(agent); // fallback
          }
        }
      });
    } else {
      // Fallback: put all internal agents in external column
      internalAgents.forEach(agent => {
        columns[0].nodes.push(agent);
      });
    }

    // Layout configuration
    const columnWidth = 250;
    const nodeHeight = 70;
    const nodeSpacing = 15;
    const startX = 100;
    const startY = 120;

    // Track headers
    const headers: { label: string; x: number; width: number; type: 'agents' | 'tasks' }[] = [];

    // Position nodes in each column based on layout direction
    let currentX = startX;
    let currentY = startY;

    columns.forEach((column) => {
      if (column.nodes.length === 0 && column.id !== 'external_agents') {
        // Skip empty columns except external agents (always show it)
        return;
      }

      // Sort nodes to minimize edge crossings
      column.nodes.sort((a, b) => {
        // Sort by ID for consistency
        return a.id.localeCompare(b.id);
      });

      if (layoutDirection === 'LR') {
        // Left-to-Right layout (original)
        const totalHeight = column.nodes.length * (nodeHeight + nodeSpacing);
        const columnStartY = startY + Math.max(0, (600 - totalHeight) / 2);

        column.nodes.forEach((node, index) => {
          const y = columnStartY + index * (nodeHeight + nodeSpacing);

          const isHighlighted = highlightedNodes.has(node.id);
          const isDimmed = hoveredNode && !isHighlighted;

          const reactFlowNode: Node = {
            id: node.id,
            type: node.type,
            position: { x: currentX, y },
            data: {
              ...node.data,
              isHighlighted,
              isDimmed,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          };

          nodeMap.set(node.id, reactFlowNode);
        });

        // Add header for this column
        headers.push({
          label: column.label,
          x: currentX - 50,
          width: columnWidth,
          type: column.type
        });

        currentX += columnWidth;
      } else {
        // Top-to-Bottom layout
        const totalWidth = column.nodes.length * (columnWidth + nodeSpacing);
        const columnStartX = startX + Math.max(0, (800 - totalWidth) / 2);

        column.nodes.forEach((node, index) => {
          const x = columnStartX + index * (columnWidth + nodeSpacing);

          const isHighlighted = highlightedNodes.has(node.id);
          const isDimmed = hoveredNode && !isHighlighted;

          const reactFlowNode: Node = {
            id: node.id,
            type: node.type,
            position: { x, y: currentY },
            data: {
              ...node.data,
              isHighlighted,
              isDimmed,
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          };

          nodeMap.set(node.id, reactFlowNode);
        });

        // Add header for this row (in TB mode, headers are rows)
        headers.push({
          label: column.label,
          x: columnStartX - 50,
          width: totalWidth + 100,
          type: column.type
        });

        currentY += 200; // Move down for next row
      }
    });

    // Update column headers state
    setColumnHeaders(headers);

    return Array.from(nodeMap.values());
  }, [highlightedNodes, hoveredNode, layoutDirection]);

  // Function to find all connected nodes in the chain (excluding external agents)
  const findConnectedChain = useCallback((nodeId: string, graphEdges: GraphEdge[]): { nodes: Set<string>, edges: Set<string> } => {
    const visitedNodes = new Set<string>();
    const connectedEdges = new Set<string>();
    const queue = [nodeId];

    // Get all external agent IDs to exclude them from traversal
    const externalAgentIds = new Set(
      data?.nodes
        .filter(n => n.type === 'agent' && n.data.status === 'external')
        .map(n => n.id) || []
    );

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      if (visitedNodes.has(currentNode)) continue;
      visitedNodes.add(currentNode);

      // Find all edges connected to this node (both incoming and outgoing)
      graphEdges.forEach(edge => {
        if (edge.source === currentNode || edge.target === currentNode) {
          connectedEdges.add(edge.id);

          // Add the other node to the queue if not visited and not an external agent
          const otherNode = edge.source === currentNode ? edge.target : edge.source;
          if (!visitedNodes.has(otherNode) && !externalAgentIds.has(otherNode)) {
            queue.push(otherNode);
          }
        }
      });
    }

    return { nodes: visitedNodes, edges: connectedEdges };
  }, [data]);

  // Convert edges with better styling and highlighting
  const convertEdges = useCallback((graphEdges: GraphEdge[]): Edge[] => {
    return graphEdges.map(edge => {
      const isHighlighted = highlightedEdges.has(edge.id);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isHighlighted,
        style: {
          stroke: isHighlighted ? '#FF6B6B' :
                  edge.type === 'created' ? '#8B5CF6' :
                  edge.type === 'assigned' ? '#10B981' :
                  edge.type === 'subtask' ? '#F59E0B' :
                  '#6B7280',
          strokeWidth: isHighlighted ? 4 : 2,
          opacity: hoveredNode && !isHighlighted ? 0.3 : 1,
        },
        labelStyle: {
          fill: '#4B5563',
          fontSize: 9,
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.8,
        },
      };
    });
  }, [highlightedEdges, hoveredNode]);

  useEffect(() => {
    if (data) {
      const layoutedNodes = layoutNodes(data.nodes, data.edges, data.phases || {});
      const convertedEdges = convertEdges(data.edges);
      setNodes(layoutedNodes);
      setEdges(convertedEdges);
    }
  }, [data, layoutNodes, convertEdges, setNodes, setEdges]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribeTask = subscribe('task_created', () => {
      refetch();
    });

    const unsubscribeAgent = subscribe('agent_created', () => {
      refetch();
    });

    return () => {
      unsubscribeTask();
      unsubscribeAgent();
    };
  }, [subscribe, refetch]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'task') {
      // Open TaskDetailModal for task nodes
      setSelectedTaskId(node.data.id);
      setSelectedNode(null); // Close the preview
    } else if (node.type === 'agent') {
      // Open RealTimeAgentOutput for agent nodes
      const agentData = {
        id: node.data.id,
        status: node.data.status,
        cli_type: node.data.cli_type || 'unknown',
        current_task_id: node.data.current_task_id || null,
        tmux_session_name: null,
        health_check_failures: 0,
        created_at: node.data.created_at || '',
        last_activity: null,
      };
      setSelectedAgent(agentData);
      setSelectedNode(null); // Close the preview
    } else {
      // Fallback to original preview behavior for other node types
      setSelectedNode(node);
    }
  }, []);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    if (!data) return;

    setHoveredNode(node.id);
    const chain = findConnectedChain(node.id, data.edges);
    setHighlightedNodes(chain.nodes);
    setHighlightedEdges(chain.edges);
  }, [data, findConnectedChain]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Failed to load graph data</p>
      </div>
    );
  }

  // Column headers component
  const ColumnHeaders = () => (
    <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-10">
      <div className="relative h-full">
        {columnHeaders.map((header, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center h-full"
            style={{
              left: header.x,
              width: header.width,
            }}
          >
            <div
              className={`w-full h-full flex items-center justify-center border-b-2 ${
                header.type === 'agents'
                  ? (header.label.includes('External')
                      ? 'bg-purple-100 dark:bg-purple-950 border-purple-400 dark:border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600')
                  : header.label.includes('Phase 1') ? 'bg-green-100 dark:bg-green-950 border-green-400 dark:border-green-600' :
                    header.label.includes('Phase 2') ? 'bg-blue-100 dark:bg-blue-950 border-blue-400 dark:border-blue-600' :
                    header.label.includes('Phase 3') ? 'bg-yellow-100 dark:bg-yellow-950 border-yellow-400 dark:border-yellow-600' :
                    header.label.includes('Phase 4') ? 'bg-pink-100 dark:bg-pink-950 border-pink-400 dark:border-pink-600' :
                    'bg-indigo-100 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-600'
              }`}
            >
              <div className="text-center px-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {header.label.split(':')[0]}
                </p>
                {header.label.includes(':') && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {header.label.split(':')[1]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Graph Visualization</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Agent and task flow through phases</p>
            </div>
          </div>

          {/* Layout and Refresh Controls */}
          <div className="flex items-center gap-3">
            {/* Layout Direction */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Layout:</span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setLayoutDirection('LR')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    layoutDirection === 'LR'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="Left to Right"
                >
                  Left-Right
                </button>
                <button
                  onClick={() => setLayoutDirection('TB')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    layoutDirection === 'TB'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="Top to Bottom"
                >
                  Top-Down
                </button>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>

            {/* Auto-refresh Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={!autoRefresh}
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors flex items-center ${
                  autoRefresh
                    ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 border border-green-200 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
                title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
              >
                {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
        <div className="flex items-center space-x-6 flex-wrap gap-2">
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Flow: Agents → Tasks → Agents</span>
          </div>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-purple-500 dark:bg-purple-600 rounded mr-2 border border-purple-600 dark:border-purple-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">External/MCP Agent</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-500 dark:bg-blue-600 rounded mr-2 border border-blue-600 dark:border-blue-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Agent</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-green-500 dark:bg-green-600 rounded mr-2 border border-green-600 dark:border-green-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase 1 Task</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-500 dark:bg-blue-600 rounded mr-2 border border-blue-600 dark:border-blue-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase 2 Task</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-yellow-500 dark:bg-yellow-600 rounded mr-2 border border-yellow-600 dark:border-yellow-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase 3 Task</span>
          </div>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center">
            <div className="w-10 h-1.5 bg-purple-500 dark:bg-purple-600 mr-2 rounded"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Creates</span>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-1.5 bg-green-500 dark:bg-green-600 mr-2 rounded"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned</span>
          </div>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center">
            <div className="w-10 h-1.5 bg-red-500 dark:bg-red-600 mr-2 rounded"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hover to highlight chain</span>
          </div>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center">
            <Layers className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {nodes.length} nodes, {edges.length} edges
            </span>
          </div>
        </div>
      </div>

      {/* Graph with Column Headers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md relative" style={{ height: '800px', width: '100%' }}>
        <ColumnHeaders />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 0.8 }}
          style={{ width: '100%', height: '100%', paddingTop: '60px' }}
        >
          <Background variant="dots" gap={20} size={1} className="dark:opacity-30" />
          <Controls className="dark:bg-gray-700 dark:border-gray-600" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'agent') {
                return node.data.status === 'external' ? '#9333EA' : '#3B82F6';
              }
              // Color tasks by phase
              const phaseOrder = node.data.phase_order;
              if (phaseOrder === 1) return '#10B981';
              if (phaseOrder === 2) return '#3B82F6';
              if (phaseOrder === 3) return '#EAB308';
              if (phaseOrder === 4) return '#EC4899';
              return '#6366F1';
            }}
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="dark:bg-gray-700 dark:border-gray-600"
          />
        </ReactFlow>
      </div>

      {/* Node Preview Modal */}
      {selectedNode && (
        <NodePreview node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onNavigateToTask={(taskId) => setSelectedTaskId(taskId)}
        onNavigateToGraph={(taskId) => {
          setSelectedTaskId(null);
          // Could implement highlighting the task in the graph here
        }}
      />

      {/* Real-time Agent Output Modal */}
      <RealTimeAgentOutput
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
};

export default Graph;