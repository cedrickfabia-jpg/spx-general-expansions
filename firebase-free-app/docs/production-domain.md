# Production Domain Setup

The app is currently live at https://spx-netdev.web.app

To use a company domain like https://www.generalexpansions.com:

1. Open Firebase Console > Hosting > spx-netdev.
2. Click **Add custom domain**.
3. Enter your domain, for example `www.generalexpansions.com`.
4. Firebase will show DNS records to add at your domain registrar.
5. Add the records in your DNS provider.
6. Wait for DNS to propagate, then Firebase will issue HTTPS automatically.

After the custom domain is connected:

- The app will be reachable at the custom domain.
- Firebase Auth must authorize the domain in Authentication > Settings > Authorized domains.
- If any Google Cloud OAuth is used, add the custom domain to authorized JavaScript origins.
- Share the new domain with me so I can update the app URL and any related configuration.

Do not delete `spx-netdev.web.app` until the custom domain is fully live.
