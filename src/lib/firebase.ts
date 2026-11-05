import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';

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

const googleProvider = new GoogleAuthProvider();

// Sirf in domains ke emails app use kar sakte hain (firestore.rules mein bhi same list honi chahiye)
export const ALLOWED_EMAIL_DOMAINS = ['thapar.edu'];

// Google login screen pe sirf isi domain ke accounts dikhaye (sirf suvidha ke liye, asli rok rules mein hai)
googleProvider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAINS[0] });

export const isAllowedEmail = (email?: string | null) =>
  !!email && ALLOWED_EMAIL_DOMAINS.some((d) => email.toLowerCase().endsWith('@' + d));

// Use Vite's safe glob loader so missing optional config file doesn't fail bundler build
try {
  const configs = import.meta.glob<{ default: any }>('/firebase-applet-config.json', { eager: true });
  const configModule = configs['/firebase-applet-config.json'];

  if (configModule && configModule.default && configModule.default.projectId && configModule.default.projectId !== 'remixed-project-id') {
    const config = configModule.default;
    const isFirstInit = !getApps().length;
    app = isFirstInit ? initializeApp(config) : getApps()[0];
    auth = getAuth(app);
    // Firestore rejects `undefined` field values by default, which silently broke
    // syncing of optional fields (e.g. messages without a code snippet).
    try {
      db = initializeFirestore(app, { ignoreUndefinedProperties: true }, config.firestoreDatabaseId);
    } catch {
      // Already initialized (e.g. during Vite hot reload)
      db = getFirestore(app, config.firestoreDatabaseId);
    }
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

export { app, auth, db, configStatus, googleProvider };
