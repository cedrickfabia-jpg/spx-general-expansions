# Deployment Guide: www.generalexpansions.com

This guide assumes you own or can register `generalexpansions.com` and can access
your DNS provider. The app is a Next.js project with a `pnpm-lock.yaml`.

## 1. Choose a host

The easiest option for this project is Vercel, because it supports Next.js and
auto-provisions HTTPS. Railway, Render, or any Node.js host also work.

Vercel steps:

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new project and import the repository.
3. Framework preset: Next.js.
4. Build command: leave default (Vercel will use `next build`).
5. Output directory: leave default.

## 2. Configure environment variables

Add these in Vercel or your hosting platform:

| Variable | Value |
| --- | --- |
| `APP_URL` | `https://www.generalexpansions.com` |
| `APP_NAME` | `General Expansions` |
| `ORG_DOMAIN` | `spxexpress.com` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://www.generalexpansions.com/api/auth/callback` |
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -base64 48`) |
| `DATABASE_URL` | Production database string or persistent file path |
| `STORAGE_PROVIDER` | `local` on a persistent disk, or your S3-compatible provider |
| `EMAIL_PROVIDER` | `console`, `http`, or your SMTP provider settings |

## 3. Google Cloud OAuth

1. Go to Google Cloud Console > APIs & Services > Credentials.
2. Create an OAuth client ID, application type: Web application.
3. Authorized redirect URI: `https://www.generalexpansions.com/api/auth/callback`
4. Copy the client ID and secret into the environment variables above.
5. If the Google account is `firstname.lastname@spxexpress.com`, make sure that
   address belongs to your Google Workspace domain and that the consent screen
   includes the same domain.

The app already enforces `@spxexpress.com` server-side, so Gmail or other
domains will be rejected.

## 4. DNS

At your domain registrar or DNS provider:

- Create a `CNAME` record:
  - Host: `www`
  - Value: `cname.vercel-dns.com` (or your host's CNAME target)
- Create an `A` record for the apex:
  - Host: `@`
  - Value: `76.76.21.21` (Vercel default; use your host's value if different)

If your provider supports ALIAS records, point `@` to your host instead.

## 5. HTTPS

On Vercel, HTTPS is issued automatically after DNS propagates. No manual
certificate step is needed.

On a custom server, use Caddy or nginx with Let's Encrypt:

- Caddy: `www.generalexpansions.com { reverse_proxy localhost:3000 }`
- nginx: proxy port 3000 and configure `certbot --nginx -d www.generalexpansions.com`

## 6. Deploy and verify

1. Deploy the project.
2. Open `https://www.generalexpansions.com/login`.
3. Sign in with a `firstname.lastname@spxexpress.com` Google account.
4. Confirm the Google redirect lands on `/dashboard`.
5. Confirm the login redirect URI in Google Cloud matches exactly.

## Local server reminder

`http://localhost:3000` only works on the machine running the server. Your
officemates will only be able to open the site from `https://www.generalexpansions.com`
after DNS, HTTPS, and deployment are complete.
