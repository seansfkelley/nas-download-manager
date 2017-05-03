interface StorageChange<T> {
  oldValue?: T;
  newValue?: T;
}

type StorageChangeEvent<T> = { [K in keyof T]?: StorageChange<T[K]>; };

type StorageChangeListener<T> = (changes: StorageChangeEvent<T>, areaName: 'sync' | 'local' | 'managed') => void;

type NotificationTemplateType = 'basic' | 'image' | 'list' | 'progress';

interface NotificationOptions {
  type: NotificationTemplateType;
  message: string;
  title: string;
  iconUrl?: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  eventTime?: number;
  buttons?: {
    title: string;
    iconUrl?: string;
  }[];
  imageUrl?: string;
  items?: {
    title: string;
    message: string;
  }[];
  progress?: number;
}

declare const browser: {
  runtime: {
    openOptionsPage: () => Promise<void>;
  };
  storage: {
    local: {
      get: <T>(input: string | string[]) => Promise<T>;
      set: <T>(input: T) => Promise<void>;
    };
    onChanged: {
      addListener: <T extends object>(listener: StorageChangeListener<T>) => void;
      removeListener: <T extends object>(listener: StorageChangeListener<T>) => void;
      hasListener: <T extends object>(listener: StorageChangeListener<T>) => boolean;
    };
  };
  notifications: {
    create: (id: string | undefined, options?: NotificationOptions) => void;
  };
};
