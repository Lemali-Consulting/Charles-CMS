# Deployment Plan — Charles CMS

Hetzner VPS + Cloudflare DNS/R2, managed via CLI.

## Infrastructure

- **VPS**: Hetzner CX22 (2 vCPU, 4GB RAM, ~$4/mo)
- **Reverse proxy / TLS**: Caddy (automatic HTTPS via Let's Encrypt)
- **Domain**: Custom domain (e.g., `app.charlescms.com`) or subdomain on an existing domain
- **Database**: SQLite — single file, no external DB service
- **Process manager**: PM2
- **Backups**: Cloudflare R2 (daily SQLite upload, 30-day retention)
- **Snapshots**: Hetzner weekly snapshots ($0.01/GB/mo)

## Prerequisites (one-time, browser required)

1. **Hetzner**: Create an API token at https://console.hetzner.cloud → project → Security → API Tokens
2. **Cloudflare**: Domain already added to your account, nameservers pointing to Cloudflare
3. **Cloudflare R2**: Create an R2 API token from the dashboard → R2 → Manage R2 API Tokens

## Local CLI Setup

```bash
# Install CLIs
brew install hcloud          # Hetzner CLI (or apt/yum equivalent)
npm install -g wrangler      # Cloudflare CLI

# Authenticate
hcloud context create charles-cms   # paste your Hetzner API token
wrangler login                      # opens browser for OAuth
```

## Step 1: Provision the VPS

```bash
# Upload your SSH key (if not already on Hetzner)
hcloud ssh-key create --name my-key --public-key-from-file ~/.ssh/id_ed25519.pub

# Create the server
hcloud server create \
  --name charles-cms \
  --type cx22 \
  --image ubuntu-24.04 \
  --ssh-key my-key \
  --location nbg1

# Note the IP address from the output
SERVER_IP=$(hcloud server ip charles-cms)
echo "Server IP: $SERVER_IP"
```

## Step 2: Point DNS via Cloudflare

```bash
# Get your zone ID
ZONE_ID=$(wrangler dns list-zones | grep yourdomain.com | awk '{print $1}')

# Create A record
wrangler dns create-record $ZONE_ID \
  --type A \
  --name app \
  --content $SERVER_IP \
  --proxied false
# Use --proxied false so Caddy can handle TLS directly.
# Set to true if you want Cloudflare's proxy/WAF in front.
```

## Step 3: Configure the Server

```bash
ssh root@$SERVER_IP << 'SETUP'
# System updates
apt update && apt upgrade -y

# Install Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 22

# Install PM2
npm install -g pm2

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Configure Caddy
cat > /etc/caddy/Caddyfile << 'CADDY'
app.yourdomain.com {
    reverse_proxy localhost:3000
}
CADDY
systemctl restart caddy

# Firewall — only allow SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
SETUP
```

## Step 4: Deploy the App

```bash
ssh root@$SERVER_IP << 'DEPLOY'
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Clone and build
git clone git@github.com:Lemali-Consulting/Charles-CMS.git /opt/charles-cms
cd /opt/charles-cms
npm install
npm run build

# Set environment variables
cat > .env.local << 'ENV'
AUTH_PASSWORD_HASH=<bcrypt hash here>
SESSION_SECRET=<random 64-char string here>
NODE_ENV=production
ENV

# Start with PM2
pm2 start npm --name charles-cms -- start
pm2 save
pm2 startup  # follow the output to enable on boot
DEPLOY
```

## Step 5: Set Up R2 Backups

```bash
# Create the R2 bucket (from your local machine)
wrangler r2 bucket create charles-cms-backups

# On the server, install rclone for R2 sync
ssh root@$SERVER_IP << 'BACKUP'
apt install -y rclone

# Configure rclone for Cloudflare R2
mkdir -p ~/.config/rclone
cat > ~/.config/rclone/rclone.conf << 'RCLONE'
[r2]
type = s3
provider = Cloudflare
access_key_id = <R2_ACCESS_KEY>
secret_access_key = <R2_SECRET_KEY>
endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
RCLONE

# Create daily backup cron job
cat > /etc/cron.daily/backup-charles-cms << 'CRON'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
cp /opt/charles-cms/introductions.db /tmp/introductions-$DATE.db
rclone copy /tmp/introductions-$DATE.db r2:charles-cms-backups/
rm /tmp/introductions-$DATE.db
# Keep only last 30 days in R2
rclone delete r2:charles-cms-backups/ --min-age 30d
CRON
chmod +x /etc/cron.daily/backup-charles-cms
BACKUP
```

## Step 6: Hetzner Snapshots (optional)

```bash
# Create a snapshot manually
hcloud server create-image --type snapshot --description "charles-cms-$(date +%Y-%m-%d)" charles-cms

# To automate weekly snapshots, add a local cron job or use:
# hcloud server create-image in a scheduled script
```

## Updating the App

```bash
ssh root@$SERVER_IP << 'UPDATE'
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
cd /opt/charles-cms
git pull
npm install
npm run build
pm2 restart charles-cms
UPDATE
```

## CLI vs. Browser Summary

| Task                        | CLI | Browser required |
|-----------------------------|-----|------------------|
| Hetzner: create API token   |     | Yes (one-time)   |
| Hetzner: provision server   | Yes |                  |
| Hetzner: snapshots          | Yes |                  |
| Hetzner: firewall rules     | Yes |                  |
| Cloudflare: add new domain  |     | Yes (one-time)   |
| Cloudflare: DNS records     | Yes |                  |
| Cloudflare: R2 bucket       | Yes |                  |
| Cloudflare: R2 API token    |     | Yes (one-time)   |
| App deploy & updates        | Yes |                  |
| Backups                     | Yes |                  |

## Business Model: Handoff vs. Subscription

### Option A: Full Handoff

The client owns and operates the server themselves.

**What you deliver:**
- Access credentials for the VPS (or transfer ownership of the account)
- Documentation for common tasks (restart, update, backup restore)
- The domain transfer or DNS control

**Pros:**
- Clean break — one-time payment, no ongoing obligation
- Client has full control and ownership

**Cons:**
- Client becomes responsible for server maintenance, security updates, and troubleshooting
- Non-technical client will likely come back to you anyway (unpaid support)
- SQLite backups, Node.js updates, Caddy cert renewals — small but real maintenance tasks
- If something breaks at 2am, it's their problem (or yours, informally)

### Option B: Managed Subscription / Retainer

You own and operate the server. Client pays monthly for hosting + maintenance.

**What you deliver:**
- A working URL they can log into
- Uptime, backups, security updates handled by you
- A monthly or quarterly retainer (e.g., $50-150/mo depending on scope)

**Pros:**
- Recurring revenue
- You maintain control — easier to push updates, fix bugs, add features
- Client gets a "it just works" experience with no ops burden
- Natural upsell path: new features, integrations, reports

**Cons:**
- Ongoing obligation on your end
- Need to define scope clearly (what's included vs. billable)

### Option C: Hybrid — Handoff with Paid Support

Transfer ownership but offer an optional support retainer.

- Client owns the server and can walk away at any time
- You offer a support plan (e.g., $X/mo for Y hours of support + maintenance)
- If they cancel support, they're on their own

**Pros:**
- Client feels ownership, not locked in
- You still earn recurring revenue if they value the support
- Lower perceived risk for the client

**Cons:**
- Harder to enforce boundaries ("just one quick question" syndrome)
- If they cancel and break something, re-engaging is more expensive for both sides

## Open Questions

- What is Charles's technical comfort level? (Affects handoff viability)
- Is this app likely to need ongoing feature work, or is it "done"?
- What's the acceptable price range for a monthly subscription?
- Do you want monitoring/alerting (e.g., UptimeRobot) to know if the server goes down?
