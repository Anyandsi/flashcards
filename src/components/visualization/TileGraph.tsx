import type { ReactNode } from 'react';

export type TileGraphValueMap = Record<string, number>;

type TileGraphProps = {
  formatValue?: (value: number | undefined) => string;
  headerControl?: ReactNode;
  valuesByDate: TileGraphValueMap;
  year: number;
};

const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const levelClasses = [
  'bg-secondary/60',
  'bg-[#334a6f]',
  'bg-[#3f6f9f]',
  'bg-[#5796c7]',
  'bg-[#8be9fd]',
];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getGraphDates(year: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfYear = new Date(year, 0, 1);
  const lastDayOfYear = new Date(year, 11, 31);
  const lastVisibleDay = lastDayOfYear > today ? today : lastDayOfYear;

  if (firstDayOfYear > today) {
    return [];
  }

  const leadingEmptyDays = firstDayOfYear.getDay();
  const dates: Array<Date | null> = Array.from({ length: leadingEmptyDays }, () => null);

  for (let date = firstDayOfYear; date <= lastVisibleDay; date = addDays(date, 1)) {
    dates.push(date);
  }

  return dates;
}

function getTileLevel(value: number | undefined) {
  return !value || value < 0 ? 0 : [0.5, 1, 2, Infinity].findIndex((limit) => value < limit) + 1;
}

function formatTileLabel(
  date: Date,
  value: number | undefined,
  formatValue: (value: number | undefined) => string,
) {
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  return `${formattedDate}: ${formatValue(value)}`;
}

export function TileGraph({
  formatValue = (value) => String(value ?? 0),
  headerControl,
  valuesByDate,
  year,
}: TileGraphProps) {
  const dates = getGraphDates(year);

  return (
    <div className="rounded-md border border-border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Study activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Daily session activity for {year}</p>
        </div>

        <div className="flex items-center gap-4">
          {headerControl}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Less</span>
            {levelClasses.map((levelClass, level) => (
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-[2px] ${levelClass}`}
                key={level}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="grid shrink-0 grid-rows-7 gap-[3px] text-right text-[11px] leading-3 text-muted-foreground">
          {dayLabels.map((label, index) => (
            <span className="h-2.5" key={`${label}-${index}`}>
              {label}
            </span>
          ))}
        </div>

        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {dates.map((date, index) => {
            if (!date) {
              return <span aria-hidden="true" className="h-2.5 w-2.5" key={`empty-${index}`} />;
            }

            const dateKey = getDateKey(date);
            const value = valuesByDate[dateKey];
            const level = getTileLevel(value);

            return (
              <span
                aria-label={formatTileLabel(date, value, formatValue)}
                className={`h-2.5 w-2.5 rounded-[2px] ${levelClasses[level]}`}
                key={dateKey}
                title={formatTileLabel(date, value, formatValue)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
