import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  private directory: string;

  constructor() {
    this.directory = path.join(process.cwd(), "data", "emails");
    fs.mkdirSync(this.directory, { recursive: true });
  }

  async send(message: EmailMessage): Promise<void> {
    const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.json`;
    await fs.promises.writeFile(
      path.join(this.directory, fileName),
      JSON.stringify({ ...message, sentAt: new Date().toISOString() }, null, 2)
    );
    logger.info(`[email:console] to=${message.to.join(",")} subject=${message.subject}`);
  }
}

class NoopEmailProvider implements EmailProvider {
  async send(_message: EmailMessage): Promise<void> {
    // Intentionally does nothing; used in automated tests.
  }
}

class HttpEmailProvider implements EmailProvider {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: env.smtpFrom, ...message })
    });
    if (!response.ok) {
      throw new Error(`HTTP mail provider returned ${response.status}`);
    }
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  if (env.emailProvider === "none") {
    provider = new NoopEmailProvider();
  } else if (env.emailProvider === "http" && env.httpMailWebhookUrl) {
    provider = new HttpEmailProvider(env.httpMailWebhookUrl);
  } else if (env.emailProvider === "console") {
    provider = new ConsoleEmailProvider();
  } else {
    provider = new ConsoleEmailProvider();
    logger.warn(`Email provider "${env.emailProvider}" is not configured; falling back to console`);
  }
  return provider;
}
