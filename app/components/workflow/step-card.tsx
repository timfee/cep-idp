'use client';

import { useState } from 'react';
import { Card } from '../card';
import { Button } from '../button';
import { Badge } from '../badge';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Step, StepStatus } from '@/app/lib/workflow/types';
import clsx from 'clsx';

interface StepCardProps {
  step: Step;
  status: StepStatus;
  canExecute: boolean;
  isAuthValid: boolean;
  onExecute: () => void;
  onSkip: () => void;
}

export function StepCard({
  step,
  status,
  canExecute,
  isAuthValid,
  onExecute,
  onSkip,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    pending: <ClockIcon className="h-5 w-5 text-zinc-400" />,
    running: <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />,
    completed: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
    failed: <XCircleIcon className="h-5 w-5 text-red-500" />,
    skipped: <CheckCircleIcon className="h-5 w-5 text-zinc-400" />,
  }[status.status];


  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {statusIcon}
          <div>
            <h3 className="font-medium">{step.name}</h3>
            {step.apiStatus && (
              <Badge color="amber" className="mt-1">
                {step.apiStatus}
              </Badge>
            )}
            {step.depends_on && step.depends_on.length > 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Depends on: {step.depends_on.join(', ')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status.status === 'pending' && canExecute && isAuthValid && (
            <>
              <Button onClick={onExecute}>
                Execute
              </Button>
              <Button onClick={onSkip} plain>
                Skip
              </Button>
            </>
          )}
          
            {status.status === 'failed' && (
              <Button onClick={onExecute} color="red">
                Retry
              </Button>
            )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            {expanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {status.error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{status.error}</p>
          </div>
        </div>
      )}

      {expanded && status.logs.length > 0 && (
        <div className="mt-4 space-y-1">
          <h4 className="text-sm font-medium mb-2">Execution Logs</h4>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
            {status.logs.map((log, i) => (
              <div
                key={i}
                className={clsx(
                  'flex gap-2',
                  log.level === 'error' && 'text-red-600 dark:text-red-400',
                  log.level === 'warn' && 'text-amber-600 dark:text-amber-400'
                )}
              >
                <span className="text-zinc-500 dark:text-zinc-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
