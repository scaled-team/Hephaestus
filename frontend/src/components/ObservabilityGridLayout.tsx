import React, { useMemo, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import ObservabilityPanel from './ObservabilityPanel';
import { Agent } from '@/types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '@/styles/observability-grid.css';

interface OutputData {
  output: string;
  timestamp: string;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdateTime: Date | null;
}

interface ObservabilityGridLayoutProps {
  agents: Agent[];
  visibleAgents: Set<string>;
  agentOutputs: Record<string, OutputData>;
  cols: number;
  rows: number;
  globalPaused: boolean;
  sidebarOpen?: boolean;
  onLayoutChange?: (layout: GridLayout.Layout[]) => void;
  onToggleFullscreen: (agentId: string) => void;
  onToggleAgent: (agentId: string) => void;
}

const ObservabilityGridLayout: React.FC<ObservabilityGridLayoutProps> = ({
  agents,
  visibleAgents,
  agentOutputs,
  cols,
  rows,
  globalPaused,
  sidebarOpen = true,
  onLayoutChange,
  onToggleFullscreen,
  onToggleAgent,
}) => {
  // Generate layout from visible agents
  const layout = useMemo(() => {
    const items: GridLayout.Layout[] = [];
    let index = 0;

    Array.from(visibleAgents).forEach((agentId) => {
      if (index >= cols * rows) return; // Don't exceed grid capacity

      items.push({
        i: agentId,
        x: index % cols,
        y: Math.floor(index / cols),
        w: 1,
        h: 1,
        minW: 1,
        minH: 1,
        maxW: cols,
        maxH: rows,
      });
      index++;
    });

    return items;
  }, [visibleAgents, cols, rows]);

  // Handle layout change (after drag/resize)
  const handleLayoutChange = useCallback((newLayout: GridLayout.Layout[]) => {
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  }, [onLayoutChange]);

  // Calculate grid dimensions with responsive width
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  const containerHeight = useMemo(() => {
    // Calculate based on viewport height minus header/controls
    return window.innerHeight - 250; // Standard viewport height
  }, []);

  const rowHeight = useMemo(() => {
    // Calculate row height ensuring readable terminal text (1.6x for good balance)
    const totalGapHeight = (rows - 1) * 16; // 16px margin between rows
    const availableHeight = containerHeight - totalGapHeight;
    // 1.6x height (doubled minus 20%): For 2x2: ~640px per panel | For 3x3: ~400px per panel
    // This provides good visibility without excessive height
    const baseRowHeight = availableHeight / rows;
    return Math.max(baseRowHeight * 1.6, 320); // 1.6x with 320px minimum
  }, [containerHeight, rows]);

  // Update grid width when container size changes
  React.useEffect(() => {
    const updateWidth = () => {
      if (gridContainerRef.current) {
        // Get parent's actual content width (after padding is applied)
        const rect = gridContainerRef.current.getBoundingClientRect();
        // Subtract padding (p-4 = 16px on each side = 32px total)
        const availableWidth = rect.width - 32;
        setContainerWidth(Math.max(availableWidth, 1));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [sidebarOpen]); // Re-calculate when sidebar opens/closes

  return (
    <div ref={gridContainerRef} className="h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <GridLayout
          className="layout"
          layout={layout}
          cols={cols}
          rowHeight={rowHeight}
          width={containerWidth || 1} // Use measured width, fallback to 1
          margin={[10, 10]}
          containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable={true}
        isResizable={true}
        compactType="vertical" // Allow vertical compacting and rearrangement
        preventCollision={false} // Allow items to push each other around
        useCSSTransforms={true}
      >
        {Array.from(visibleAgents).map((agentId) => {
          const agent = agents.find(a => a.id === agentId);
          if (!agent) return null;

          return (
            <div key={agentId} className="grid-item relative">
              <div className="drag-handle absolute top-0 left-0 right-0 cursor-grab active:cursor-grabbing z-10" style={{height: '36px'}} title="Drag to reposition panel" />
              <ObservabilityPanel
                agent={agent}
                output={agentOutputs[agentId]}
                onToggleFullscreen={() => onToggleFullscreen(agentId)}
                onHide={() => onToggleAgent(agentId)}
                isPaused={globalPaused}
              />
            </div>
          );
        })}
        </GridLayout>
      </div>
    </div>
  );
};

export default ObservabilityGridLayout;