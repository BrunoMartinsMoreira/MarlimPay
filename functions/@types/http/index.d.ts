import 'http';

declare module 'http' {
  interface IncomingMessage {
    baseUrl?: string;
  }
}
