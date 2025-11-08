import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Server, FolderKanban, GitBranch, Cpu, Users2, Activity, Database, RefreshCw, ShieldCheck } from 'lucide-react';
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

const KeyValueGrid: React.FC<{ items: Array<{ label: string; value: React.ReactNode }> }> = ({ items }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
    {items.map(({ label, value }) => (
      <div key={label}>
        <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{value ?? '—'}</dd>
      </div>
    ))}
  </dl>
);

const Config: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: apiService.getSystemConfig,
    staleTime: 60_000,
  });

  const renderStatusChip = (label: string, active: boolean) => (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Infrastructure</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">System Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live snapshot from hephaestus_config.yaml with environment overrides applied.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {renderStatusChip('Monitoring', Boolean(data.monitoring?.enabled))}
          {renderStatusChip('Ticket Tracking', Boolean(data.ticket_tracking?.enabled))}
          {renderStatusChip('Diagnostic Agent', Boolean(data.diagnostic_agent?.enabled))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConfigCard
          title="Server & Paths"
          icon={<Server className="w-5 h-5" />}
          description="Core MCP endpoint and storage locations."
        >
          <KeyValueGrid
            items={[
              { label: 'Host', value: data.server.host },
              { label: 'Port', value: data.server.port },
              { label: 'CORS Enabled', value: data.server.enable_cors ? 'Yes' : 'No' },
              { label: 'Database', value: data.paths.database },
              { label: 'Phases Folder', value: data.paths.phases_folder },
              { label: 'Worktree Base', value: data.paths.worktree_base },
              { label: 'Project Root', value: data.paths.project_root },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Git & Worktrees"
          icon={<GitBranch className="w-5 h-5" />}
          description="Repo synchronization strategy for spawned agents."
        >
          <KeyValueGrid
            items={[
              { label: 'Main Repository', value: data.git.main_repo_path },
              { label: 'Base Branch', value: data.git.base_branch },
              { label: 'Worktree Prefix', value: data.git.worktree_branch_prefix },
              { label: 'Auto Commit', value: data.git.auto_commit ? 'Enabled' : 'Disabled' },
              { label: 'Conflict Strategy', value: data.git.conflict_resolution },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="LLM Defaults"
          icon={<Cpu className="w-5 h-5" />}
          description="Provider and inference defaults for orchestration prompts."
        >
          <KeyValueGrid
            items={[
              { label: 'Provider', value: data.llm.provider },
              { label: 'Model', value: data.llm.model },
              { label: 'Temperature', value: data.llm.default_temperature },
              { label: 'Max Tokens', value: data.llm.default_max_tokens },
              { label: 'Embedding Model', value: data.llm.embedding_model },
              { label: 'OpenRouter Backend', value: data.llm.default_openrouter_provider },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Agent Runtime"
          icon={<Users2 className="w-5 h-5" />}
          description="Defaults applied to CLI agents and tmux orchestration."
        >
          <KeyValueGrid
            items={[
              { label: 'CLI Tool', value: data.agents.default_cli_tool },
              { label: 'CLI Model', value: data.agents.cli_model },
              { label: 'Tmux Prefix', value: data.agents.tmux_session_prefix },
              { label: 'Health Check Interval (s)', value: data.agents.health_check_interval },
              { label: 'Max Health Failures', value: data.agents.max_health_failures },
              { label: 'Termination Delay (s)', value: data.agents.termination_delay },
              { label: 'Max Concurrent Agents', value: data.agents.max_concurrent_agents },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Monitoring & Diagnostics"
          icon={<Activity className="w-5 h-5" />}
          description="Telemetry cadence and stuck-agent safeguards."
        >
          <KeyValueGrid
            items={[
              { label: 'Monitoring Enabled', value: data.monitoring.enabled ? 'Yes' : 'No' },
              { label: 'Interval (s)', value: data.monitoring.interval_seconds },
              { label: 'Stuck Agent Threshold (s)', value: data.monitoring.stuck_agent_threshold },
              { label: 'Guardian Min Agent Age (s)', value: data.monitoring.guardian_min_agent_age_seconds },
              { label: 'Log Level', value: data.monitoring.log_level },
              { label: 'Diagnostic Cooldown (s)', value: data.diagnostic_agent.cooldown_seconds },
              { label: 'Diagnostic Min Stuck Time (s)', value: data.diagnostic_agent.min_stuck_time_seconds },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Vector Store & Deduplication"
          icon={<Database className="w-5 h-5" />}
          description="Memory persistence and task similarity settings."
        >
          <KeyValueGrid
            items={[
              { label: 'Qdrant URL', value: data.vector_store.qdrant_url },
              { label: 'Collection Prefix', value: data.vector_store.collection_prefix },
              { label: 'Embedding Dimension', value: data.vector_store.embedding_dimension },
              { label: 'Dedup Enabled', value: data.task_deduplication.enabled ? 'Yes' : 'No' },
              { label: 'Similarity Threshold', value: data.task_deduplication.similarity_threshold },
              { label: 'Related Threshold', value: data.task_deduplication.related_threshold },
              { label: 'Batch Size', value: data.task_deduplication.batch_size },
              { label: 'Dedup Embedding Model', value: data.task_deduplication.embedding_model },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Ticket Tracking"
          icon={<FolderKanban className="w-5 h-5" />}
          description="Workflow-level governance for tickets and approvals."
        >
          <KeyValueGrid
            items={[
              { label: 'Enabled', value: data.ticket_tracking.enabled ? 'Yes' : 'No' },
              { label: 'Default Human Review', value: data.ticket_tracking.default_human_review ? 'Yes' : 'No' },
              { label: 'Approval Timeout (s)', value: data.ticket_tracking.default_approval_timeout },
            ]}
          />
        </ConfigCard>

        <ConfigCard
          title="Safety & Auth"
          icon={<ShieldCheck className="w-5 h-5" />}
          description="High-level status indicators."
        >
          <div className="flex flex-wrap gap-3">
            {renderStatusChip('CORS', data.server.enable_cors)}
            {renderStatusChip('Monitoring', data.monitoring.enabled)}
            {renderStatusChip('Ticket Tracking', data.ticket_tracking.enabled)}
            {renderStatusChip('Diagnostic Agent', data.diagnostic_agent.enabled)}
          </div>
        </ConfigCard>
      </div>
    </div>
  );
};

export default Config;
