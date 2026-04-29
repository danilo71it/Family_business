import { Transaction } from '../types';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function getAccessToken() {
  return localStorage.getItem('google_access_token');
}

export async function createCalendarEvent(tx: Transaction): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const event = formatTransactionForCalendar(tx);
  
  try {
    const response = await fetch(CALENDAR_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 403 || response.status === 401) {
        console.error('Permessi Google Calendar insufficienti o scaduti.');
        localStorage.removeItem('google_access_token');
      }
      console.error('Google Calendar Error:', err);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Calendar Creation Failed:', error);
    return null;
  }
}

export async function updateCalendarEvent(googleEventId: string, tx: Transaction): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const event = formatTransactionForCalendar(tx);

  try {
    const response = await fetch(`${CALENDAR_API_BASE}/${googleEventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    return response.ok;
  } catch (error) {
    console.error('Calendar Update Failed:', error);
    return false;
  }
}

export async function deleteCalendarEvent(googleEventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(`${CALENDAR_API_BASE}/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Calendar Delete Failed:', error);
    return false;
  }
}

function formatTransactionForCalendar(tx: Transaction) {
  const start = new Date(tx.date);
  if (tx.time) {
    const [h, m] = tx.time.split(':').map(Number);
    start.setHours(h, m, 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }

  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  // Reminders mapping
  const overrides = tx.reminders?.map(r => ({
    method: 'popup',
    minutes: r.unit === 'minutes' ? r.value : r.unit === 'hours' ? r.value * 60 : r.value * 1440
  })) || [];

  return {
    summary: `${tx.category}`,
    description: tx.description || tx.note || '',
    location: tx.address || '',
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    reminders: {
      useDefault: overrides.length === 0,
      overrides: overrides.length > 0 ? overrides : undefined
    }
  };
}
