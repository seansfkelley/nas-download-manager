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

interface Tab {
  active: boolean;
  audible?: boolean;
  cookieStoreId?: string;
  favIconUrl?: string;
  height?: number;
  highlighted: boolean;
  id?: number;
  incognito: boolean;
  index: number;
  mutedInfo?: {
    extensionId?: string;
    muted: boolean;
    reason?: 'capture' | 'extension' | 'user';
  };
  openerTabId?: number;
  pinned: boolean;
  selected: boolean;
  sessionId?: string;
  status?: 'loading' | 'complete';
  title?: string;
  url?: string;
  width?: number;
  windowId: number;
}

interface TabCreateOptions {
  active?: boolean;
  cookieStoreId?: string;
  index?: number;
  openerTabId?: number;
  pinned?: boolean;
  selected?: boolean;
  url?: string;
}

type ContextMenusItemType = 'normal' | 'checkbox' | 'radio' | 'separator';

type ContextsMenuContextType = 'all' | 'audio' | 'browser_action' | 'editable' | 'frame' | 'image' | 'link' | 'page' | 'page_action' | 'password' | 'selection' | 'tab' | 'video';

interface ContextMenusOnClickData {
  checked?: boolean;
  editable: boolean;
  frameUrl?: string;
  linkUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  menuItemId: number | string;
  modifiers: ('Command' | 'Ctrl' | 'MacCtrl' | 'Shift')[];
  pageUrl?: string;
  parentMenuItemId?: number | string;
  selectionText?: string;
  srcUrl?: string;
  wasChecked?: boolean;
}

interface ContextMenusCreateOptions {
  type?: ContextMenusItemType;
  id?: string;
  title?: string;
  checked?: boolean;
  contexts?: ContextsMenuContextType[];
  onclick?: (data: ContextMenusOnClickData) => void;
  parentId?: number | string;
  documentUrlPatterns?: string[];
  targetUrlPatterns?: string[];
  enabled?: boolean;
}

type ColorArray = [ number, number, number, number ];

interface SendMessageOptions {
  includeTlsChannelIdOptional?: boolean;
  toProxyScript?: boolean;
}

// TODO, but I don't actually need this...
type MessageSender = { __messageSenderBrand: any };

type OnMessageListener = (message: object | null | undefined, sender: MessageSender, sendResponse: (response: object) => void) => (Promise<object | void> | boolean | void);

declare const browser: {
  extension: {
    getURL: (relativeUrl: string) => string;
  };
  browserAction: {
    setBadgeText: (options: { text: string; tabId?: number; }) => void;
    setBadgeBackgroundColor: (options: { color: string | ColorArray; tabId?: number }) => void;
    setIcon: (options: { imageData?: ImageData | Record<string, ImageData>; path?: string | Record<string, string>; tabId?: number; }) => Promise<void>;
  };
  runtime: {
    openOptionsPage: () => Promise<void>;
    getBackgroundPage: () => Promise<Window | null>;
    // This is only one of 3-4 call signatures, but it's the only one we need.
    sendMessage: (message: object) => Promise<object>;
    onMessage: {
      addListener: (listener: OnMessageListener) => void;
      removeListener: (listener: OnMessageListener) => void;
      hasListener: (listener: OnMessageListener) => boolean;
    };
  };
  storage: {
    local: {
      get: <T>(input: null | string | string[]) => Promise<T>;
      set: <T>(input: T) => Promise<void>;
    };
    onChanged: {
      addListener: <T extends object>(listener: StorageChangeListener<T>) => void;
      removeListener: <T extends object>(listener: StorageChangeListener<T>) => void;
      hasListener: <T extends object>(listener: StorageChangeListener<T>) => boolean;
    };
  };
  notifications: {
    create: (id: string | undefined, options?: NotificationOptions) => Promise<string>;
  };
  tabs: {
    create: (options?: TabCreateOptions) => Promise<Tab>;
  };
  contextMenus: {
    create: (options?: ContextMenusCreateOptions, callback?: () => void) => number | string;
    update: (id: number | string, options?: ContextMenusCreateOptions) => Promise<void>;
  };
  i18n: {
    getMessage: (messageName: string, placeholders?: (string | number)[]) => string;
  };
};
