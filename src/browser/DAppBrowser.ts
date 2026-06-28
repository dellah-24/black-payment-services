import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getChainConfig, getPrimaryRpcUrl } from '@/config/chains';
import { WalletChain } from '@/wallet/types';

export interface DAppConnection {
  id: string;
  name: string;
  url: string;
  icon: string;
  chain: WalletChain;
  connected: boolean;
  connectedAt: string;
}

export interface DAppRequest {
  id: string;
  dAppId: string;
  type: 'transaction' | 'sign' | 'message';
  params: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  respondedAt: string | null;
}

export class DAppBrowser {
  private connections: Map<string, DAppConnection> = new Map();
  private pendingRequests: Map<string, DAppRequest> = new Map();

  async connectDApp(params: {
    name: string;
    url: string;
    icon: string;
    chain: WalletChain;
  }): Promise<DAppConnection> {
    try {
      const connection: DAppConnection = {
        id: crypto.randomUUID(),
        name: params.name,
        url: params.url,
        icon: params.icon,
        chain: params.chain,
        connected: true,
        connectedAt: new Date().toISOString(),
      };

      this.connections.set(connection.id, connection);
      logger.info('DApp connected', { connectionId: connection.id, name: params.name });

      return connection;
    } catch (error) {
      logger.error('Failed to connect DApp', error as Error);
      throw new Error('Failed to connect DApp');
    }
  }

  async disconnectDApp(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.connected = false;
        this.connections.delete(connectionId);
        logger.info('DApp disconnected', { connectionId });
      }
    } catch (error) {
      logger.error('Failed to disconnect DApp', error as Error);
      throw new Error('Failed to disconnect DApp');
    }
  }

  async sendRequest(params: {
    dAppId: string;
    type: DAppRequest['type'];
    requestParams: Record<string, any>;
  }): Promise<DAppRequest> {
    try {
      const connection = this.connections.get(params.dAppId);
      if (!connection || !connection.connected) {
        throw new Error('DApp not connected');
      }

      const request: DAppRequest = {
        id: crypto.randomUUID(),
        dAppId: params.dAppId,
        type: params.type,
        params: params.requestParams,
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null,
      };

      this.pendingRequests.set(request.id, request);
      logger.info('DApp request sent', { requestId: request.id, type: params.type });

      return request;
    } catch (error) {
      logger.error('Failed to send DApp request', error as Error);
      throw new Error('Failed to send DApp request');
    }
  }

  async respondToRequest(requestId: string, approved: boolean, result?: any): Promise<void> {
    try {
      const request = this.pendingRequests.get(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      request.status = approved ? 'approved' : 'rejected';
      request.respondedAt = new Date().toISOString();

      if (approved && result) {
        request.params.result = result;
      }

      this.pendingRequests.delete(requestId);
      logger.info('DApp request responded', { requestId, approved });
    } catch (error) {
      logger.error('Failed to respond to DApp request', error as Error);
      throw new Error('Failed to respond to DApp request');
    }
  }

  getConnections(): DAppConnection[] {
    return Array.from(this.connections.values());
  }

  getPendingRequests(): DAppRequest[] {
    return Array.from(this.pendingRequests.values()).filter((r) => r.status === 'pending');
  }

  isConnected(dAppId: string): boolean {
    const connection = this.connections.get(dAppId);
    return connection?.connected || false;
  }
}

export const dAppBrowser = new DAppBrowser();
