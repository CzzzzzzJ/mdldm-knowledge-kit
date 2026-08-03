const AUTH_SECRET_KEY = "AUTH_SECRET";
const INITIAL_SETUP_TOKEN_KEY = "INITIAL_SETUP_TOKEN";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readEnvValue(content: string, key: string): string | undefined {
  const match = content.match(
    new RegExp(`^${escapeRegExp(key)}=(.*)$`, "m"),
  );
  return match?.[1]?.trim();
}

function setEnvValue(content: string, key: string, value: string): string {
  const pattern = new RegExp(`^${escapeRegExp(key)}=.*$`, "m");
  const next = pattern.test(content)
    ? content.replace(pattern, `${key}=${value}`)
    : `${content.trimEnd()}\n${key}=${value}`;

  return `${next.trimEnd()}\n`;
}

function isUsableAuthSecret(value: string | undefined): boolean {
  return Boolean(
    value && value.length >= 32 && !value.includes("replace-with"),
  );
}

export interface PrepareLocalEnvInput {
  exampleContent: string;
  existingContent?: string;
  generatedAuthSecret: string;
}

export interface PrepareLocalEnvResult {
  content: string;
  created: boolean;
  changed: boolean;
  generatedAuthSecret: boolean;
}

export function prepareLocalEnvContent({
  exampleContent,
  existingContent,
  generatedAuthSecret,
}: PrepareLocalEnvInput): PrepareLocalEnvResult {
  if (generatedAuthSecret.length < 32) {
    throw new Error("生成的 AUTH_SECRET 不足 32 位");
  }

  const created = existingContent === undefined;
  let content = existingContent ?? exampleContent;
  let changed = created;
  let authSecretGenerated = false;

  if (!isUsableAuthSecret(readEnvValue(content, AUTH_SECRET_KEY))) {
    content = setEnvValue(content, AUTH_SECRET_KEY, generatedAuthSecret);
    changed = true;
    authSecretGenerated = true;
  }

  if (created) {
    content = setEnvValue(content, INITIAL_SETUP_TOKEN_KEY, "");
  }

  return {
    content,
    created,
    changed,
    generatedAuthSecret: authSecretGenerated,
  };
}
