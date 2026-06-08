import { ethers, Wallet, JsonRpcProvider } from 'ethers';

export interface SignerAdapter {
  getAddress(): Promise<string>;
  signAndSendTransaction(tx: ethers.TransactionRequest, provider: JsonRpcProvider): Promise<ethers.TransactionResponse>;
}

/**
 * LocalSigner wraps an ethers Wallet and implements SignerAdapter
 */
export class LocalSigner implements SignerAdapter {
  private wallet: Wallet;
  constructor(wallet: Wallet) {
    this.wallet = wallet;
  }

  async getAddress(): Promise<string> {
    return this.wallet.getAddress();
  }

  async signAndSendTransaction(tx: ethers.TransactionRequest, provider: JsonRpcProvider): Promise<ethers.TransactionResponse> {
    // If wallet already connected to provider, use wallet.sendTransaction
    try {
      if ((this.wallet.provider as any) === provider) {
        return await this.wallet.sendTransaction(tx);
      }
      // Otherwise, connect wallet to provider and send
      const connected = this.wallet.connect(provider);
      return await connected.sendTransaction(tx);
    } catch (e) {
      throw e;
    }
  }
}

/**
 * RemoteSigner posts the transaction to a remote signing service which returns a signed raw tx.
 * The RemoteSigner then broadcasts it via the provider.
 * This is a stub adapter - implement secure mTLS/auth in production.
 */
export class RemoteSigner implements SignerAdapter {
  private addressCache?: string;
  constructor(private signingEndpoint: string) {}

  async getAddress(): Promise<string> {
    if (this.addressCache) return this.addressCache;
    // Remote signer should expose an endpoint to query the address; fallback to unknown
    // In production implement GET /address that returns { address }
    try {
      const resp = await fetch(`${this.signingEndpoint}/address`);
      const data = await resp.json();
      this.addressCache = data.address;
      return data.address;
    } catch (e) {
      throw new Error('Remote signer address fetch failed');
    }
  }

  async signAndSendTransaction(tx: ethers.TransactionRequest, provider: JsonRpcProvider): Promise<ethers.TransactionResponse> {
    // Request signer to sign the tx
    // The signing service should return a signedTx hex
    try {
      const body = { tx };
      const resp = await fetch(`${this.signingEndpoint}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        throw new Error(`Remote signer responded ${resp.status}`);
      }
      const { signedTx } = await resp.json();
      if (!signedTx) throw new Error('signedTx not returned');
      // Broadcast via provider
      // provider.sendTransaction expects a signed transaction hex
      // @ts-ignore
      return await (provider as any).sendTransaction(signedTx);
    } catch (e) {
      throw e;
    }
  }
}
