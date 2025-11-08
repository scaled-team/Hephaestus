import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Layers, Users, ListTodo, RefreshCw, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

interface Phase {
  id: string;
  order: number;
  name: string;
  description: string;
  active_agents: number;
  total_tasks: number;
  completed_tasks: number;
  active_tasks: number;
  pending_tasks: number;
}

interface WorkflowInfo {
  id: string | null;
  name: string;
  status: string;
  total_phases: number;
  phases: Phase[];
}

interface PhaseActivity {
  type: 'cross_phase_task' | 'task_completed' | 'agent_started' | 'agent_stopped';
  timestamp: string;
  from_phase?: number;
  to_phase?: number;
  agent_id?: string;
  task_id?: string;
  description: string;
}

export default function Phases() {
  const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
  const [activities, setActivities] = useState<PhaseActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseData, setPhaseData] = useState<{[key: string]: any}>({});
  const [loadingPhase, setLoadingPhase] = useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();
  const socket = useSocket();

  const fetchWorkflow = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/workflow');
      const data = await response.json();
      setWorkflow(data);
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();

    // Set up WebSocket listeners for real-time updates
    if (socket) {
      socket.on('phase_activity', (activity: PhaseActivity) => {
        setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
      });

      socket.on('phase_update', () => {
        fetchWorkflow(); // Refresh phase data
      });
    }

    return () => {
      if (socket) {
        socket.off('phase_activity');
        socket.off('phase_update');
      }
    };
  }, [socket]);

  const getPhaseColor = (order: number, total: number) => {
    const opacity = 0.3 + (0.7 * ((order - 1) / Math.max(total - 1, 1)));
    return `rgba(59, 130, 246, ${opacity})`;
  };

  const navigateToTasks = (phaseId: string) => {
    navigate(`/tasks?phase=${phaseId}`);
  };

  const fetchPhaseDetails = async (phaseId: string) => {
    if (phaseData[phaseId]) return; // Already loaded

    setLoadingPhase(prev => ({ ...prev, [phaseId]: true }));
    try {
      const response = await fetch(`http://localhost:8000/api/phases/${phaseId}/yaml`);
      const data = await response.json();
      setPhaseData(prev => ({ ...prev, [phaseId]: data }));
    } catch (error) {
      console.error('Failed to fetch phase details:', error);
      setPhaseData(prev => ({ ...prev, [phaseId]: { error: 'Failed to load phase details' } }));
    } finally {
      setLoadingPhase(prev => ({ ...prev, [phaseId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading workflow...</div>
      </div>
    );
  }

  if (!workflow || workflow.total_phases === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Layers className="h-16 w-16 text-gray-400 dark:text-gray-600" />
        <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">No workflow loaded</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Start by loading a workflow with phases</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {workflow.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {workflow.total_phases} phases • {workflow.status}
              </p>
            </div>
          </div>
          <Button onClick={fetchWorkflow} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900">

        {/* Active Phase Distribution */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Active Phase Distribution</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Current activity across all phases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-16 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="absolute inset-0 flex">
                {workflow.phases.map((phase) => {
                  const width = `${100 / workflow.total_phases}%`;
                  const isActive = phase.active_agents > 0;
                  return (
                    <div
                      key={phase.id}
                      className="relative flex-1 border-r border-gray-300 dark:border-gray-600 last:border-r-0"
                      style={{
                        backgroundColor: isActive ? getPhaseColor(phase.order, workflow.total_phases) : 'transparent',
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn(
                          "font-bold text-sm drop-shadow-sm",
                          isActive ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          P{phase.order}
                        </span>
                        <span className={cn(
                          "text-xs font-semibold drop-shadow-sm",
                          isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {phase.active_agents}/{phase.total_tasks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Active agents / Total tasks</span>
            </div>
          </CardContent>
        </Card>

        {/* Phase Cards */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Phases</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Detailed view of each phase</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
              <div className="flex gap-4 pb-4">
                {workflow.phases.map((phase) => (
                  <Card
                    key={phase.id}
                    className="w-[320px] flex-shrink-0 bg-white dark:bg-gray-800 border-2 hover:shadow-lg transition-shadow"
                    style={{
                      borderColor: getPhaseColor(phase.order, workflow.total_phases),
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-bold text-sm px-3 py-1"
                            style={{
                              backgroundColor: getPhaseColor(phase.order, workflow.total_phases),
                              color: 'white',
                              borderColor: getPhaseColor(phase.order, workflow.total_phases),
                            }}
                          >
                            Phase {phase.order}
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => fetchPhaseDetails(phase.id)}
                              >
                                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                  Phase {phase.order}: {phase.name}
                                </DialogTitle>
                                <DialogDescription className="text-gray-600 dark:text-gray-400">
                                  Detailed phase configuration and requirements
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                {loadingPhase[phase.id] ? (
                                  <div className="flex items-center justify-center h-32">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Loading phase details...</div>
                                  </div>
                                ) : phaseData[phase.id]?.error ? (
                                  <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-md">
                                    {phaseData[phase.id].error}
                                  </div>
                                ) : phaseData[phase.id] ? (
                                  <ScrollArea className="h-[400px] w-full">
                                    <div className="space-y-6 pr-4">
                                      {/* Description */}
                                      <div>
                                        <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Description</h4>
                                        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                          {phaseData[phase.id].description}
                                        </p>
                                      </div>

                                      {/* Done Definitions */}
                                      <div>
                                        <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Done Definitions</h4>
                                        <ul className="space-y-3 bg-green-50 dark:bg-green-950 p-4 rounded-md border border-green-200 dark:border-green-800">
                                          {phaseData[phase.id].done_definitions?.map((def: string, index: number) => (
                                            <li key={index} className="flex items-start gap-3 text-base">
                                              <span className="text-green-600 dark:text-green-400 mt-0.5 font-bold text-lg">✓</span>
                                              <span className="text-gray-800 dark:text-gray-200 leading-relaxed">{def}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>

                                      {/* Additional Notes */}
                                      <div>
                                        <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Additional Notes</h4>
                                        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                                          {phaseData[phase.id].additional_notes}
                                        </p>
                                      </div>

                                      {/* Expected Outputs */}
                                      <div>
                                        <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Expected Outputs</h4>
                                        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                          {phaseData[phase.id].outputs}
                                        </p>
                                      </div>

                                      {/* Next Steps */}
                                      <div>
                                        <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Next Steps</h4>
                                        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-purple-50 dark:bg-purple-950 p-4 rounded-md border border-purple-200 dark:border-purple-800">
                                          {phaseData[phase.id].next_steps}
                                        </p>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                ) : (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                                    Click the eye icon to load phase details...
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {phase.active_agents > 0 && (
                          <Badge variant="default" className="bg-green-600 dark:bg-green-700 text-white border-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold mt-2 text-gray-900 dark:text-white leading-tight">
                        {phase.name}
                      </CardTitle>
                      <CardDescription className="text-sm line-clamp-2 text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                        {phase.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-base text-gray-900 dark:text-white">
                            <strong className="font-bold text-lg">{phase.active_agents}</strong>
                            <span className="text-gray-600 dark:text-gray-400 ml-1">active agents</span>
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <ListTodo className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                          <div className="text-base space-y-1.5">
                            <div className="text-gray-900 dark:text-white">
                              Total: <strong className="font-bold text-lg">{phase.total_tasks}</strong>
                            </div>
                            <div className="text-green-700 dark:text-green-300">
                              Done: <strong className="font-bold text-lg text-green-600 dark:text-green-400">{phase.completed_tasks}</strong>
                            </div>
                            <div className="text-blue-700 dark:text-blue-300">
                              Active: <strong className="font-bold text-lg text-blue-600 dark:text-blue-400">{phase.active_tasks}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigateToTasks(phase.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        View Tasks
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Live Activity Feed</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Real-time phase activities from Hephaestus</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
              {activities.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-400 py-12">
                  <div className="text-base font-semibold">No activities yet</div>
                  <div className="text-sm mt-1">Activities will appear here as agents work</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <div
                      key={`${activity.timestamp}-${index}`}
                      className={cn(
                        "flex items-start gap-3 py-3 px-4 rounded-md bg-white dark:bg-gray-800",
                        "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700",
                        activity.type === 'cross_phase_task' && "border-l-4 border-l-blue-500 dark:border-l-blue-400"
                      )}
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono mt-0.5 font-semibold">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1 text-base text-gray-900 dark:text-gray-100">
                        {activity.type === 'cross_phase_task' && (
                          <>
                            <span className="font-semibold text-gray-900 dark:text-white">Agent {activity.agent_id?.slice(0, 8)}</span>
                            <span className="text-gray-600 dark:text-gray-400"> (P{activity.from_phase}) → task in </span>
                            <span className="font-semibold text-gray-900 dark:text-white">P{activity.to_phase}</span>
                          </>
                        )}
                        {activity.type === 'task_completed' && (
                          <>
                            <span className="text-green-600 dark:text-green-400 font-semibold">Task completed</span>
                            <span className="text-gray-600 dark:text-gray-400"> in P{activity.to_phase}</span>
                          </>
                        )}
                        {activity.type === 'agent_started' && (
                          <>
                            <span className="font-semibold text-gray-900 dark:text-white">Agent {activity.agent_id?.slice(0, 8)}</span>
                            <span className="text-gray-600 dark:text-gray-400"> started in </span>
                            <span className="font-semibold text-gray-900 dark:text-white">P{activity.to_phase}</span>
                          </>
                        )}
                        {activity.type === 'agent_stopped' && (
                          <>
                            <span className="font-semibold text-gray-900 dark:text-white">Agent {activity.agent_id?.slice(0, 8)}</span>
                            <span className="text-gray-600 dark:text-gray-400"> stopped in </span>
                            <span className="font-semibold text-gray-900 dark:text-white">P{activity.from_phase}</span>
                          </>
                        )}
                        {activity.description && (
                          <span className="text-gray-600 dark:text-gray-400 ml-1">• {activity.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}