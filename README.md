# BlackPayments Wallet

Production-ready multi-chain cryptocurrency wallet supporting USDT on EVM chains and TRON.

## Features

- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, TRON
- **USDT Transfers**: Send and receive USDT across all supported chains
- **Custodial & Non-Custodial**: Flexible custody options with HSM-backed security
- **P2P Trading**: Peer-to-peer cryptocurrency exchange
- **Payment Requests**: Create and manage payment requests
- **KYC Integration**: Built-in Know Your Customer verification
- **Rate Limiting**: Supabase-backed rate limiting for API protection
- **Security**: AES-GCM encryption, CSRF protection, HSM custody

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Blockchain**: ethers.js, TronWeb, Alchemy SDK
- **State Management**: Zustand, React Query
- **Security**: HSM (Hardware Security Module), AES-GCM encryption
- **Monitoring**: Sentry, Datadog

## Production Deployment

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account
- Alchemy API key
- HSM service (Hardware Security Module)
- Redis/Upstash for rate limiting

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/blackpayments/wallet.git
cd wallet
```

2. Copy environment file:
```bash
cp .env.example .env.local
```

3. Configure all required environment variables in `.env.local`

### Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
npm start
```

### Cloudflare Workers Deployment

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put HSM_API_URL
wrangler secret put HSM_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put WALLET_ENCRYPTION_KEY

# Deploy
wrangler deploy
```

## Environment Variables

See [`.env.example`](.env.example) for all required production environment variables.

### Critical Production Variables

- `NODE_ENV=production`
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `HSM_API_URL` - HSM service URL (REQUIRED)
- `HSM_API_KEY` - HSM API key (REQUIRED)
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `WALLET_ENCRYPTION_KEY` - Wallet encryption key (min 32 chars)
- `ALCHEMY_API_KEY` - Alchemy API key for blockchain RPC

## Security

### Production Security Checklist

- [ ] All environment variables are configured
- [ ] HSM is properly configured and accessible
- [ ] Supabase RLS policies are enabled
- [ ] Rate limiting is active
- [ ] CSRF protection is enabled
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Error tracking (Sentry) is configured
- [ ] Backup system is configured
- [ ] Monitoring and alerting are set up

### Security Features

- **HSM Custody**: All custodial keys stored in Hardware Security Module
- **AES-GCM Encryption**: Wallet data encrypted with AES-GCM
- **CSRF Protection**: Token-based CSRF protection on all forms
- **Rate Limiting**: Supabase-backed rate limiting
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: Content Security Policy headers

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/exchange` - Exchange rates
- `GET /api/exchange/courses` - Exchange courses
- `POST /api/csrf` - CSRF token

### Authenticated Endpoints
- `GET /api/custodial/health` - Custodial health check
- `GET /api/custodial/addresses` - Get custodial addresses
- `GET /api/custodial/balances` - Get balances
- `GET /api/custodial/history` - Transaction history
- `POST /api/custodial/withdraw` - Initiate withdrawal
- `POST /api/payments/requests` - Create payment request
- `GET /api/payments/[id]` - Get payment details
- `GET /api/payments/[id]/status` - Get payment status
- `POST /api/merchant/api-keys` - Create API key
- `DELETE /api/merchant/api-keys/[id]` - Delete API key
- `POST /api/payments/webhooks` - Register webhook
- `GET /api/payments/webhooks/[id]` - Get webhook status

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Database

### Supabase Setup

1. Create a new Supabase project
2. Run the schema migration:
```bash
supabase db push
```

3. Seed initial data:
```bash
supabase db seed
```

### Database Schema

See [`src/supabase/schema.sql`](src/supabase/schema.sql) for the complete database schema.

## Monitoring

### Health Checks

- Application: `GET /api/health`
- Custodial Service: `GET /api/custodial/health`

### Metrics

- Sentry for error tracking
- Datadog for APM
- Custom audit logging via `src/lib/audit.ts`

## Backup

Backups are configured via the backup service. See `.env.example` for backup configuration.

## Compliance

- KYC verification via SumSub
- AML screening
- Sanctions screening
- Audit logging for all transactions

## License

Proprietary - All rights reserved

## Support

For support, contact support@blackpayments.com
