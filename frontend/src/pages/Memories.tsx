import React, { useEffect, useState, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, User, Clock, Search } from 'lucide-react';
import { apiService } from '@/services/api';
import { Memory } from '@/types';
import { useWebSocket } from '@/context/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';
import AgentDetailModal from '@/components/AgentDetailModal';
import ClickableAgentCard from '@/components/ClickableAgentCard';
import ClickableTaskCard from '@/components/ClickableTaskCard';
import TaskDetailModal from '@/components/TaskDetailModal';

const MemoryTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case 'error_fix':
        return '🔧';
      case 'discovery':
        return '💡';
      case 'decision':
        return '🎯';
      case 'learning':
        return '📚';
      case 'warning':
        return '⚠️';
      case 'codebase_knowledge':
        return '📝';
      default:
        return '💾';
    }
  };

  return <span className="text-xl">{getIcon()}</span>;
};

const MemoryItem: React.FC<{ memory: Memory; isNew?: boolean }> = ({ memory, isNew }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'error_fix':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'discovery':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'learning':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'decision':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-5 mb-3 cursor-pointer hover:shadow-lg transition-all ${
        isNew
          ? 'border-blue-400 dark:border-blue-600 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 shadow-sm'
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 text-2xl">
          <MemoryTypeIcon type={memory.memory_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <p className={`text-base leading-relaxed text-gray-900 dark:text-gray-100 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {memory.content}
              </p>
            </div>
            <span className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full border ${getTypeColors(memory.memory_type)}`}>
              {memory.memory_type.replace('_', ' ')}
            </span>
          </div>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-semibold mb-1">Type</p>
                  <p className="text-gray-900 dark:text-gray-100">{memory.memory_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-semibold mb-2">Agent</p>
                  <ClickableAgentCard
                    agentId={memory.agent_id}
                    onClick={() => setSelectedAgentId(memory.agent_id)}
                    compact
                  />
                </div>
                {memory.related_task_id && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-semibold mb-2">Related Task</p>
                    <ClickableTaskCard
                      taskId={memory.related_task_id}
                      onClick={() => setSelectedTaskId(memory.related_task_id)}
                      compact
                    />
                  </div>
                )}
                {memory.tags && memory.tags.length > 0 && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-semibold mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memory.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {memory.related_files && memory.related_files.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-gray-600 dark:text-gray-400 font-semibold mb-2">Related Files</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memory.related_files.map((file, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-xs font-mono border border-blue-200 dark:border-blue-800"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex items-center mt-3 space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center font-medium">
              <Clock className="w-4 h-4 mr-1.5" />
              {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAgentId(memory.agent_id);
              }}
              className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              <User className="w-4 h-4 mr-1.5" />
              Agent {memory.agent_id.substring(0, 8)}
            </button>
          </div>
        </div>
      </div>

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
    </motion.div>
  );
};

const Memories: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newMemoryIds, setNewMemoryIds] = useState<Set<string>>(new Set());
  const { subscribe } = useWebSocket();
  const observerTarget = useRef<HTMLDivElement>(null);

  const MEMORIES_PER_PAGE = 30;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['memories', filter, debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      apiService.getMemories(
        pageParam,
        MEMORIES_PER_PAGE,
        filter === 'all' ? undefined : filter,
        debouncedSearch || undefined
      ),
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer items than requested, we've reached the end
      if (lastPage.memories.length < MEMORIES_PER_PAGE) {
        return undefined;
      }
      return allPages.length * MEMORIES_PER_PAGE;
    },
    initialPageParam: 0,
    refetchInterval: 10000,
  });

  // Flatten all pages into a single array
  const memories = data?.pages.flatMap(page => page.memories) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;
  const typeCounts = data?.pages[0]?.type_counts ?? {};

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // Start loading 100px before reaching the target
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe('memory_added', (message) => {
      refetch();
      setNewMemoryIds(prev => new Set(prev).add(message.memory_id));
      setTimeout(() => {
        setNewMemoryIds(prev => {
          const next = new Set(prev);
          next.delete(message.memory_id);
          return next;
        });
      }, 3000);
    });

    return unsubscribe;
  }, [subscribe, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-600 dark:text-red-400 font-semibold">Failed to load memories</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Memories</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Shared knowledge base from all agents</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {['error_fix', 'discovery', 'decision', 'learning', 'warning', 'codebase_knowledge'].map(
            (type) => {
              const count = typeCounts[type] ?? 0;
              const getStatColors = (t: string) => {
                switch (t) {
                  case 'error_fix':
                    return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
                  case 'discovery':
                    return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
                  case 'learning':
                    return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
                  case 'warning':
                    return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
                  case 'decision':
                    return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
                  default:
                    return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
                }
              };
              return (
                <div key={type} className={`rounded-lg border p-4 text-center ${getStatColors(type)}`}>
                  <div className="text-2xl mb-1">
                    <MemoryTypeIcon type={type} />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {type.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
              );
            }
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-medium"
              >
                <option value="all">All Types</option>
                <option value="error_fix">🔧 Error Fix</option>
                <option value="discovery">💡 Discovery</option>
                <option value="decision">🎯 Decision</option>
                <option value="learning">📚 Learning</option>
                <option value="warning">⚠️ Warning</option>
                <option value="codebase_knowledge">📝 Codebase</option>
              </select>
            </div>
          </div>
        </div>

        {/* Memories List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {totalCount} {totalCount === 1 ? 'Memory' : 'Memories'}
            </h2>
          </div>

          {memories.length > 0 ? (
            <div>
              {memories.map((memory) => (
                <MemoryItem
                  key={memory.id}
                  memory={memory}
                  isNew={newMemoryIds.has(memory.id)}
                />
              ))}

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-4 flex items-center justify-center py-4">
                {isFetchingNextPage && (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
              <Database className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No memories found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Memories;