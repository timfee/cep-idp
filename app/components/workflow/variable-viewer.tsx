'use client';

import { useState } from 'react';
import { Card } from '../card';
import { Input } from '../input';
import { Label } from '../fieldset';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface VariableViewerProps {
  variables: Record<string, string>;
}

export function VariableViewer({ variables }: VariableViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState('');

  const filteredVars = Object.entries(variables).filter(([key]) =>
    key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Workflow Variables</h3>
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

      {expanded && (
        <>
          <Input
            type="search"
            placeholder="Filter variables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-4"
          />

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredVars.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key}</Label>
                <div className="font-mono text-sm bg-zinc-50 dark:bg-zinc-900 p-2 rounded break-all">
                  {value || <span className="text-zinc-400">undefined</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
