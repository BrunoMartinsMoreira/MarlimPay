import express, { Express } from 'express';

export class HttpHandler {
  private readonly app: Express;

  constructor() {
    this.app = express();
    this.startServer();
  }

  private startServer(): void {
    this.app.listen(3000, () => {
      console.log('App start on port 3000');
    });
  }

  getApp() {
    return this.app;
  }
}
