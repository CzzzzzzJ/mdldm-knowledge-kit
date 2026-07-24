export interface IdentityEmail {
  to: string;
  recipientName: string;
  actionUrl: string;
  kind: "verify_email" | "reset_password";
}

export interface EmailProvider {
  readonly name: "console" | "smtp";
  sendIdentityEmail(message: IdentityEmail): Promise<void>;
  health(): Promise<{ status: "ok" | "error"; message?: string }>;
}
