import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseStatus {
  isConfigured: boolean;
  projectId: string | null;
  error?: string | null;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let configStatus: FirebaseStatus = {
  isConfigured: false,
  projectId: null,
};

// Use Vite's safe glob loader so missing optional config file doesn't fail bundler build
try {
  const configs = import.meta.glob<{ default: any }>('/firebase-applet-config.json', { eager: true });
  const configModule = configs['/firebase-applet-config.json'];

  if (configModule && configModule.default && configModule.default.projectId && configModule.default.projectId !== 'remixed-project-id') {
    const config = configModule.default;
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app, config.firestoreDatabaseId);
    configStatus = {
      isConfigured: true,
      projectId: config.projectId,
    };
  }
} catch (e: any) {
  configStatus = {
    isConfigured: false,
    projectId: null,
    error: e.message || 'Firebase config not found',
  };
}

export { app, auth, db, configStatus };
