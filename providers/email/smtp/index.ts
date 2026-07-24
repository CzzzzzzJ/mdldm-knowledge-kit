import nodemailer from "nodemailer";

import { getServerEnv } from "@/config/env";
import type {
  EmailProvider,
  IdentityEmail,
} from "@/providers/email/port";

function createTransport() {
  const env = getServerEnv();
  if (
    !env.EMAIL_FROM ||
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD
  ) {
    throw new Error("SMTP 配置不完整");
  }

  return {
    from: env.EMAIL_FROM,
    transport: nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  };
}

function emailCopy(message: IdentityEmail): {
  subject: string;
  text: string;
} {
  if (message.kind === "verify_email") {
    return {
      subject: "验证你的 mdldm Knowledge Kit 邮箱",
      text: `${message.recipientName}，你好：\n\n请打开下面的链接完成邮箱验证。链接仅在限定时间内有效：\n${message.actionUrl}\n\n如果不是你发起的注册，请忽略此邮件。`,
    };
  }

  return {
    subject: "重置你的 mdldm Knowledge Kit 密码",
    text: `${message.recipientName}，你好：\n\n请打开下面的链接设置新密码。链接只能使用一次：\n${message.actionUrl}\n\n如果不是你发起的操作，请忽略此邮件并保留原密码。`,
  };
}

export const smtpEmailProvider: EmailProvider = {
  name: "smtp",

  async sendIdentityEmail(message) {
    const { from, transport } = createTransport();
    await transport.sendMail({
      from,
      to: message.to,
      ...emailCopy(message),
    });
  },

  async health() {
    try {
      const { transport } = createTransport();
      await transport.verify();
      return { status: "ok" };
    } catch {
      return {
        status: "error",
        message: "SMTP 连接或认证失败",
      };
    }
  },
};
