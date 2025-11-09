import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Compass,
  Target,
  Activity,
  Bot,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Layers,
  MessageSquare
} from 'lucide-react';
import { apiService } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/context/WebSocketContext';
import SystemHealthCard from '@/components/overview/SystemHealthCard';
import ConductorSummaryCard from '@/components/overview/ConductorSummaryCard';
import SteeringEventsCard from '@/components/overview/SteeringEventsCard';
import TrajectoryTimeline from '@/components/overview/TrajectoryTimeline';
import PhaseDistributionCard from '@/components/overview/PhaseDistributionCard';
import SystemMetricsGraphs from '@/components/overview/SystemMetricsGraphs';
import BroadcastMessageDialog from '@/components/BroadcastMessageDialog';
import AgentDetailModal from '@/components/AgentDetailModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { OVERVIEW_CARD, OVERVIEW_SURFACE } from '@/components/overview/styles';

export default function Overview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: systemData, isLoading, error, refetch } = useQuery({
    queryKey: ['system-overview'],
    queryFn: apiService.getSystemOverview,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    const unsubscribeGuardian = subscribe('guardian_analysis', () => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['system-overview'] });
    });

    const unsubscribeConductor = subscribe('conductor_analysis', () => {
      queryClient.invalidateQueries({ queryKey: ['system-overview'] });
    });

    const unsubscribeSteering = subscribe('steering_intervention', () => {
      queryClient.invalidateQueries({ queryKey: ['system-overview'] });
    });

    return () => {
      unsubscribeGuardian();
      unsubscribeConductor();
      unsubscribeSteering();
    };
  }, [subscribe, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading system overview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400">Error loading system overview</div>
      </div>
    );
  }

  // Count active agents
  const activeAgentCount = systemData?.agent_alignments?.filter((a: any) => a.agent_id).length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">System Overview</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time monitoring and trajectory analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {systemData?.timestamp && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatDistanceToNow(new Date(systemData.timestamp), { addSuffix: true })}
                </span>
              </div>
            )}
            {activeAgentCount > 0 && (
              <Button
                onClick={() => setShowBroadcastDialog(true)}
                variant="outline"
                size="sm"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:border-gray-600 font-medium"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Broadcast
              </Button>
            )}
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto px-6 space-y-6 bg-gray-50 dark:bg-gray-900">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="lg:col-span-1">
            <SystemHealthCard systemHealth={systemData?.system_health} />
          </div>

          {/* Phase Distribution */}
          <div className="lg:col-span-1 xl:col-span-2">
            <PhaseDistributionCard phases={systemData?.phase_distribution || []} />
          </div>

          {/* Conductor Summary - Full Width */}
          <div className="lg:col-span-2 xl:col-span-3">
            <ConductorSummaryCard analysis={systemData?.latest_conductor_analysis} />
          </div>

          {/* Recent Steering Events */}
          <div className="lg:col-span-1">
            <SteeringEventsCard events={systemData?.recent_steering_events || []} />
          </div>

          {/* Trajectory Timeline */}
          <div className="lg:col-span-1 xl:col-span-2">
            <TrajectoryTimeline alignments={systemData?.agent_alignments || []} />
          </div>
        </div>

        {/* System Metrics Graphs */}
        {systemData?.metrics_history && systemData.metrics_history.length > 0 && (
          <div>
            <SystemMetricsGraphs
              metricsHistory={systemData.metrics_history}
              phases={systemData?.phase_distribution?.map((p: any) => p.name) || []}
            />
          </div>
        )}

        {/* Agent Alignment Details */}
        {systemData?.agent_alignments && systemData.agent_alignments.length > 0 && (
          <Card className={cn(OVERVIEW_CARD)}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-bold dark:text-white">
                <Bot className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-300" />
                Agent Trajectory Status
              </CardTitle>
              <CardDescription className="text-sm dark:text-gray-300">
                Individual agent alignment and steering needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemData.agent_alignments.map((agent: any) => {
                  const alignmentPercent = Math.round((agent.alignment_score || 0) * 100);
                  return (
                    <button
                      key={agent.agent_id}
                      onClick={() => setSelectedAgentId(agent.agent_id)}
                      className={cn(
                        OVERVIEW_SURFACE,
                        "p-4 text-left transition-all hover:shadow-2xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                        agent.needs_steering
                          ? "border-yellow-400/80 dark:border-yellow-600/70 bg-yellow-50/90 dark:bg-yellow-900/30"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-mono text-sm text-gray-600 dark:text-gray-400 font-medium">{agent.agent_id.substring(0, 8)}</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">Click to view details</p>
                          </div>
                        </div>
                        {agent.needs_steering && (
                          <Badge variant="outline" className="bg-yellow-100/70 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 flex-shrink-0 font-semibold">
                            Needs Steering
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Alignment</span>
                          <span className={cn(
                            "text-base font-bold",
                            alignmentPercent > 80 ? "text-green-600 dark:text-green-400" :
                            alignmentPercent > 40 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          )}>
                            {alignmentPercent}%
                          </span>
                        </div>
                        <Progress
                          value={alignmentPercent}
                          className={cn(
                            "h-2.5 bg-gray-100/70 dark:bg-white/10",
                            alignmentPercent > 80 ? "[&>div]:bg-green-500 dark:[&>div]:bg-green-400" :
                            alignmentPercent > 40 ? "[&>div]:bg-yellow-500 dark:[&>div]:bg-yellow-400" :
                            "[&>div]:bg-red-500 dark:[&>div]:bg-red-400"
                          )}
                        />
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Phase: <span className="text-gray-900 dark:text-white">{agent.current_phase || 'Unknown'}</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          Updated {formatDistanceToNow(new Date(agent.last_update), { addSuffix: true })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast Message Dialog */}
      <BroadcastMessageDialog
        open={showBroadcastDialog}
        onClose={() => setShowBroadcastDialog(false)}
        activeAgentCount={activeAgentCount}
      />

      {/* Modals */}
      <AgentDetailModal
        agentId={selectedAgentId}
        onClose={() => setSelectedAgentId(null)}
        onNavigateToTask={(taskId) => {
          setSelectedAgentId(null);
          setSelectedTaskId(taskId);
        }}
        onViewOutput={(agentId) => {
          navigate('/observability', { state: { focusAgentId: agentId } });
        }}
      />
      <TaskDetailModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onNavigateToTask={(taskId) => setSelectedTaskId(taskId)}
      />
    </div>
  );
}
