const DB_NAME = 'FoodAdminDB';
const DB_VERSION = 5; // Incremented version to add ingredients & notifications stores

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

// Fallback de almacenamiento en memoria para ejecución de pruebas en consola Node.js CLI
class MemoryStore {
  private items = new Map<string, any>();
  constructor(public keyPath: string = 'id') {}

  put(item: any) {
    const key = item[this.keyPath];
    this.items.set(key, JSON.parse(JSON.stringify(item)));
    const req = { result: undefined, onsuccess: null as any, onerror: null as any };
    setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
    return req;
  }

  get(key: string) {
    const val = this.items.get(key);
    const req = { result: val ? JSON.parse(JSON.stringify(val)) : undefined, onsuccess: null as any, onerror: null as any };
    setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
    return req;
  }

  getAll() {
    const list = Array.from(this.items.values()).map(v => JSON.parse(JSON.stringify(v)));
    const req = { result: list, onsuccess: null as any, onerror: null as any };
    setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
    return req;
  }

  delete(key: string) {
    this.items.delete(key);
    const req = { result: undefined, onsuccess: null as any, onerror: null as any };
    setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
    return req;
  }
}

class MemoryDB {
  private stores = new Map<string, MemoryStore>();
  objectStoreNames = {
    contains: (_name: string) => true
  };

  transaction(name: string) {
    let store = this.stores.get(name);
    if (!store) {
      store = new MemoryStore(name === 'settings' ? 'key' : 'id');
      this.stores.set(name, store);
    }
    return {
      objectStore: () => store
    };
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    if (!dbInstance) {
      dbInstance = new MemoryDB() as unknown as IDBDatabase;
    }
    return Promise.resolve(dbInstance);
  }
  if (dbInstance) {
    try {
      if (dbInstance.objectStoreNames) {
        return Promise.resolve(dbInstance);
      }
    } catch (e) {
      dbInstance = null;
    }
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database open error:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null;
      dbInstance = null;
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      dbInstance = db;

      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbPromise = null;
      };

      db.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('ingredients')) {
        db.createObjectStore('ingredients', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

