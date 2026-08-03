import { getServerEnv } from "@/config/env";
import { consoleEmailProvider } from "@/providers/email/console";
import type { EmailProvider } from "@/providers/email/port";

const lazySmtpEmailProvider: EmailProvider = {
  name: "smtp",

  async sendIdentityEmail(message) {
    const { smtpEmailProvider } = await import("@/providers/email/smtp");
    return smtpEmailProvider.sendIdentityEmail(message);
  },

  async health() {
    const { smtpEmailProvider } = await import("@/providers/email/smtp");
    return smtpEmailProvider.health();
  },
};

export function getEmailProvider(): EmailProvider {
  return getServerEnv().EMAIL_PROVIDER === "smtp"
    ? lazySmtpEmailProvider
    : consoleEmailProvider;
}
