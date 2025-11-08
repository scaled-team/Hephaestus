import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusColor = () => {
    const normalized = status.toLowerCase();

    if (
      [
        'done',
        'completed',
        'healthy',
        'validated',
        'verified',
      ].includes(normalized)
    ) {
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    }

    if (
      [
        'in_progress',
        'working',
        'assigned',
        'running',
      ].includes(normalized)
    ) {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    }

    if (
      [
        'pending',
        'idle',
        'pending_validation',
        'unverified',
      ].includes(normalized)
    ) {
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    }

    if (
      [
        'failed',
        'error',
        'terminated',
        'rejected',
        'disputed',
      ].includes(normalized)
    ) {
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    }

    if (
      ['stuck', 'warning', 'attention'].includes(normalized)
    ) {
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    }

    if (normalized === 'blocked') {
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700';
    }

    if (normalized === 'duplicated') {
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    }

    if (normalized === 'queued') {
      return 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200';
    }

    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        getStatusColor(),
        sizeClasses[size]
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
