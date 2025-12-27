"use client";

import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef(({ className, checked, ...props }, ref) => {
  const isChecked = Boolean(checked);
  return (
    <span className="inline-flex items-center relative">
      <input ref={ref} type="checkbox" checked={checked} className="sr-only" {...props} />
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-md border bg-black/40 text-sky-400 transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-sky-400/60',
          isChecked ? 'border-sky-400/60 bg-sky-600/30' : 'border-white/20',
          className,
        )}
      >
        <Check
          className={cn(
            'h-3 w-3 text-white transition-opacity',
            isChecked ? 'opacity-100' : 'opacity-0',
          )}
        />
      </span>
    </span>
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
