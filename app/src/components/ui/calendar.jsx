import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

import { cn } from '../../lib/utils';

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) => (
  <DayPicker
    showOutsideDays={showOutsideDays}
    className={cn('p-3', className)}
    classNames={{
      months: 'relative flex flex-col space-y-3',
      month: 'space-y-3',
      month_caption: 'relative flex items-center justify-center px-1',
      dropdowns: 'flex items-center gap-2',
      dropdown_root: 'relative inline-flex items-center',
      dropdown: 'absolute inset-0 h-full w-full cursor-pointer opacity-0',
      months_dropdown: 'min-w-[96px]',
      years_dropdown: 'min-w-[76px]',
      caption_label: 'inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-sm text-white/90 shadow-sm',
      nav: 'absolute left-1 right-1 top-1 flex items-center justify-between pointer-events-none',
      button_previous: 'h-7 w-7 rounded-md bg-white/5 text-white/70 hover:bg-white/10 hover:text-white pointer-events-auto inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50',
      button_next: 'h-7 w-7 rounded-md bg-white/5 text-white/70 hover:bg-white/10 hover:text-white pointer-events-auto inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50',
      chevron: 'h-4 w-4 text-white/70',
      month_grid: 'w-full table-fixed border-collapse border-separate border-spacing-1',
      weekdays: '',
      weekday: 'w-9 text-center text-[0.7rem] font-medium text-gray-400',
      weeks: '',
      week: '',
      day: 'h-9 w-9 p-0 text-center text-sm text-gray-200',
      day_button: 'h-9 w-9 rounded-md p-0 font-normal text-inherit flex items-center justify-center hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/40',
      selected: 'rounded-md bg-emerald-600 text-white',
      today: 'rounded-md bg-white/10 text-white',
      outside: 'text-gray-500/70',
      disabled: 'text-gray-600/60',
      range_middle: 'aria-selected:bg-white/10 aria-selected:text-white',
      hidden: 'invisible',
      ...classNames,
    }}
    components={{
      Chevron: ({ className: iconClassName, orientation }) => {
        const classes = cn('h-4 w-4', iconClassName);
        if (orientation === 'left') return <ChevronLeft className={classes} />;
        if (orientation === 'right') return <ChevronRight className={classes} />;
        if (orientation === 'up') return <ChevronUp className={classes} />;
        return <ChevronDown className={classes} />;
      },
    }}
    {...props}
  />
);
Calendar.displayName = 'Calendar';

export { Calendar };
