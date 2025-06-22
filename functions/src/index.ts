import { initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v1/https';
import { ExpressServer } from './server/ExpressServer';

initializeAdminApp();

const server = new ExpressServer();
const app = server.run();
export const api = onRequest(app);
