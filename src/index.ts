import { initializeApp } from 'firebase-admin/app';
import { ExpressServer } from './server/ExpressServer';

initializeApp();
const server = new ExpressServer();
server.run();
