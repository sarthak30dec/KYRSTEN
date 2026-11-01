import { CalendarTask, GoogleCalendarAuthStatus } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

const LOCAL_STORAGE_TASKS_KEY = 'kyrsten_calendar_tasks_v1';
const LOCAL_STORAGE_AUTH_KEY = 'kyrsten_calendar_google_auth_v1';

// Format helper
export const formatTimeDisplay = (isoOrTime: string): string => {
  if (!isoOrTime) return '';
  try {
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch (_) {}
  return isoOrTime;
};

export const formatDateHeader = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
};

// Initial sample tasks showcasing schedule time frames
const getInitialSampleTasks = (): CalendarTask[] => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return [
    {
      id: 'task-morning-standup',
      title: 'Neural Architecture Standup & Sync',
      description: 'Daily team sync on Kyrsten voice synthesis latency and MCP tool integrations.',
      date: todayStr,
      startTime: `${todayStr}T09:00`,
      endTime: `${todayStr}T09:45`,
      priority: 'high',
      status: 'completed',
      category: 'meeting',
      color: '#06b6d4',
      reminderMinutes: 10,
      createdAt: Date.now() - 100000,
      updatedAt: Date.now() - 100000,
    },
    {
      id: 'task-deep-focus',
      title: 'Deep Focus: Model Context Protocol Optimizer',
      description: 'Refactor prompt serialization and fast in-memory tool dispatch.',
      date: todayStr,
      startTime: `${todayStr}T10:30`,
      endTime: `${todayStr}T12:30`,
      priority: 'urgent',
      status: 'in_progress',
      category: 'focus',
      color: '#8b5cf6',
      reminderMinutes: 15,
      createdAt: Date.now() - 80000,
      updatedAt: Date.now() - 80000,
    },
    {
      id: 'task-calendar-review',
      title: 'Task Calendar & Google Workspace Sync Review',
      description: 'Validate token refresh and bidirectional event additions from Kyrsten voice commands.',
      date: todayStr,
      startTime: `${todayStr}T14:00`,
      endTime: `${todayStr}T15:00`,
      priority: 'high',
      status: 'pending',
      category: 'work',
      color: '#10b981',
      reminderMinutes: 15,
      createdAt: Date.now() - 60000,
      updatedAt: Date.now() - 60000,
    },
    {
      id: 'task-evening-walk',
      title: 'Health Break & Ambient Music Listening',
      description: 'Relaxation walk listening to synthwave & ambient focus frequencies.',
      date: todayStr,
      startTime: `${todayStr}T17:30`,
      endTime: `${todayStr}T18:15`,
      priority: 'low',
      status: 'pending',
      category: 'health',
      color: '#f59e0b',
      reminderMinutes: 5,
      createdAt: Date.now() - 40000,
      updatedAt: Date.now() - 40000,
    },
  ];
};

