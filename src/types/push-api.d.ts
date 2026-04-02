// Push API type declarations
interface PushSubscriptionOptionsInit {
  userVisibleOnly?: boolean;
  applicationServerKey?: BufferSource | string | null;
}

interface PushSubscription {
  readonly endpoint: string;
  readonly options: PushSubscriptionOptionsInit;
  getKey(name: 'p256dh' | 'auth'): ArrayBuffer | null;
  unsubscribe(): Promise<boolean>;
  toJSON(): PushSubscriptionJSON;
}

interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: Record<string, string>;
}

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
}

type PushPermissionState = 'denied' | 'granted' | 'prompt';

interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
