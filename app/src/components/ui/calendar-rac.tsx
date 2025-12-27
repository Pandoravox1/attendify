"use client"

import { cn } from "@/lib/utils"
import { getLocalTimeZone, today } from "@internationalized/date"
import { ComponentProps } from "react"
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from "react-aria-components"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"

interface BaseCalendarProps {
  className?: string
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> &
  BaseCalendarProps

const CalendarHeader = () => (
  <header className="flex w-full items-center gap-1 pb-2 text-white">
    <Button
      slot="previous"
      className="flex size-9 items-center justify-center rounded-lg text-white/60 outline-offset-2 transition-colors hover:bg-white/10 hover:text-white focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-1 data-[focus-visible]:outline-sky-500/40"
    >
      <ChevronLeftIcon size={16} strokeWidth={2} />
    </Button>
    <HeadingRac className="grow text-center text-sm font-semibold text-white" />
    <Button
      slot="next"
      className="flex size-9 items-center justify-center rounded-lg text-white/60 outline-offset-2 transition-colors hover:bg-white/10 hover:text-white focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-1 data-[focus-visible]:outline-sky-500/40"
    >
      <ChevronRightIcon size={16} strokeWidth={2} />
    </Button>
  </header>
)

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone())

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-lg p-0 text-xs font-medium text-gray-400">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg border border-transparent p-0 text-sm font-normal text-gray-200 outline-offset-2 duration-150 [transition-property:color,background-color,border-radius,box-shadow] focus:outline-none data-[disabled]:pointer-events-none data-[unavailable]:pointer-events-none data-[focus-visible]:z-10 data-[hovered]:bg-white/10 data-[selected]:bg-sky-600 data-[selected]:text-white data-[unavailable]:line-through data-[disabled]:opacity-40 data-[unavailable]:opacity-40 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-sky-500/40",
              // Range-specific styles
              isRange &&
                "data-[selected]:rounded-none data-[selection-end]:rounded-e-lg data-[selection-start]:rounded-s-lg data-[invalid]:bg-red-500/20 data-[selected]:bg-white/10 data-[selected]:text-white data-[invalid]:data-[selection-end]:[&:not([data-hover])]:bg-red-500/40 data-[invalid]:data-[selection-start]:[&:not([data-hover])]:bg-red-500/40 data-[selection-end]:[&:not([data-hover])]:bg-sky-600 data-[selection-start]:[&:not([data-hover])]:bg-sky-600 data-[invalid]:data-[selection-end]:[&:not([data-hover])]:text-white data-[invalid]:data-[selection-start]:[&:not([data-hover])]:text-white data-[selection-end]:[&:not([data-hover])]:text-white data-[selection-start]:[&:not([data-hover])]:text-white",
              // Today indicator styles
              date.compare(now) === 0 &&
                cn(
                  "after:pointer-events-none after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-sky-400",
                  isRange
                    ? "data-[selection-end]:[&:not([data-hover])]:after:bg-white data-[selection-start]:[&:not([data-hover])]:after:bg-white"
                    : "data-[selected]:after:bg-white",
                ),
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  )
}

const Calendar = ({ className, ...props }: CalendarProps) => {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  )
}

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  )
}

export { Calendar, RangeCalendar }
