import { isSameDay, addDays } from 'date-fns';

export interface Holiday {
  date: Date;
  name: string;
}

export function getItalianHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: 'Capodanno' },
    { date: new Date(year, 0, 6), name: 'Epifania' },
    { date: new Date(year, 3, 25), name: 'Liberazione' },
    { date: new Date(year, 4, 1), name: 'Festa del Lavoro' },
    { date: new Date(year, 5, 2), name: 'Festa della Repubblica' },
    { date: new Date(year, 7, 15), name: 'Ferragosto' },
    { date: new Date(year, 10, 1), name: 'Ognissanti' },
    { date: new Date(year, 11, 8), name: 'Immacolata' },
    { date: new Date(year, 11, 25), name: 'Natale' },
    { date: new Date(year, 11, 26), name: 'Santo Stefano' },
  ];

  // Easter and Easter Monday
  const easter = getEaster(year);
  holidays.push({ date: easter, name: 'Pasqua' });
  holidays.push({ date: addDays(easter, 1), name: 'Lunedì dell\'Angelo' });

  return holidays;
}

// Butcher's algorithm for Easter calculation
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function isHoliday(date: Date): Holiday | null {
  const holidays = getItalianHolidays(date.getFullYear());
  // Also check previous/next year if near boundaries (though unlikely for a single date check)
  return holidays.find(h => isSameDay(h.date, date)) || null;
}
