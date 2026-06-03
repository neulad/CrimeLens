/**
 * live.ts — in-memory WebSocket client registry for incident broadcasting.
 * Any module can call broadcast() to push a new incident to all open clients.
 */

export interface LiveIncident {
  id: string;
  crimeType: string;
  city: string;
  occurredAt: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
}

interface WsClient {
  send(data: string): void;
}

const clients = new Set<WsClient>();

export function addClient(ws: WsClient): void {
  clients.add(ws);
}

export function removeClient(ws: WsClient): void {
  clients.delete(ws);
}

export function broadcastIncident(incident: LiveIncident): void {
  const payload = JSON.stringify({ type: 'new_incident', incident });
  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
}
