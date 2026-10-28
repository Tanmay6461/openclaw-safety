import { hostMatches } from "../attest/normalize.js";

/**
 * Hosts where anyone can publish or receive data, so an allowlisted entry can still reach an
 * attacker (§5.6). Matched as host suffixes. Hosting platforms that are in the Public Suffix
 * List's private section (vercel.app, github.io, ...) are already separate sites, but are listed
 * anyway in case someone allowlists the parent.
 */
export const SHARED_HOSTING: readonly string[] = [
  // Code hosts and raw content
  "github.com", "githubusercontent.com", "github.io", "gitlab.com", "gitlab.io", "bitbucket.org",
  "codeberg.org", "sourceforge.net", "huggingface.co",
  // Documents, forms, storage
  "docs.google.com", "drive.google.com", "sites.google.com", "script.google.com", "forms.gle",
  "storage.googleapis.com", "firebasestorage.googleapis.com", "notion.so", "notion.site",
  "dropbox.com", "dropboxusercontent.com", "box.com", "onedrive.live.com", "1drv.ms",
  "sharepoint.com", "forms.office.com", "typeform.com", "airtable.com", "s3.amazonaws.com",
  "blob.core.windows.net", "r2.dev",
  // Paste sites
  "pastebin.com", "paste.ee", "hastebin.com", "dpaste.org", "rentry.co", "ghostbin.com", "justpaste.it",
  // Request catchers and tunnels
  "webhook.site", "requestbin.com", "pipedream.net", "beeceptor.com", "ngrok.io", "ngrok-free.app",
  "ngrok.app", "trycloudflare.com", "loca.lt", "serveo.net", "interact.sh", "oast.fun", "burpcollaborator.net",
  // Hosting platforms
  "workers.dev", "pages.dev", "vercel.app", "netlify.app", "herokuapp.com", "glitch.me", "replit.dev",
  "repl.co", "fly.dev", "onrender.com", "web.app", "firebaseapp.com", "azurewebsites.net",
  // Chat webhooks and bot APIs
  "hooks.slack.com", "discord.com", "discordapp.com", "api.telegram.org",
];

export function isSharedHosting(host: string): boolean {
  return SHARED_HOSTING.some((d) => hostMatches(host, d));
}
