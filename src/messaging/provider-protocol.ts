import type { ChatMessage } from '../providers/provider';

export interface ProviderStreamRequest {
  type: 'provider/stream';
  requestId: string;
  sourceContext: string;
  messages: ChatMessage[];
}

export interface ProviderCancelRequest {
  type: 'provider/cancel';
  requestId: string;
}

export type ProviderPortRequest = ProviderStreamRequest | ProviderCancelRequest;

export type ProviderPortEvent =
  | { type: 'provider/delta'; requestId: string; text: string }
  | { type: 'provider/complete'; requestId: string }
  | { type: 'provider/stopped'; requestId: string }
  | { type: 'provider/error'; requestId: string; message: string };
