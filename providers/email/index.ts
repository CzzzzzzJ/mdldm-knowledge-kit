import { getServerEnv } from "@/config/env";
import { consoleEmailProvider } from "@/providers/email/console";
import type { EmailProvider } from "@/providers/email/port";
import { smtpEmailProvider } from "@/providers/email/smtp";

export function getEmailProvider(): EmailProvider {
  return getServerEnv().EMAIL_PROVIDER === "smtp"
    ? smtpEmailProvider
    : consoleEmailProvider;
}
