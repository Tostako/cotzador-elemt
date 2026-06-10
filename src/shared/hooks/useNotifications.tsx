import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface AppState {
  notifications: Notification[];
  showNotification: (message: string, type?: NotificationType) => void;
  removeNotification: (id: number) => void;
}

let notificationId = 0;

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  showNotification: (message, type = 'success') => {
    const id = ++notificationId;
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 3000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export function NotificationContainer() {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`notification ${n.type}`}
          onClick={() => removeNotification(n.id)}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
