import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Server, FolderKanban, GitBranch, Cpu, Users2, Activity, Database, RefreshCw, ShieldCheck, Download, Copy, Check, Search, X } from 'lucide-react';
import { apiService } from '@/services/api';
import { SystemConfig } from '@/types';

interface ConfigCardProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

const ConfigCard: React.FC<ConfigCardProps> = ({ title, icon, description, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
    <div className="flex items-start space-x-3">
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

const KeyValueGrid: React.FC<{ items: Array<{ label: string; value: React.ReactNode }> }> = ({ items }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (label: string, value: React.ReactNode) => {
    const textValue = String(value ?? '—');
    navigator.clipboard.writeText(textValue);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {items.map(({ label, value }) => (
        <div key={label} className="group relative">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate flex items-center justify-between">
            <span className="truncate">{value ?? '—'}</span>
            <button
              onClick={() => handleCopy(label, value)}
              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Copy to clipboard"
            >
              {copiedKey === label ? (
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              )}
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
};

const Config: React.FC = () => {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: apiService.getSystemConfig,
    staleTime: 60_000,
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExport = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hephaestus-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  // Filter config sections based on search query
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const configSections = useMemo(() => {
    if (!data) return [];

    const sections = [
      {
        id: 'server',
        title: 'Server & Paths',
        icon: <Server className="w-5 h-5" />,
        description: 'Core MCP endpoint and storage locations.',
        items: [
          { label: 'Host', value: data.server.host },
          { label: 'Port', value: data.server.port },
          { label: 'CORS Enabled', value: data.server.enable_cors ? 'Yes' : 'No' },
          { label: 'Database', value: data.paths.database },
          { label: 'Phases Folder', value: data.paths.phases_folder },
          { label: 'Worktree Base', value: data.paths.worktree_base },
          { label: 'Project Root', value: data.paths.project_root },
        ],
      },
      {
        id: 'git',
        title: 'Git & Worktrees',
        icon: <GitBranch className="w-5 h-5" />,
        description: 'Repo synchronization strategy for spawned agents.',
        items: [
          { label: 'Main Repository', value: data.git.main_repo_path },
          { label: 'Base Branch', value: data.git.base_branch },
          { label: 'Worktree Prefix', value: data.git.worktree_branch_prefix },
          { label: 'Auto Commit', value: data.git.auto_commit ? 'Enabled' : 'Disabled' },
          { label: 'Conflict Strategy', value: data.git.conflict_resolution },
        ],
      },
      {
        id: 'llm',
        title: 'LLM Defaults',
        icon: <Cpu className="w-5 h-5" />,
        description: 'Provider and inference defaults for orchestration prompts.',
        items: [
          { label: 'Provider', value: data.llm.provider },
          { label: 'Model', value: data.llm.model },
          { label: 'Temperature', value: data.llm.default_temperature },
          { label: 'Max Tokens', value: data.llm.default_max_tokens },
          { label: 'Embedding Model', value: data.llm.embedding_model },
          { label: 'OpenRouter Backend', value: data.llm.default_openrouter_provider },
        ],
      },
      {
        id: 'agents',
        title: 'Agent Runtime',
        icon: <Users2 className="w-5 h-5" />,
        description: 'Defaults applied to CLI agents and tmux orchestration.',
        items: [
          { label: 'CLI Tool', value: data.agents.default_cli_tool },
          { label: 'CLI Model', value: data.agents.cli_model },
          { label: 'Tmux Prefix', value: data.agents.tmux_session_prefix },
          { label: 'Health Check Interval (s)', value: data.agents.health_check_interval },
          { label: 'Max Health Failures', value: data.agents.max_health_failures },
          { label: 'Termination Delay (s)', value: data.agents.termination_delay },
          { label: 'Max Concurrent Agents', value: data.agents.max_concurrent_agents },
        ],
      },
      {
        id: 'monitoring',
        title: 'Monitoring & Diagnostics',
        icon: <Activity className="w-5 h-5" />,
        description: 'Telemetry cadence and stuck-agent safeguards.',
        items: [
          { label: 'Monitoring Enabled', value: data.monitoring.enabled ? 'Yes' : 'No' },
          { label: 'Interval (s)', value: data.monitoring.interval_seconds },
          { label: 'Stuck Agent Threshold (s)', value: data.monitoring.stuck_agent_threshold },
          { label: 'Guardian Min Agent Age (s)', value: data.monitoring.guardian_min_agent_age_seconds },
          { label: 'Log Level', value: data.monitoring.log_level },
          { label: 'Diagnostic Agent Enabled', value: data.diagnostic_agent.enabled ? 'Yes' : 'No' },
          { label: 'Diagnostic Cooldown (s)', value: data.diagnostic_agent.cooldown_seconds },
          { label: 'Diagnostic Min Stuck Time (s)', value: data.diagnostic_agent.min_stuck_time_seconds },
          { label: 'Max Agents to Analyze', value: data.diagnostic_agent.max_agents_to_analyze },
          { label: 'Max Conductor Analyses', value: data.diagnostic_agent.max_conductor_analyses },
          { label: 'Max Tasks Per Run', value: data.diagnostic_agent.max_tasks_per_run },
        ],
      },
      {
        id: 'vector',
        title: 'Vector Store & Deduplication',
        icon: <Database className="w-5 h-5" />,
        description: 'Memory persistence and task similarity settings.',
        items: [
          { label: 'Qdrant URL', value: data.vector_store.qdrant_url },
          { label: 'Collection Prefix', value: data.vector_store.collection_prefix },
          { label: 'Embedding Dimension', value: data.vector_store.embedding_dimension },
          { label: 'Dedup Enabled', value: data.task_deduplication.enabled ? 'Yes' : 'No' },
          { label: 'Similarity Threshold', value: data.task_deduplication.similarity_threshold },
          { label: 'Related Threshold', value: data.task_deduplication.related_threshold },
          { label: 'Batch Size', value: data.task_deduplication.batch_size },
          { label: 'Dedup Embedding Model', value: data.task_deduplication.embedding_model },
        ],
      },
      {
        id: 'tickets',
        title: 'Ticket Tracking',
        icon: <FolderKanban className="w-5 h-5" />,
        description: 'Workflow-level governance for tickets and approvals.',
        items: [
          { label: 'Enabled', value: data.ticket_tracking.enabled ? 'Yes' : 'No' },
          { label: 'Default Human Review', value: data.ticket_tracking.default_human_review ? 'Yes' : 'No' },
          { label: 'Approval Timeout (s)', value: data.ticket_tracking.default_approval_timeout },
        ],
      },
      {
        id: 'safety',
        title: 'Safety & Auth',
        icon: <ShieldCheck className="w-5 h-5" />,
        description: 'High-level status indicators.',
        items: [], // Special section with status chips
      },
    ];

    // Filter sections based on search query
    if (!searchQuery) return sections;

    return sections.filter(section => {
      // Check if section title or description matches
      if (matchesSearch(section.title) || matchesSearch(section.description)) {
        return true;
      }
      // Check if any item label or value matches
      return section.items.some(item =>
        matchesSearch(item.label) || matchesSearch(String(item.value ?? ''))
      );
    });
  }, [data, searchQuery]);

  const renderStatusChip = (label: string, active: boolean) => (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
        active
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <span className={`mr-1 h-2 w-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-300 font-medium">Unable to load configuration.</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">Check that the backend is running and try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide">Infrastructure</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">System Configuration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Live snapshot from hephaestus_config.yaml with environment overrides applied.
            </p>
            {dataUpdatedAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
                Last updated: {new Date(dataUpdatedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
              title="Refresh configuration"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-600 dark:bg-gray-700 text-white text-sm font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm"
              title="Export configuration as JSON"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Exported
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Chips and Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {renderStatusChip('Monitoring', Boolean(data.monitoring?.enabled))}
            {renderStatusChip('Ticket Tracking', Boolean(data.ticket_tracking?.enabled))}
            {renderStatusChip('Diagnostic Agent', Boolean(data.diagnostic_agent?.enabled))}
            {renderStatusChip('Task Deduplication', Boolean(data.task_deduplication?.enabled))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search configuration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        {configSections.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No configuration sections match your search</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configSections.map(section => (
              <ConfigCard
                key={section.id}
                title={section.title}
                icon={section.icon}
                description={section.description}
              >
                {section.id === 'safety' ? (
                  <div className="flex flex-wrap gap-3">
                    {renderStatusChip('CORS', data.server.enable_cors)}
                    {renderStatusChip('Monitoring', data.monitoring.enabled)}
                    {renderStatusChip('Ticket Tracking', data.ticket_tracking.enabled)}
                    {renderStatusChip('Diagnostic Agent', data.diagnostic_agent.enabled)}
                    {renderStatusChip('Task Deduplication', data.task_deduplication.enabled)}
                  </div>
                ) : (
                  <KeyValueGrid items={section.items} />
                )}
              </ConfigCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Config;
