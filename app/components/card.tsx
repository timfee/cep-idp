'use client';

import clsx from 'clsx';
import React from 'react';

export function Card({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        'rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
        className
      )}
    />
  );
}
