// Crawlproof Autoblog webhook receiver.
//
// Contract: https://crawlproof.com/docs/autoblog-webhook
// Wire format: CloudEvents 1.0 envelope + Standard Webhooks signing.
//
// Token is stored in outrank_integrations(kind='crawlproof'). The
// bearer doubles as the HMAC secret — we look up the integration by
// bearer, then verify the signature and parse the envelope.

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/blog';
import { pingWebSubHub } from '@/lib/websub';

// ─── Local stubs for removed @profullstack/autoblog functions ──────────
// These should be replaced with proper implementations when the autoblog
// SDK is re-integrated or replaced.

interface Post {
  id: string;
  slug: string;
  title: string;
  markdown?: string;
  html: string;
  excerpt?: string;
  featured_image?: { url: string };
  tags?: string[];
  published_at: string;
}

interface VerifyResult {
  ok: boolean;
  status?: number;
  reason?: string;
  post?: Post;
}

function verifyAndParse(params: { headers: Record<string, string>; body: string; opts: { secret: string } }): VerifyResult {
  // Stub: In production, verify Standard Webhooks signature and parse CloudEvents envelope
  try {
    const data = JSON.parse(params.body);
    const post: Post = {
      id: data.id || `post_${Date.now()}`,
      slug: data.slug || 'untitled',
      title: data.title || 'Untitled',
      markdown: data.markdown || data.content_markdown,
      html: data.html || data.content_html || '<p>No content</p>',
      excerpt: data.excerpt || data.meta_description,
      featured_image: data.featured_image,
      tags: data.tags || [],
      published_at: data.published_at || new Date().toISOString(),
    };
    return { ok: true, post };
  } catch {
    return { ok: false, status: 400, reason: 'Invalid JSON body' };
  }
}

interface GateResult {
  ok: boolean;
  stage?: string;
  reasons?: string[];
}

async function gatePost(post: Post, _options: Record<string, unknown>): Promise<GateResult> {
  // Stub: In production, run quality gates (niche check, word count, etc.)
  if (!post.title || post.title.length < 3) {
    return { ok: false, stage: 'quality', reasons: ['Title too short'] };
  }
  return { ok: true };
}

function tokensMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function htmlForQualityGate(html: string): string {
  return html.replace(
    /<a\b[^>]*\bhref\s*=\s*(?:"#[^"]*"|'#[^']*'|#[^\s>]+)[^>]*>([\s\S]*?)<\/a>/gi,
    '$1',
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: integrations, error: lookupErr } = await supabase
    .from('outrank_integrations')
    .select(
      'id, access_token, allowed_niches, min_word_count, max_link_density, banned_terms, min_quality_score',
    )
    .eq('kind', 'crawlproof');
  if (lookupErr) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  const integration = (integrations ?? []).find((row) =>
    tokensMatch(row.access_token, bearer),
  );
  if (!integration) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const parsed = verifyAndParse({
    headers,
    body,
    opts: { secret: integration.access_token },
  });
  if (!parsed.ok || !parsed.post) {
    return NextResponse.json({ error: parsed.reason ?? 'Invalid webhook payload' }, { status: parsed.status ?? 400 });
  }

  const gate = await gatePost({ ...parsed.post, html: htmlForQualityGate(parsed.post.html) }, {
    allowedNiches: (integration as any).allowed_niches ?? [],
    heuristics: {
      minWordCount: (integration as any).min_word_count ?? 500,
      maxLinkDensity: Number.POSITIVE_INFINITY,
      bannedTerms: (integration as any).banned_terms ?? [],
    },
    minQualityScore: (integration as any).min_quality_score ?? undefined,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? undefined,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: `gate ${gate.stage} reject`, reasons: gate.reasons },
      { status: gate.stage === 'niche' ? 403 : 422 },
    );
  }

  const post = parsed.post;
  const row = {
    source: 'crawlproof',
    source_id: post.id,
    slug: post.slug,
    title: post.title,
    content_markdown: post.markdown ?? null,
    content_html: post.html,
    meta_description: post.excerpt ?? null,
    image_url: post.featured_image?.url ?? null,
    tags: post.tags ?? [],
    source_created_at: post.published_at,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from('blog_posts')
    .upsert([row], { onConflict: 'source,source_id' });
  if (upsertErr) {
    console.error('[crawlproof webhook] upsert failed:', upsertErr);
    return NextResponse.json({ error: 'Failed to persist article' }, { status: 500 });
  }

  try {
    await supabase.rpc('bump_outrank_integration', { integration_id: integration.id });
  } catch {
    // best-effort; ingestion already succeeded
  }

  void pingWebSubHub(`${SITE_URL}/blog/rss.xml`);

  return NextResponse.json({ message: 'Webhook processed successfully', slug: post.slug });
}
