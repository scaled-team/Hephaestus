import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useWebSocket } from '@/context/WebSocketContext';
import ObservabilityPanel from '@/components/ObservabilityPanel';
import ObservabilityControls from '@/components/ObservabilityControls';
import ObservabilitySidebar from '@/components/ObservabilitySidebar';
import CustomLayoutDialog from '@/components/CustomLayoutDialog';
import ObservabilityGridLayout from '@/components/ObservabilityGridLayout';
import LayoutManager from '@/components/LayoutManager';
import MonitorTerminal from '@/components/MonitorTerminal';
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence';
import { useMultiAgentOutput } from '@/hooks/useMultiAgentOutput';

export type LayoutPreset = '1x1' | '2x2' | '3x3' | '2x3' | 'custom';

export interface GridLayout {
  cols: number;
  rows: number;
  panels: PanelLayout[];
}

export interface PanelLayout {
  agentId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
}

const DEFAULT_LAYOUTS: Record<LayoutPreset, Omit<GridLayout, 'panels'>> = {
  '1x1': { cols: 1, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
  '2x3': { cols: 3, rows: 2 },
  'custom': { cols: 4, rows: 4 },
};

const OUTPUT_POLL_INTERVAL = 5000;

const Observability: React.FC = () => {
  // State management
  const [selectedLayout, setSelectedLayout] = useState<LayoutPreset>('2x2');
  const [gridLayout, setGridLayout] = useState<GridLayout>({
    ...DEFAULT_LAYOUTS['2x2'],
    panels: [],
  });
  const [visibleAgents, setVisibleAgents] = useState<Set<string>>(new Set());
  const [globalPaused, setGlobalPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreenAgent, setFullscreenAgent] = useState<string | null>(null);
  const [showCustomLayoutDialog, setShowCustomLayoutDialog] = useState(false);
  const [showMonitor, setShowMonitor] = useState(true);
  const [fullscreenMonitor, setFullscreenMonitor] = useState(false);
  const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);

  // Fetch agents data - only fetch on mount and explicit WebSocket lifecycle events
  const { data: agents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: apiService.getAgents,
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only fetch on initial mount
    staleTime: Infinity, // Consider data always fresh
  });

  // WebSocket for real-time agent status updates
  const { subscribe } = useWebSocket();

  // Layout persistence
  const { saveLayout, loadLayout } = useLayoutPersistence();

  // Multi-agent output management - only fetch output for agents with panels, and only when not in sidebar-only mode
  const panelAgentIds = useMemo(() => gridLayout.panels.map(panel => panel.agentId), [gridLayout.panels]);
  const shouldFetchOutput = panelAgentIds.length > 0 && visibleAgents.size > 0;
  const { outputs: agentOutputs, stats } = useMultiAgentOutput(
    panelAgentIds,
    {
      enabled: !globalPaused && shouldFetchOutput,
      updateInterval: OUTPUT_POLL_INTERVAL, // Slower updates - every 5 seconds
    }
  );

  // Filter agents based on search term
  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;
    const term = searchTerm.toLowerCase();
    return agents.filter(agent =>
      agent.id.toLowerCase().includes(term) ||
      agent.status.toLowerCase().includes(term) ||
      (agent.current_task_id && agent.current_task_id.toLowerCase().includes(term))
    );
  }, [agents, searchTerm]);

  // Active agents (non-idle)
  const activeAgents = useMemo(() =>
    agents.filter(agent => agent.status !== 'idle'),
    [agents]
  );

  // Initialize layout once when agents are loaded
  const [layoutInitialized, setLayoutInitialized] = useState(false);

  useEffect(() => {
    if (agents.length === 0 || layoutInitialized) return;

    // Auto-populate with first 4 active agents (2x2 grid - optimal for readability)
    const workingAgents = agents.filter(a => a.status === 'working');
    const initialAgents = workingAgents.length > 0 ? workingAgents.slice(0, 4) : agents.slice(0, 4);
    const panels: PanelLayout[] = initialAgents.map((agent, index) => ({
      agentId: agent.id,
      x: index % 2,
      y: Math.floor(index / 2),
      w: 1,
      h: 1,
    }));

    setGridLayout({
      ...DEFAULT_LAYOUTS['2x2'],
      panels,
    });
    setVisibleAgents(new Set(initialAgents.map(a => a.id)));
    setLayoutInitialized(true);
  }, [agents.length, layoutInitialized]);


  // Subscribe ONLY to agent lifecycle events (creation/deletion), not status updates
  useEffect(() => {
    const unsubscribeCreated = subscribe('agent_created', () => {
      refetch();
    });

    const unsubscribeDeleted = subscribe('agent_deleted', () => {
      refetch();
    });

    return () => {
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, [subscribe, refetch]);

  // Layout change handler
  const handleLayoutChange = useCallback((preset: LayoutPreset) => {
    if (preset === 'custom') {
      // Show the custom layout dialog
      setShowCustomLayoutDialog(true);
      return;
    }

    setSelectedLayout(preset);
    const newLayout = DEFAULT_LAYOUTS[preset];

    // Rearrange existing panels to fit new grid
    const panels = Array.from(visibleAgents).slice(0, newLayout.cols * newLayout.rows)
      .map((agentId, index) => ({
        agentId,
        x: index % newLayout.cols,
        y: Math.floor(index / newLayout.cols),
        w: 1,
        h: 1,
      }));

    const newGridLayout = {
      ...newLayout,
      panels,
    };

    setGridLayout(newGridLayout);

    // TODO: Re-enable layout saving once infinite loop is fixed
    // saveLayout({
    //   selectedLayout: preset,
    //   gridLayout: newGridLayout,
    //   visibleAgents: Array.from(visibleAgents),
    // });
  }, [visibleAgents]);

  // Handle custom layout apply
  const handleCustomLayoutApply = useCallback((rows: number, cols: number) => {
    setSelectedLayout('custom');

    // Rearrange existing panels to fit new grid
    const panels = Array.from(visibleAgents).slice(0, cols * rows)
      .map((agentId, index) => ({
        agentId,
        x: index % cols,
        y: Math.floor(index / cols),
        w: 1,
        h: 1,
      }));

    const newGridLayout = {
      cols,
      rows,
      panels,
    };

    setGridLayout(newGridLayout);
  }, [visibleAgents]);

  // Handle loading saved layout
  const handleLoadLayout = useCallback((layout: any) => {
    setSelectedLayout('custom');
    setGridLayout({
      cols: layout.cols,
      rows: layout.rows,
      panels: layout.panels,
    });
    setVisibleAgents(new Set(layout.visibleAgents));
  }, []);

  // Toggle agent visibility
  const toggleAgentVisibility = useCallback((agentId: string) => {
    let newGridLayout = gridLayout;
    let newVisibleAgents = new Set(visibleAgents);

    if (visibleAgents.has(agentId)) {
      newVisibleAgents.delete(agentId);
      // Remove from panels
      newGridLayout = {
        ...gridLayout,
        panels: gridLayout.panels.filter(p => p.agentId !== agentId),
      };
    } else {
      newVisibleAgents.add(agentId);
      // Add to panels (find empty spot)
      const newPanel: PanelLayout = {
        agentId,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      };

      // Find first empty spot in grid
      for (let y = 0; y < gridLayout.rows; y++) {
        for (let x = 0; x < gridLayout.cols; x++) {
          const occupied = gridLayout.panels.some(p =>
            p.x === x && p.y === y && !p.hidden
          );
          if (!occupied) {
            newPanel.x = x;
            newPanel.y = y;
            break;
          }
        }
      }

      newGridLayout = {
        ...gridLayout,
        panels: [...gridLayout.panels, newPanel],
      };
    }

    setVisibleAgents(newVisibleAgents);
    setGridLayout(newGridLayout);

    // TODO: Re-enable layout saving once infinite loop is fixed
    // saveLayout({
    //   selectedLayout,
    //   gridLayout: newGridLayout,
    //   visibleAgents: Array.from(newVisibleAgents),
    // });
  }, [gridLayout, visibleAgents, selectedLayout]);

  // Export all logs
  const exportLogs = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logs = Object.entries(agentOutputs).map(([agentId, data]) =>
      `=== Agent ${agentId} ===\n${data.output}\n\n`
    ).join('');

    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agentOutputs]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6 m-4">
        <p className="text-red-600 dark:text-red-400">Failed to load agents</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <ObservabilityControls
        selectedLayout={selectedLayout}
        onLayoutChange={handleLayoutChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        globalPaused={globalPaused}
        onTogglePause={() => setGlobalPaused(!globalPaused)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        agentCount={visibleAgents.size}
        totalAgents={agents.length}
        activeAgents={activeAgents.length}
        stats={stats}
        onExportLogs={exportLogs}
        onToggleLayoutsPanel={() => setLayoutManagerOpen(prev => !prev)}
        layoutsPanelOpen={layoutManagerOpen}
        updateIntervalMs={OUTPUT_POLL_INTERVAL}
      />

      <AnimatePresence initial={false}>
        {layoutManagerOpen && (
          <motion.div
            key="layout-manager"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
          >
            <LayoutManager
              currentLayout={{
                cols: gridLayout.cols,
                rows: gridLayout.rows,
                panels: gridLayout.panels,
                visibleAgents: Array.from(visibleAgents),
              }}
              onLoadLayout={handleLoadLayout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Monitor Terminal */}
        {showMonitor && (
          <div className="h-40 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden p-2">
            {fullscreenMonitor ? (
              <MonitorTerminal
                isFullscreen={true}
                onToggleFullscreen={() => setFullscreenMonitor(false)}
                onClose={() => setShowMonitor(false)}
              />
            ) : (
              <MonitorTerminal
                onToggleFullscreen={() => setFullscreenMonitor(true)}
              />
            )}
          </div>
        )}

        {/* Agents Grid Area */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 280 }}
                exit={{ width: 0 }}
                className="bg-white dark:bg-gray-800 border-r dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <ObservabilitySidebar
                  agents={filteredAgents}
                  visibleAgents={visibleAgents}
                  onToggleAgent={toggleAgentVisibility}
                  onSelectAll={() => setVisibleAgents(new Set(agents.map(a => a.id)))}
                  onDeselectAll={() => {
                    setVisibleAgents(new Set());
                    setGridLayout(current => ({ ...current, panels: [] }));
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid Area */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {visibleAgents.size === 0 ? (
              <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No agents selected</p>
                  <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                    {sidebarOpen
                      ? "Select agents from the sidebar to monitor their output"
                      : "Open the sidebar to select agents"}
                  </p>
                </div>
              </div>
            ) : fullscreenAgent ? (
              // Fullscreen view
              <ObservabilityPanel
                agent={agents.find(a => a.id === fullscreenAgent)!}
                output={agentOutputs[fullscreenAgent]}
                isFullscreen={true}
                onClose={() => setFullscreenAgent(null)}
                isPaused={globalPaused}
              />
            ) : (
              // Grid view with drag and drop
              <ObservabilityGridLayout
                agents={agents}
                visibleAgents={visibleAgents}
                agentOutputs={agentOutputs}
                cols={gridLayout.cols}
                rows={gridLayout.rows}
                globalPaused={globalPaused}
                sidebarOpen={sidebarOpen}
                onToggleFullscreen={setFullscreenAgent}
                onToggleAgent={toggleAgentVisibility}
              />
            )}
          </div>
        </div>
      </div>

      {/* Custom Layout Dialog */}
      <CustomLayoutDialog
        isOpen={showCustomLayoutDialog}
        onClose={() => setShowCustomLayoutDialog(false)}
        onApply={handleCustomLayoutApply}
        currentRows={gridLayout.rows}
        currentCols={gridLayout.cols}
      />
    </div>
  );
};

export default Observability;
