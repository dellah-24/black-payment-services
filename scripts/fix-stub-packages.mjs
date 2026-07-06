import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Fix @profullstack/autoblog stub
const autoblogDir = path.join(root, 'node_modules/@profullstack/autoblog');
if (fs.existsSync(autoblogDir)) {
  // Create proper package.json with exports
  const pkg = {
    name: '@profullstack/autoblog',
    version: '0.4.0',
    type: 'module',
    exports: {
      '.': {
        import: './index.js',
        require: './index.cjs',
        types: './index.d.ts'
      },
      './quality': {
        import: './quality.js',
        require: './quality.cjs',
        types: './quality.d.ts'
      },
      './feeds': {
        import: './feeds.js',
        require: './feeds.cjs',
        types: './feeds.d.ts'
      }
    }
  };
  fs.writeFileSync(path.join(autoblogDir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Create stub JS files
  const stubJs = (name) => `export const ${name} = () => ({ default: () => null });`;
  fs.writeFileSync(path.join(autoblogDir, 'index.js'), stubJs('verifyAndParse'));
  fs.writeFileSync(path.join(autoblogDir, 'quality.js'), stubJs('gatePost'));
  fs.writeFileSync(path.join(autoblogDir, 'feeds.js'), `export const buildRssXml = () => '';\nexport const buildSitemapBlogEntries = () => [];`);
  fs.writeFileSync(path.join(autoblogDir, 'index.cjs'), `module.exports = { verifyAndParse: () => ({ default: () => null }) };`);
  fs.writeFileSync(path.join(autoblogDir, 'quality.cjs'), `module.exports = { gatePost: () => ({ default: () => null }) };`);
  fs.writeFileSync(path.join(autoblogDir, 'feeds.cjs'), `module.exports = { buildRssXml: () => '', buildSitemapBlogEntries: () => [] };`);

  // Create stub .d.ts files
  fs.writeFileSync(path.join(autoblogDir, 'index.d.ts'), `export interface VerifyAndParseResult { ok: boolean; reason?: string; status?: number; post?: any; }
export function verifyAndParse(data: { headers: Record<string, string>; body: string; opts?: { secret?: string } }): VerifyAndParseResult;
export default { verifyAndParse };
`);
  fs.writeFileSync(path.join(autoblogDir, 'quality.d.ts'), `export interface GatePostOptions { allowedNiches?: string[]; heuristics?: { minWordCount?: number; maxLinkDensity?: number; bannedTerms?: string[] }; minQualityScore?: number; anthropicApiKey?: string; }
export interface GatePostResult { ok: boolean; reason?: string; status?: number; score?: number; stage?: string; reasons?: string[]; }
export function gatePost(post: any, options: GatePostOptions): Promise<GatePostResult>;
export default { gatePost };
`);
  fs.writeFileSync(path.join(autoblogDir, 'feeds.d.ts'), `export interface RssFeedOptions { title: string; description: string; siteUrl: string; language?: string; hubUrl?: string; posts: any[]; }
export function buildRssXml(options: RssFeedOptions): string;
export interface SitemapBlogEntriesOptions { posts: any[]; baseUrl?: string; changeFrequency?: string; }
export function buildSitemapBlogEntries(options: SitemapBlogEntriesOptions): any[];
export default { buildRssXml, buildSitemapBlogEntries };
`);
}

// Fix @profullstack/coinpay stub - restore actual package.json from packages/sdk
const coinpayDir = path.join(root, 'node_modules/@profullstack/coinpay');
const sdkPkgPath = path.join(root, 'packages/sdk/package.json');
if (fs.existsSync(coinpayDir) && fs.existsSync(sdkPkgPath)) {
  const sdkPkg = JSON.parse(fs.readFileSync(sdkPkgPath, 'utf8'));
  fs.writeFileSync(path.join(coinpayDir, 'package.json'), JSON.stringify(sdkPkg, null, 2));
}

console.log('Stub packages fixed successfully');
