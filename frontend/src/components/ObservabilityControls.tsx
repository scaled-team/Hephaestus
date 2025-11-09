import React from 'react';
import {
  Grid3x3,
  Grid2x2,
  Square,
  Search,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Download,
  Wifi,
  WifiOff,
  Rows,
  LayoutGrid,
  Layers
} from 'lucide-react';
import type { LayoutPreset } from '@/pages/Observability';

interface ObservabilityControlsProps {
  selectedLayout: LayoutPreset;
  onLayoutChange: (layout: LayoutPreset) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  globalPaused: boolean;
  onTogglePause: () => void;
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
  agentCount: number;
  totalAgents: number;
  activeAgents: number;
  stats: {
    connected: number;
    total: number;
    failed: number;
    loading: number;
  };
  onExportLogs: () => void;
  onToggleLayoutsPanel: () => void;
  layoutsPanelOpen: boolean;
  updateIntervalMs?: number;
}

const ObservabilityControls: React.FC<ObservabilityControlsProps> = ({
  selectedLayout,
  onLayoutChange,
  searchTerm,
  onSearchChange,
  globalPaused,
  onTogglePause,
  onToggleSidebar,
  sidebarOpen = true,
  agentCount,
  totalAgents,
  activeAgents,
  stats,
  onExportLogs,
  onToggleLayoutsPanel,
  layoutsPanelOpen,
  updateIntervalMs = 5000,
}) => {
  const layoutOptions: { value: LayoutPreset; label: string; icon: React.ReactNode }[] = [
    { value: '1x1', label: '1×1', icon: <Square className="w-4 h-4" /> },
    { value: '2x2', label: '2×2', icon: <Grid2x2 className="w-4 h-4" /> },
    { value: '3x3', label: '3×3', icon: <Grid3x3 className="w-4 h-4" /> },
    { value: '2x3', label: '2×3', icon: <Rows className="w-4 h-4" /> },
    { value: 'custom', label: 'Custom', icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const connectionHealthy = stats.connected > 0;
  const updateIntervalLabel = `${Math.round(updateIntervalMs / 1000)}s`;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Monitor className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Agent Observability</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitoring {agentCount} / {totalAgents} agents · {activeAgents} active right now
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleLayoutsPanel}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              layoutsPanelOpen
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Layouts
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              connectionHealthy
                ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:bg-red-900/20'
            }`}
          >
            {connectionHealthy ? (
              <>
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Offline</span>
              </>
            )}
          </div>

          <button
            onClick={onExportLogs}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center font-medium"
          >
            <Download className="w-4 h-4 mr-1" />
            Export Logs
          </button>

          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              globalPaused
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
            }`}
            title={globalPaused ? 'Resume all agents' : 'Pause all agents'}
          >
            {globalPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {globalPaused ? 'Resume All' : 'Pause All'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={`${sidebarOpen ? 'Hide' : 'Show'} agent list`}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {layoutOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onLayoutChange(option.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedLayout === option.value
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title={`${option.label} layout`}
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{agentCount}</span> ·{' '}
            <span className="text-gray-500 dark:text-gray-400">{stats.connected} connected</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search agents..."
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 w-52"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Updates every {updateIntervalLabel} · {stats.failed > 0 ? `${stats.failed} failing` : 'All healthy'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObservabilityControls;
