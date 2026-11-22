import type { IncomingMessage, ServerResponse } from 'node:http';

/** The few Express request/response members used here (no @types/express needed). */
export type HttpRequest = IncomingMessage & { protocol: string; get(name: string): string | undefined };
export type HttpResponse = ServerResponse & {
  type(t: string): HttpResponse;
  status(code: number): HttpResponse;
  sendFile(path: string, cb: (err?: Error) => void): void;
};

export const requestBase = (req: HttpRequest) => `${req.protocol}://${req.get('host')}`;
