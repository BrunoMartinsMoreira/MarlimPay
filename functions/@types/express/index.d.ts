import 'express';

declare module 'express' {
  interface Request {
    userToken?: string;
  }

  interface Request {
    headers: import('http').IncomingHttpHeaders & {
      'idempotency-key'?: string;
      'Idempotency-Key'?: string;
    };
  }
}
