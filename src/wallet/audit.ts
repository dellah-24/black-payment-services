import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const AUDIT_LOG = path.join(process.cwd(), 'logs', 'audit.log');

export function appendAudit(entry: Record<string, any>) {
  try {
    const dir = path.dirname(AUDIT_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_LOG, JSON.stringify({ ts: Date.now(), ...entry }) + '\n');
  } catch (e) {
    // swallow to avoid breaking transaction flows, but log to console
    logger.error('Failed to write audit log', e as Error);
  }
}
