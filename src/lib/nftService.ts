/**
 * NFT Service - View and manage NFTs
 */

import { logger } from '@/lib/logger';
import { ethers } from 'ethers';

// ERC-721 ABI (simplified)
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

// ERC-1155 ABI (simplified)
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',
];

export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  symbol: string;
  tokenType: 'ERC721' | 'ERC1155';
  imageUrl?: string;
  metadata?: NFTMetadata;
  balance?: number;
}

export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  tokenType: 'ERC721' | 'ERC1155';
  nfts: NFT[];
}

/**
 * Fetch NFTs for an address
 */
export async function fetchNFTs(
  address: string,
  chain: string = 'ethereum'
): Promise<NFT[]> {
  const nfts: NFT[] = [];
  
  // Note: In production, use an NFT API like OpenSea, Alchemy, or SimpleHash
  // This is a basic implementation showing the concept
  
  try {
    const rpcUrl = getChainRPC(chain);
    if (!rpcUrl) return nfts;
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Sample common NFT contracts (in production, you'd query an indexer)
    const sampleNFTs = await getSampleNFTs(provider, address);
    nfts.push(...sampleNFTs);
    
  } catch (error) {
    logger.error('Error fetching NFTs', error as Error);
  }
  
  return nfts;
}

/**
 * Get sample NFTs (placeholder - in production use an indexer API)
 */
async function getSampleNFTs(provider: ethers.JsonRpcProvider, address: string): Promise<NFT[]> {
  // This returns empty array - in production integrate with OpenSea API or Alchemy
  return [];
}

/**
 * Fetch metadata for an NFT
 */
export async function fetchNFTMetadata(tokenUri: string): Promise<NFTMetadata | null> {
  try {
    // Handle IPFS URLs
    const url = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching NFT metadata', error as Error);
    return null;
  }
}

/**
 * Get NFT image URL from metadata
 */
export function getNFTImageUrl(metadata: NFTMetadata | undefined): string | undefined {
  if (!metadata?.image) return undefined;
  
  // Handle IPFS URLs
  let imageUrl = metadata.image;
  if (imageUrl.startsWith('ipfs://')) {
    imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  
  return imageUrl;
}

/**
 * Check if an address owns any NFTs from a collection
 */
export async function checkNFTOwnership(
  contractAddress: string,
  ownerAddress: string,
  chain: string,
  tokenType: 'ERC721' | 'ERC1155' = 'ERC721'
): Promise<boolean> {
  try {
    const rpcUrl = getChainRPC(chain);
    if (!rpcUrl) return false;
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    
    const balance = await contract.balanceOf(ownerAddress);
    return balance > 0;
  } catch (error) {
    logger.error('Error checking NFT ownership', error as Error);
    return false;
  }
}

/**
 * Get chain RPC URL
 */
function getChainRPC(chain: string): string | null {
  const rpcs: Record<string, string> = {
    ethereum: 'https://cloudflare-eth.com',
    bsc: 'https://bsc-dataseed1.binance.org',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    polygon: 'https://polygon-rpc.com',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  };
  
  return rpcs[chain] || null;
}

/**
 * Popular NFT collections for display
 */
export const POPULAR_COLLECTIONS = {
  ethereum: [
    { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', name: 'Bored Ape Yacht Club', symbol: 'BAYC' },
    { address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544', name: 'Azuki', symbol: 'AZUKI' },
    { address: '0x49cE696EeD6a5ce8e7e3C8Ec3a1e8d2AEDf1D8D', name: 'Pudgy Penguins', symbol: 'PENGU' },
  ],
  bsc: [
    { address: '0xDf7952B35f24aCF7fC0487D01c8d2e976d81830D', name: 'Mochi', symbol: 'MOCHI' },
  ],
};

/**
 * Format NFT attributes for display
 */
export function formatNFTAttributes(attributes: NFTAttribute[] | undefined): string {
  if (!attributes || attributes.length === 0) return '';
  
  return attributes.slice(0, 3).map(attr => 
    `${attr.trait_type}: ${attr.value}`
  ).join(' • ');
}
