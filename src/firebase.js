import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, GoogleAIBackend } from 'firebase/ai';
import firebaseConfig from '../firebase-config.json';

const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
if (debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;

export const app = initializeApp(firebaseConfig);
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'unset'),
  isTokenAutoRefreshEnabled: true,
});
export const ai = getAI(app, { backend: new GoogleAIBackend() });