export class GoogleCalendarManager {
  private static instance: GoogleCalendarManager;
  private tokenClient: any = null;
  private authStatus: GoogleCalendarAuthStatus = {
    isSignedIn: false,
  };
  private tasks: CalendarTask[] = [];
  private listeners: Array<() => void> = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): GoogleCalendarManager {
    if (!GoogleCalendarManager.instance) {
      GoogleCalendarManager.instance = new GoogleCalendarManager();
    }
    return GoogleCalendarManager.instance;
  }

  private loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      } else {
        this.tasks = getInitialSampleTasks();
        this.saveTasksToStorage();
      }

      const savedAuth = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      if (savedAuth) {
        const parsedAuth: GoogleCalendarAuthStatus = JSON.parse(savedAuth);
        // Check if token expired
        if (parsedAuth.expiresAt && Date.now() > parsedAuth.expiresAt) {
          this.authStatus = { isSignedIn: false };
        } else {
          this.authStatus = parsedAuth;
        }
      }
    } catch (e) {
      console.warn('Error loading calendar storage:', e);
      this.tasks = getInitialSampleTasks();
    }
  }

  private saveTasksToStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('Error saving tasks to storage:', e);
    }
    this.notify();
  }

  private saveAuthToStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(this.authStatus));
    } catch (e) {
      console.warn('Error saving auth to storage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getTasks(): CalendarTask[] {
    return [...this.tasks].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return timeA - timeB;
    });
  }

  public getAuthStatus(): GoogleCalendarAuthStatus {
    return { ...this.authStatus };
  }

  // Task CRUD operations
  public addTask(taskData: Omit<CalendarTask, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): CalendarTask {
    const now = Date.now();
    const newTask: CalendarTask = {
      ...taskData,
      id: taskData.id || `task-${now}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(newTask);
    this.saveTasksToStorage();

    // If connected to Google, also attempt to export to Google Calendar
    if (this.authStatus.isSignedIn && this.authStatus.accessToken) {
      this.createGoogleEvent(newTask).catch((err) => {
        console.warn('Background Google event creation failed:', err);
      });
    }

    return newTask;
  }

  public updateTask(id: string, updates: Partial<CalendarTask>): CalendarTask | null {
    const index = this.tasks.findIndex((t) => t.id === id || (t.googleEventId && t.googleEventId === id));
    if (index === -1) return null;

    const updatedTask: CalendarTask = {
      ...this.tasks[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.tasks[index] = updatedTask;
    this.saveTasksToStorage();

    if (this.authStatus.isSignedIn && this.authStatus.accessToken && updatedTask.googleEventId) {
      this.patchGoogleEvent(updatedTask).catch((err) => {
        console.warn('Background Google event update failed:', err);
      });
    }

    return updatedTask;
  }

  public deleteTask(id: string): boolean {
    const taskToDelete = this.tasks.find((t) => t.id === id || (t.googleEventId && t.googleEventId === id));
    if (!taskToDelete) return false;

    this.tasks = this.tasks.filter((t) => t.id !== taskToDelete.id);
    this.saveTasksToStorage();

    if (this.authStatus.isSignedIn && this.authStatus.accessToken && taskToDelete.googleEventId) {
      this.deleteGoogleEvent(taskToDelete.googleEventId).catch((err) => {
        console.warn('Background Google event deletion failed:', err);
      });
    }

    return true;
  }

  public clearAllTasks() {
    this.tasks = [];
    this.saveTasksToStorage();
  }

  // Google Calendar Integration (OAuth 2.0 via Google Identity Services)
  public async requestGoogleCalendarLogin(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        console.warn('Google Identity Services SDK is loading or unavailable');
        resolve(false);
        return;
      }

      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: '638055523364-placeholder.apps.googleusercontent.com', // Will be supplemented by client prompt or authorization
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              const expiresAt = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
              this.authStatus = {
                isSignedIn: true,
                accessToken: tokenResponse.access_token,
                expiresAt,
                calendarId: 'primary',
                lastSyncedAt: Date.now(),
              };

              // Fetch user profile info
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  this.authStatus.userEmail = userData.email;
                  this.authStatus.userName = userData.name;
                  this.authStatus.userAvatar = userData.picture;
                }
              } catch (_) {}

              this.saveAuthToStorage();
              await this.importGoogleCalendarEvents();
              resolve(true);
            } else {
              console.warn('Token response error:', tokenResponse.error);
              resolve(false);
            }
          },
          error_callback: (err) => {
            console.warn('OAuth prompt error:', err);
            resolve(false);
          },
        });

        client.requestAccessToken();
      } catch (err) {
        console.warn('Failed to initiate Google OAuth:', err);
        resolve(false);
      }
    });
  }

  public setAccessTokenDirect(accessToken: string, email?: string) {
    this.authStatus = {
      isSignedIn: true,
      accessToken,
      expiresAt: Date.now() + 3600 * 1000,
      userEmail: email,
      calendarId: 'primary',
      lastSyncedAt: Date.now(),
    };
    this.saveAuthToStorage();
    this.importGoogleCalendarEvents();
  }

  public signOutGoogle() {
    this.authStatus = { isSignedIn: false };
    this.saveAuthToStorage();
  }

  // Google Calendar API calls
  public async importGoogleCalendarEvents(): Promise<{ importedCount: number; error?: string }> {
    if (!this.authStatus.accessToken) {
      return { importedCount: 0, error: 'Not authenticated with Google' };
    }

    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authStatus.accessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.signOutGoogle();
          return { importedCount: 0, error: 'Google session expired, please reconnect' };
        }
        throw new Error(`Google Calendar API HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data.items || [];
      let importedCount = 0;

      for (const item of items) {
        const start = item.start?.dateTime || item.start?.date;
        const end = item.end?.dateTime || item.end?.date;
        if (!start) continue;

        const dateStr = start.split('T')[0];
        const existingIdx = this.tasks.findIndex((t) => t.googleEventId === item.id);

        const taskData: CalendarTask = {
          id: existingIdx !== -1 ? this.tasks[existingIdx].id : `task-gcal-${item.id}`,
          googleEventId: item.id,
          title: item.summary || 'Untitled Event',
          description: item.description || '',
          date: dateStr,
          startTime: start,
          endTime: end || start,
          allDay: !item.start?.dateTime,
          priority: 'medium',
          status: 'pending',
          category: 'meeting',
          color: '#06b6d4',
          location: item.location,
          syncedWithGoogle: true,
          createdAt: existingIdx !== -1 ? this.tasks[existingIdx].createdAt : Date.now(),
          updatedAt: Date.now(),
        };

        if (existingIdx !== -1) {
          this.tasks[existingIdx] = { ...this.tasks[existingIdx], ...taskData };
        } else {
          this.tasks.push(taskData);
        }
        importedCount++;
      }

      this.authStatus.lastSyncedAt = Date.now();
      this.saveAuthToStorage();
      this.saveTasksToStorage();

      return { importedCount };
    } catch (e: any) {
      console.warn('Import Google Calendar error:', e);
      return { importedCount: 0, error: e.message || 'Failed to import calendar' };
    }
  }

  private async createGoogleEvent(task: CalendarTask): Promise<string | null> {
    if (!this.authStatus.accessToken) return null;
    try {
      const eventPayload = {
        summary: task.title,
        description: task.description,
        start: task.allDay
          ? { date: task.date }
          : { dateTime: new Date(task.startTime).toISOString() },
        end: task.allDay
          ? { date: task.date }
          : { dateTime: new Date(task.endTime).toISOString() },
        location: task.location,
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authStatus.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (res.ok) {
        const created = await res.json();
        task.googleEventId = created.id;
        task.syncedWithGoogle = true;
        this.saveTasksToStorage();
        return created.id;
      }
    } catch (err) {
      console.warn('createGoogleEvent error:', err);
    }
    return null;
  }

  private async patchGoogleEvent(task: CalendarTask): Promise<boolean> {
    if (!this.authStatus.accessToken || !task.googleEventId) return false;
    try {
      const eventPayload = {
        summary: task.title,
        description: task.description,
        start: task.allDay
          ? { date: task.date }
          : { dateTime: new Date(task.startTime).toISOString() },
        end: task.allDay
          ? { date: task.date }
          : { dateTime: new Date(task.endTime).toISOString() },
        location: task.location,
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.googleEventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.authStatus.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });
      return res.ok;
    } catch (err) {
      console.warn('patchGoogleEvent error:', err);
      return false;
    }
  }

  private async deleteGoogleEvent(googleEventId: string): Promise<boolean> {
    if (!this.authStatus.accessToken || !googleEventId) return false;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.authStatus.accessToken}`,
        },
      });
      return res.ok;
    } catch (err) {
      console.warn('deleteGoogleEvent error:', err);
      return false;
    }
  }
}
