import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface NFT {
  id: string;
  userId: string;
  contractAddress: string;
  tokenId: string;
  chain: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface NFTCollection {
  id: string;
  userId: string;
  name: string;
  description: string;
  imageUrl: string;
  contractAddress: string;
  chain: string;
  createdAt: string;
}

export async function getNFTs(userId: string, chain?: string): Promise<NFT[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  let query = supabase
    .from('nfts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (chain) {
    query = query.eq('chain', chain);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch NFTs', error);
    return [];
  }

  return (data || []).map((nft) => ({
    id: nft.id,
    userId: nft.user_id,
    contractAddress: nft.contract_address,
    tokenId: nft.token_id,
    chain: nft.chain,
    name: nft.name,
    description: nft.description,
    imageUrl: nft.image_url,
    metadata: nft.metadata,
    createdAt: nft.created_at,
  }));
}

export async function getNFTCollections(userId: string): Promise<NFTCollection[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  const { data, error } = await supabase
    .from('nft_collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch NFT collections', error);
    return [];
  }

  return (data || []).map((collection) => ({
    id: collection.id,
    userId: collection.user_id,
    name: collection.name,
    description: collection.description,
    imageUrl: collection.image_url,
    contractAddress: collection.contract_address,
    chain: collection.chain,
    createdAt: collection.created_at,
  }));
}

export async function addNFT(params: {
  userId: string;
  contractAddress: string;
  tokenId: string;
  chain: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata?: Record<string, any>;
}): Promise<NFT> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  const { data, error } = await supabase
    .from('nfts')
    .insert({
      user_id: params.userId,
      contract_address: params.contractAddress,
      token_id: params.tokenId,
      chain: params.chain,
      name: params.name,
      description: params.description,
      image_url: params.imageUrl,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to add NFT', error);
    throw new Error('Failed to add NFT');
  }

  return {
    id: data.id,
    userId: data.user_id,
    contractAddress: data.contract_address,
    tokenId: data.token_id,
    chain: data.chain,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

export async function removeNFT(nftId: string, userId: string): Promise<void> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  const { error } = await supabase
    .from('nfts')
    .delete()
    .eq('id', nftId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to remove NFT', error);
    throw new Error('Failed to remove NFT');
  }
}
