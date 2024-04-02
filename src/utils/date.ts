import { DateTime } from 'luxon';

export function getAllDatesBetween(from: DateTime, to: DateTime) {
  const fromDate = from.startOf('day');
  const toDate = to.startOf('day');

  const dates: string[] = [];
  let currentDate = fromDate;

  while (currentDate <= toDate) {
    dates.push(currentDate.toISODate() as string);
    currentDate = currentDate.plus({ days: 1 });
  }

  return dates;
}
