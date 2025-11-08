import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, User, Bot, Clock, ChevronRight, Copy, Link2, Search, Ban, AlertTriangle } from 'lucide-react';
import { apiService } from '@/services/api';
import { Task } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { PhaseBadge } from '@/components/PhaseBadge';
import TaskDetailModal from '@/components/TaskDetailModal';
import QueueSection from '@/components/QueueSection';
import { useWebSocket } from '@/context/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';
import TaskFilterBar, { TaskFilters } from '@/components/TaskFilterBar';
import { useDebounce } from '@/hooks/useDebounce';
import BlockedTasksView from '@/components/BlockedTasksView';

const TaskRow: React.FC<{
  task: Task;
  isNew?: boolean;
  onViewDetails?: (taskId: string) => void;
}> = ({ task, isNew, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={isNew ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
        isNew ? 'bg-blue-50 dark:bg-blue-950' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <div
        className="px-6 py-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <ChevronRight
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <p className="text-base font-medium text-gray-900 dark:text-gray-100 line-clamp-1 flex-1 min-w-0">
                  {task.description}
                </p>
                {task.status === 'duplicated' && task.duplicate_of_task_id && (
                  <span className="flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium whitespace-nowrap flex-shrink-0">
                    <Copy className="w-4 h-4 mr-1.5" />
                    Duplicate of {task.duplicate_of_task_id.substring(0, 8)}
                    {task.similarity_score && (
                      <span className="ml-1 text-purple-500 dark:text-purple-300">
                        ({Math.round(task.similarity_score * 100)}% match)
                      </span>
                    )}
                  </span>
                )}
                {task.related_task_ids && task.related_task_ids.length > 0 && (
                  <span className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium whitespace-nowrap flex-shrink-0">
                    <Link2 className="w-4 h-4 mr-1.5" />
                    {task.related_task_ids.length} related
                  </span>
                )}
              </div>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center font-medium">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </span>
                {task.created_by_agent_id && (
                  <span className="flex items-center font-medium">
                    <User className="w-4 h-4 mr-1.5" />
                    Agent {task.created_by_agent_id.substring(0, 8)}
                  </span>
                )}
                {task.assigned_agent_id && (
                  <span className="flex items-center font-medium">
                    <Bot className="w-4 h-4 mr-1.5" />
                    {task.assigned_agent_id.substring(0, 8)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            {task.phase_order && task.phase_name && (
              <PhaseBadge
                phaseOrder={task.phase_order}
                phaseName={task.phase_name}
                totalPhases={5} // This should come from workflow data in real app
              />
            )}
            <StatusBadge status={task.status} />
            <span
              className={`text-sm px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap border ${
                task.priority === 'high'
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  : task.priority === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
              }`}
            >
              {task.priority}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(task.id);
              }}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center whitespace-nowrap flex-shrink-0 shadow-sm"
              title="View full task details"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Details
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 pb-5 overflow-hidden"
          >
            <div className="pl-9 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Task ID</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{task.id}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Completion Criteria</p>
                  <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">{task.done_definition}</p>
                </div>
                {task.started_at && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Started At</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {formatDistanceToNow(new Date(task.started_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                {task.completed_at && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Completed At</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({
    searchText: '',
    status: 'all',
    phase: 'all',
    priority: 'all',
    assignment: 'all',
    dateRange: 'all',
  });
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  // Debounce search text for performance
  const debouncedSearchText = useDebounce(filters.searchText, 300);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks(0, 10000),
    refetchInterval: 10000,
  });

  const { data: blockedTasks } = useQuery({
    queryKey: ['blocked-tasks'],
    queryFn: apiService.getBlockedTasks,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data) {
      setTasks(data);
    }
  }, [data]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribeCreated = subscribe('task_created', (message) => {
      refetch();
      setNewTaskIds(prev => new Set(prev).add(message.task_id));
      setTimeout(() => {
        setNewTaskIds(prev => {
          const next = new Set(prev);
          next.delete(message.task_id);
          return next;
        });
      }, 3000);
    });

    const unsubscribeCompleted = subscribe('task_completed', (message) => {
      setTasks(prev =>
        prev.map(task =>
          task.id === message.task_id
            ? { ...task, status: message.status as any }
            : task
        )
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeCompleted();
    };
  }, [subscribe, refetch]);

  // Comprehensive filtering logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Text search filter (debounced)
      if (debouncedSearchText) {
        const searchLower = debouncedSearchText.toLowerCase();
        const matchesDescription = task.description.toLowerCase().includes(searchLower);
        const matchesId = task.id.toLowerCase().includes(searchLower);
        const matchesAgentId = task.assigned_agent_id?.toLowerCase().includes(searchLower);
        const matchesCreatorId = task.created_by_agent_id?.toLowerCase().includes(searchLower);
        const matchesDoneDefinition = task.done_definition?.toLowerCase().includes(searchLower);

        if (!matchesDescription && !matchesId && !matchesAgentId && !matchesCreatorId && !matchesDoneDefinition) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // Phase filter
      if (filters.phase !== 'all') {
        if (filters.phase === 'no-phase' && task.phase_name) {
          return false;
        }
        if (filters.phase !== 'no-phase' && task.phase_name !== filters.phase) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Assignment filter
      if (filters.assignment !== 'all') {
        if (filters.assignment === 'assigned' && !task.assigned_agent_id) {
          return false;
        }
        if (filters.assignment === 'unassigned' && task.assigned_agent_id) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const taskDate = new Date(task.created_at);
        const now = new Date();

        switch (filters.dateRange) {
          case 'last-hour':
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (taskDate < hourAgo) return false;
            break;
          case 'today':
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (taskDate < todayStart) return false;
            break;
          case 'this-week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (taskDate < weekAgo) return false;
            break;
          case 'this-month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            if (taskDate < monthStart) return false;
            break;
        }
      }

      return true;
    });
  }, [tasks, debouncedSearchText, filters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-600 dark:text-red-200">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tasks</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">All system tasks and their status</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto px-6 space-y-6 bg-gray-50 dark:bg-gray-900">
        {/* Queue Section */}
        <QueueSection
          onViewTaskDetails={(taskId) => setSelectedTaskId(taskId)}
          onRefreshTasks={refetch}
        />

        {/* Blocked Tasks Section */}
        {blockedTasks && blockedTasks.length > 0 && (
          <BlockedTasksView />
        )}

        {/* New Filter Bar */}
        <TaskFilterBar
          tasks={tasks}
          filters={filters}
          onFiltersChange={setFilters}
          filteredCount={filteredTasks.length}
        />

        {/* Tasks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Tasks
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 font-medium">
                  {filteredTasks.length === tasks.length ? (
                    `${tasks.length} total tasks`
                  ) : (
                    `${filteredTasks.length} of ${tasks.length} tasks shown`
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 dark:text-green-300 font-semibold">Live Updates</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isNew={newTaskIds.has(task.id)}
                  onViewDetails={(taskId) => setSelectedTaskId(taskId)}
                />
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No tasks found</h3>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
                  {tasks.length === 0
                    ? "There are no tasks in the system yet."
                    : "Try adjusting your filters or search criteria."}
                </p>
                {tasks.length > 0 && (
                  <button
                    onClick={() => setFilters({
                      searchText: '',
                      status: 'all',
                      phase: 'all',
                      priority: 'all',
                      assignment: 'all',
                      dateRange: 'all',
                    })}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onNavigateToTask={(taskId) => setSelectedTaskId(taskId)}
      />
    </div>
  );
};

export default Tasks;