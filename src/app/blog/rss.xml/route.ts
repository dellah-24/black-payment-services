import { NextResponse } from 'next/server';
import { listPosts, SITE_URL } from '@/lib/blog';
import { webSubHubUrl } from '@/lib/websub';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await listPosts(50);
  const hubUrl = webSubHubUrl();

  const items = posts
    .map(
      (p) => `<item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(`${SITE_URL}/blog/${p.slug}`)}</link>
      <guid>${escapeXml(`${SITE_URL}/blog/${p.slug}`)}</guid>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      ${p.meta_description ? `<description>${escapeXml(p.meta_description)}</description>` : ''}
      ${p.image_url ? `<enclosure url="${escapeXml(p.image_url)}" type="image/jpeg" />` : ''}
      ${(p.tags || []).map((t: string) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`
    )
    .join('\n    ');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tempest Touch Blog</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Crypto payments, Lightning, and merchant-side updates from the Tempest Touch team.</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(`${SITE_URL}/blog/rss.xml`)}" rel="self" />
    ${hubUrl ? `<atom:link href="${escapeXml(hubUrl)}" rel="hub" />` : ''}
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
