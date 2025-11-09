import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, CheckCircle, XCircle, RefreshCw, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import ClickableAgentCard from '@/components/ClickableAgentCard';
import AgentDetailModal from '@/components/AgentDetailModal';
import { OVERVIEW_CARD, OVERVIEW_SURFACE } from './styles';

interface SteeringEvent {
  id: string;
  agent_id: string;
  guardian_analysis_id?: string;
  timestamp: string;
  steering_type: string;
  message: string;
  was_successful?: boolean;
  alignment_score?: number;
  current_phase?: string;
  trajectory_summary?: string;
  alignment_issues?: string[];
}

interface SteeringEventsCardProps {
  events: SteeringEvent[];
}

const getSteeringTypeIcon = (type: string) => {
  const baseType = type?.toLowerCase() || '';

  // New Guardian nudging types
  if (baseType.includes('nudge')) {
    if (baseType.includes('urgent')) return XCircle;
    if (baseType.includes('direct')) return Navigation;
    if (baseType.includes('gentle')) return CheckCircle;
    return Target;
  }

  // Legacy types
  switch (baseType) {
    case 'focus_redirect':
    case 'redirect':
      return RefreshCw;
    case 'correction':
    case 'course_correction':
      return Navigation;
    default:
      return Target;
  }
};

const getSteeringTypeBadge = (type: string) => {
  const baseType = type?.toLowerCase() || 'unknown';

  // New Guardian nudging types
  if (baseType.includes('nudge')) {
    if (baseType.includes('nudge_urgent'))
      return { label: 'Urgent Intervention', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200' };
    if (baseType.includes('nudge_direct'))
      return { label: 'Direct Guidance', className: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200' };
    if (baseType.includes('nudge_gentle') || baseType === 'nudge')
      return { label: 'Gentle Nudge', className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' };
  }

  // Legacy types
  switch (baseType) {
    case 'focus_redirect':
    case 'redirect':
      return { label: 'Focus Redirect', className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' };
    case 'correction':
    case 'course_correction':
      return { label: 'Course Correction', className: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200' };
    case 'stuck':
      return { label: 'Unstuck', className: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200' };
    case 'constraint_violation':
      return { label: 'Constraint Fix', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200' };
    default:
      return { label: type || 'Steering', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' };
  }
};

export default function SteeringEventsCard({ events }: SteeringEventsCardProps) {
  const navigate = useNavigate();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  if (!events || events.length === 0) {
    return (
      <Card className={cn(OVERVIEW_CARD)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Recent Steering Events
          </CardTitle>
          <CardDescription>
            Agent trajectory interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            <Navigation className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-sm">No steering events recently</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agents are on track</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(OVERVIEW_CARD)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Recent Steering Events
        </CardTitle>
        <CardDescription>
          Agent trajectory interventions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {events.map((event) => {
              const TypeIcon = getSteeringTypeIcon(event.steering_type);
              const typeBadge = getSteeringTypeBadge(event.steering_type);

              return (
                <div
                  key={event.id}
                  className={cn(
                    OVERVIEW_SURFACE,
                    "p-3 transition-colors",
                    event.was_successful === false && "border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <TypeIcon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    {event.was_successful !== undefined && (
                      event.was_successful ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" title="Successful" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" title="Failed" />
                      )
                    )}
                  </div>

                  <div className="mb-2">
                    <ClickableAgentCard
                      agentId={event.agent_id}
                      onClick={() => setSelectedAgentId(event.agent_id)}
                      compact
                      showTaskInfo={false}
                    />
                  </div>

                  <div className="flex items-end justify-end mb-2">
                    <Badge variant="outline" className={cn("text-xs", typeBadge.className)}>
                      {typeBadge.label}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {event.message}
                  </div>

                  {event.trajectory_summary && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 leading-relaxed line-clamp-2">
                      {event.trajectory_summary}
                    </div>
                  )}

                  {(event.alignment_score !== undefined && event.alignment_score !== null) ||
                  event.current_phase ||
                  (event.alignment_issues && event.alignment_issues.length > 0) ? (
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                      {event.alignment_score !== undefined && event.alignment_score !== null && (
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          Alignment: {Math.round(event.alignment_score * 100)}%
                        </span>
                      )}
                      {event.current_phase && (
                        <span className="uppercase tracking-wide">
                          Phase: {event.current_phase.replace(/_/g, ' ')}
                        </span>
                      )}
                      {event.alignment_issues && event.alignment_issues.length > 0 && (
                        <span className="italic line-clamp-1">
                          Issue: {event.alignment_issues[0]}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
      <AgentDetailModal
        agentId={selectedAgentId}
        onClose={() => setSelectedAgentId(null)}
        onViewOutput={(agentId) => {
          navigate('/observability', { state: { focusAgentId: agentId } });
        }}
      />
    </Card>
  );
}
