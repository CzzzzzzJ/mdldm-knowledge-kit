import type {
  EmailProvider,
  IdentityEmail,
} from "@/providers/email/port";

export const consoleEmailProvider: EmailProvider = {
  name: "console",

  async sendIdentityEmail(message: IdentityEmail) {
    const action =
      message.kind === "verify_email" ? "验证邮箱" : "重置密码";
    console.info(
      `[Console Email] ${action} | ${message.to} | ${message.actionUrl}`,
    );
  },

  async health() {
    return {
      status: "ok",
      message: "Console Email 仅将邮件链接写入服务端日志",
    };
  },
};
