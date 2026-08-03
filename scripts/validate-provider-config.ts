import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { getServerEnv } from "@/config/env";
import { createXorPayRequestSignature } from "@/providers/payment/xorpay";
import { mongoDatabaseProvider } from "@/providers/database/mongodb/connection";
import { getEmailProvider } from "@/providers/email";
import { getStorageProvider } from "@/providers/storage";

type CheckStatus = "PASS" | "WARN" | "FAIL" | "SKIP";

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

const live = process.argv.includes("--live");
const results: CheckResult[] = [];

function add(name: string, status: CheckStatus, detail: string) {
  results.push({ name, status, detail });
}

function printResults() {
  for (const result of results) {
    console.log(`${result.status.padEnd(4)} ${result.name}: ${result.detail}`);
  }
}

async function main() {
  loadEnvConfig(process.cwd());

  try {
    const env = getServerEnv();
    add("config", "PASS", "运行时配置结构有效，未输出任何配置值");

    if (!live) {
      add("network", "SKIP", "使用 --live 执行无副作用连接检查");
    } else {
      const databaseHealth = await mongoDatabaseProvider.health();
      add(
        "mongodb",
        databaseHealth.status === "ok" ? "PASS" : "FAIL",
        databaseHealth.status === "ok"
          ? "Ping 成功"
          : "连接、鉴权或网络检查失败",
      );

      if (env.STORAGE_PROVIDER === "local") {
        try {
          await access(path.resolve(env.LOCAL_STORAGE_PATH), constants.R_OK);
          add("storage", "PASS", "Local Storage 路径可读");
        } catch {
          add("storage", "WARN", "Local Storage 路径尚未创建或不可读");
        }
      } else if (env.STORAGE_PROVIDER === "oss") {
        try {
          const probeKey =
            `__mdldm_provider_probe__/${randomUUID()}.does-not-exist`;
          const object = await getStorageProvider().stat(probeKey);
          add(
            "storage",
            object === null ? "PASS" : "WARN",
            object === null
              ? "OSS 鉴权 HEAD 请求成功，未写入对象"
              : "探针键意外存在，请检查 Bucket 前缀隔离",
          );
        } catch {
          add("storage", "FAIL", "OSS 连接、鉴权或 Bucket 权限检查失败");
        }
      }

      const email = getEmailProvider();
      if (email.name === "smtp") {
        const health = await email.health();
        add(
          "email",
          health.status === "ok" ? "PASS" : "FAIL",
          health.status === "ok"
            ? "SMTP 连接与认证成功，未发送邮件"
            : "SMTP 连接或认证失败",
        );
      } else {
        add("email", "SKIP", "Console Email 不执行外部连接");
      }
    }

    if (env.PAYMENT_PROVIDER === "xorpay") {
      const notifyUrl =
        env.XORPAY_NOTIFY_URL ??
        new URL("/api/payments/webhooks/xorpay", env.APP_URL).toString();
      const signature = createXorPayRequestSignature({
        name: "Provider validation",
        payType: "alipay",
        price: "0.01",
        orderNumber: "validation-only",
        notifyUrl,
        appSecret: env.XORPAY_APP_SECRET ?? "",
      });
      add(
        "payment",
        signature.length === 32 ? "WARN" : "FAIL",
        signature.length === 32
          ? "XorPay 配置与签名逻辑有效；商户鉴权需在隔离环境创建低价订单"
          : "XorPay 签名逻辑检查失败",
      );
    } else {
      add(
        "payment",
        "PASS",
        `${env.PAYMENT_PROVIDER} Provider 配置有效`,
      );
    }

    if (env.OBSERVABILITY_PROVIDER === "webhook") {
      add(
        "observability",
        "WARN",
        "Webhook 配置有效；L1 不发送测试告警",
      );
    } else {
      add("observability", "PASS", "Console Observability 可用");
    }

    add("transcode", "SKIP", "公共第一版明确禁用转码 Provider");
  } catch (error) {
    if (error instanceof ZodError) {
      for (const issue of error.issues) {
        add(
          `config.${issue.path.join(".") || "root"}`,
          "FAIL",
          issue.message,
        );
      }
    } else {
      add("config", "FAIL", "配置加载失败");
    }
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }

  printResults();

  if (results.some((result) => result.status === "FAIL")) {
    process.exitCode = 1;
  }
}

void main();
