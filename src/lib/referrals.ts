import { createClient } from "@supabase/supabase-js";

export interface ReferralCode {
  code: string;
  ownerId: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ReferralStore {
  saveCode(code: ReferralCode): Promise<void>;
  getCode(code: string): Promise<ReferralCode | null>;
  saveUsage(usage: ReferralUsage): Promise<void>;
  getUsagesByAffiliate(affiliateId: string): Promise<ReferralUsage[]>;
}

export interface ReferralUsage {
  code: string;
  affiliateId: string;
  newUserId: string;
  amountCents: number;
  commissionCents: number;
  discountCents: number;
  appliedAt: Date;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const referralStore: ReferralStore = {
  async saveCode(code: ReferralCode) {
    const { error } = await getAdminClient().from("referral_codes").insert({
      code: code.code, owner_id: code.ownerId,
      created_at: code.createdAt.toISOString(),
      expires_at: code.expiresAt?.toISOString() ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async getCode(code: string): Promise<ReferralCode | null> {
    const { data } = await getAdminClient().from("referral_codes").select("*").eq("code", code).maybeSingle();
    if (!data) return null;
    return { code: data.code, ownerId: data.owner_id, createdAt: new Date(data.created_at), expiresAt: data.expires_at ? new Date(data.expires_at) : null };
  },

  async saveUsage(usage: ReferralUsage) {
    const { error } = await getAdminClient().from("referral_usages").insert({
      code: usage.code, affiliate_id: usage.affiliateId, new_user_id: usage.newUserId,
      amount_cents: usage.amountCents, commission_cents: usage.commissionCents,
      discount_cents: usage.discountCents, applied_at: usage.appliedAt.toISOString(),
    });
    if (error) throw new Error(error.message);
  },

  async getUsagesByAffiliate(affiliateId: string): Promise<ReferralUsage[]> {
    const { data } = await getAdminClient().from("referral_usages").select("*").eq("affiliate_id", affiliateId).order("applied_at", { ascending: false });
    return (data ?? []).map((row: any) => ({ code: row.code, affiliateId: row.affiliate_id, newUserId: row.new_user_id, amountCents: row.amount_cents, commissionCents: row.commission_cents, discountCents: row.discount_cents, appliedAt: new Date(row.applied_at) }));
  },
};

// ─── Helper functions (previously from @profullstack/referrals) ────────

export async function createCode(ownerId: string, store: ReferralStore): Promise<ReferralCode> {
  const code = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const referralCode: ReferralCode = {
    code,
    ownerId,
    createdAt: new Date(),
    expiresAt: null,
  };
  await store.saveCode(referralCode);
  return referralCode;
}

export async function validateCode(code: string, store: ReferralStore): Promise<ReferralCode | null> {
  return store.getCode(code);
}

export async function applyReferral(params: {
  code: string;
  newUserId: string;
  amountCents: number;
  store: ReferralStore;
}): Promise<ReferralUsage> {
  const { code, newUserId, amountCents, store } = params;
  const record = await store.getCode(code);
  if (!record) {
    throw new Error('Invalid referral code');
  }

  const commissionCents = Math.floor(amountCents * 0.1); // 10% commission
  const discountCents = Math.floor(amountCents * 0.05);  // 5% discount

  const usage: ReferralUsage = {
    code,
    affiliateId: record.ownerId,
    newUserId,
    amountCents,
    commissionCents,
    discountCents,
    appliedAt: new Date(),
  };

  await store.saveUsage(usage);
  return usage;
}
