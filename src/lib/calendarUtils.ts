import { format } from 'date-fns';

export function getGoogleCalendarUrl(title: string, date: Date, time?: string, description?: string, address?: string) {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  // Format dates: YYYYMMDDTHHmmSSZ
  const startDate = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate.setHours(9, 0, 0, 0); // Default to 9 AM if no time
  }

  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1); // 1 hour duration default

  const formatCal = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");
  
  const params = new URLSearchParams({
    text: title,
    dates: `${formatCal(startDate)}/${formatCal(endDate)}`,
    details: description || '',
    location: address || '',
    sf: 'true',
    output: 'xml'
  });

  return `${baseUrl}&${params.toString()}`;
}

export function downloadIcsFile(title: string, date: Date, time?: string, description?: string, address?: string) {
  const startDate = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }
  
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1);

  const formatCal = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatCal(startDate)}`,
    `DTEND:${formatCal(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || ''}`,
    `LOCATION:${address || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
