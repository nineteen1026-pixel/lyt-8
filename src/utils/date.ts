import {
  format,
  parseISO,
  isSameDay,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  getDaysInMonth,
  getDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachMonthOfInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
}

export function formatDateDisplay(date: string | Date): string {
  return formatDate(date, 'yyyy年M月d日');
}

export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年M月', { locale: zhCN });
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isSameDayStr(d1: string, d2: string): boolean {
  return isSameDay(parseISO(d1), parseISO(d2));
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  const d = startOfDay(parseISO(date));
  const s = startOfDay(parseISO(start));
  const e = endOfDay(parseISO(end));
  return (isSameDay(d, s) || isAfter(d, s)) && (isSameDay(d, e) || isBefore(d, e));
}

export function isDateOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = startOfDay(parseISO(start1));
  const e1 = endOfDay(parseISO(end1));
  const s2 = startOfDay(parseISO(start2));
  const e2 = endOfDay(parseISO(end2));
  return isBefore(s1, e2) && isBefore(s2, e1);
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(0, nights);
}

export function getDaysArray(checkIn: string, checkOut: string): string[] {
  const days = eachDayOfInterval({
    start: parseISO(checkIn),
    end: parseISO(checkOut),
  });
  return days.map((d) => format(d, 'yyyy-MM-dd'));
}

export function getMonthMatrix(year: number, month: number): Date[][] {
  const firstDay = startOfMonth(new Date(year, month));
  const daysInMonth = getDaysInMonth(firstDay);
  const startWeekDay = getDay(firstDay);

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (let i = 0; i < startWeekDay; i++) {
    const d = new Date(year, month, i - startWeekDay + 1);
    currentWeek.push(d);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    let nextDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(year, month + 1, nextDay++));
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

export function getWeekDays(): string[] {
  return ['日', '一', '二', '三', '四', '五', '六'];
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1);
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getDaysInRange(start: string, end: string): string[] {
  const days = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });
  return days.map((d) => format(d, 'yyyy-MM-dd'));
}

export function getMonthsInRange(start: string, end: string): string[] {
  const months = eachMonthOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });
  return months.map((m) => format(m, 'yyyy-MM'));
}

export function getMonthKey(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM');
}

export function startOfMonthStr(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(startOfMonth(d), 'yyyy-MM-dd');
}

export function endOfMonthStr(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(endOfMonth(d), 'yyyy-MM-dd');
}

export function formatDateTimeDisplay(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年M月d日 HH:mm', { locale: zhCN });
}

export function calculateMonths(startDate: string, endDate: string): number {
  const months = differenceInMonths(parseISO(endDate), parseISO(startDate));
  return Math.max(1, months);
}

export function addMonthsStr(dateStr: string, months: number): string {
  const d = addMonths(parseISO(dateStr), months);
  return format(d, 'yyyy-MM-dd');
}

export function getContractPeriodLabel(startDate: string, monthIndex: number): string {
  const d = addMonths(parseISO(startDate), monthIndex);
  return format(d, 'yyyy年M月');
}

export function getMonthDueDate(startDate: string, monthIndex: number): string {
  const d = addMonths(parseISO(startDate), monthIndex);
  return format(d, 'yyyy-MM-dd');
}
