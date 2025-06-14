"use client";
import "client-only";

import { cn, hasOwnProperty } from "@/app/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  Database,
  FileText,
  Key,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

interface VariableViewerProps {
  variables: Record<string, string>;
  definitions?: Record<
    string,
    {
      default?: string;
      generator?: string;
      validator?: string | RegExp;
    }
  >;
  requiredVariables?: Set<string>;
}

export function VariableViewer({
  variables,
  definitions = {},
  requiredVariables = new Set(),
}: VariableViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [showUndefined, setShowUndefined] = useState(false);

  // Categorize variables
  const definedVars: Array<[string, string]> = [];
  const undefinedVars: string[] = [];

  // Check all variables from definitions
  const allVarNames = new Set([
    ...Object.keys(variables),
    ...Object.keys(definitions),
  ]);

  allVarNames.forEach((key) => {
    if (hasOwnProperty(variables, key)) {
      definedVars.push([key, variables[key]]);
    } else if (hasOwnProperty(definitions, key)) {
      undefinedVars.push(key);
    }
  });

  // Sort by required first, then alphabetically
  definedVars.sort((a, b) => {
    const aRequired = requiredVariables.has(a[0]);
    const bRequired = requiredVariables.has(b[0]);
    if (aRequired && !bRequired) return -1;
    if (!aRequired && bRequired) return 1;
    return a[0].localeCompare(b[0]);
  });

  const getVariableIcon = (key: string) => {
    const def = definitions[key];
    if (!def) return <Database className="h-3 w-3" />;

    if (def.generator) return <Sparkles className="h-3 w-3" />;
    if (def.default) return <FileText className="h-3 w-3" />;
    if (def.validator) return <Key className="h-3 w-3" />;
    return <Database className="h-3 w-3" />;
  };

  const getVariableSource = (key: string) => {
    const def = definitions[key];
    if (!def) return "extracted";

    if (def.generator) return "generated";
    if (def.default) return "default";
    return "dynamic";
  };

  const getVariableDescription = (def?: {
    default?: string;
    generator?: string;
  }): string => {
    if (def?.generator) return "Will be generated";
    if (def?.default) return `Default: ${def.default}`;
    return "Will be set by workflow";
  };

  return (
    <Card className="sticky top-4">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Workflow Variables</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
            {expanded ?
              <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        </div>

        {expanded && (
          <>
            <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{definedVars.length} defined</span>
              {undefinedVars.length > 0 && (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span>{undefinedVars.length} pending</span>
                </>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Defined variables */}
              {definedVars.map(([key, value]) => {
                const isRequired = requiredVariables.has(key);
                const source = getVariableSource(key);

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getVariableIcon(key)}
                        <span className="text-xs font-medium truncate">
                          {key}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isRequired && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0">
                            required
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1 py-0",
                            source === "generated"
                              && "border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300",
                            source === "default"
                              && "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300",
                            source === "extracted"
                              && "border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
                          )}>
                          {source}
                        </Badge>
                      </div>
                    </div>
                    <div className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900 p-2 rounded break-all">
                      {value}
                    </div>
                  </div>
                );
              })}

              {/* Undefined variables (if any) */}
              {undefinedVars.length > 0 && (
                <>
                  {definedVars.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <button
                        onClick={() => setShowUndefined(!showUndefined)}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                        {showUndefined ?
                          <ChevronUpIcon className="h-3 w-3" />
                        : <ChevronDownIcon className="h-3 w-3" />}
                        <span>Pending variables ({undefinedVars.length})</span>
                      </button>
                    </div>
                  )}

                  {(showUndefined || definedVars.length === 0) && (
                    <div className="space-y-2 mt-2">
                      {undefinedVars.map((key) => {
                        const def = definitions[key];
                        const isRequired = requiredVariables.has(key);

                        return (
                          <div key={key} className="space-y-1 opacity-60">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {getVariableIcon(key)}
                                <span className="text-xs font-medium truncate">
                                  {key}
                                </span>
                              </div>
                              {isRequired && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0">
                                  required
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                              <span className="text-zinc-400 italic">
                                {getVariableDescription(def)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {definedVars.length === 0 && undefinedVars.length === 0 && (
                <div className="text-xs text-zinc-400 text-center py-4">
                  No variables defined yet
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
