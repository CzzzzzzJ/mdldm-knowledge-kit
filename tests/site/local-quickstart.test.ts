import { describe, expect, it } from "vitest";

import { prepareLocalEnvContent } from "@/modules/site/local-quickstart";

const example = `APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-value
INITIAL_SETUP_TOKEN=replace-with-one-time-setup-token
STORAGE_PROVIDER=local
`;

describe("prepareLocalEnvContent", () => {
  it("creates a local environment without exposing placeholder secrets", () => {
    const result = prepareLocalEnvContent({
      exampleContent: example,
      generatedAuthSecret: "a".repeat(64),
    });

    expect(result).toMatchObject({
      created: true,
      changed: true,
      generatedAuthSecret: true,
    });
    expect(result.content).toContain(`AUTH_SECRET=${"a".repeat(64)}`);
    expect(result.content).toContain("INITIAL_SETUP_TOKEN=\n");
    expect(result.content).not.toContain("replace-with-a-long-random-value");
  });

  it("preserves an existing valid secret and all other settings", () => {
    const existing = `APP_NAME=Creator Site
AUTH_SECRET=${"b".repeat(64)}
INITIAL_SETUP_TOKEN=private-local-token-value
`;
    const result = prepareLocalEnvContent({
      exampleContent: example,
      existingContent: existing,
      generatedAuthSecret: "c".repeat(64),
    });

    expect(result).toEqual({
      content: existing,
      created: false,
      changed: false,
      generatedAuthSecret: false,
    });
  });

  it("repairs only an invalid secret in an existing environment", () => {
    const existing = `APP_NAME=Creator Site
AUTH_SECRET=short
PAYMENT_PROVIDER=manual
`;
    const result = prepareLocalEnvContent({
      exampleContent: example,
      existingContent: existing,
      generatedAuthSecret: "d".repeat(64),
    });

    expect(result.created).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.generatedAuthSecret).toBe(true);
    expect(result.content).toContain(`AUTH_SECRET=${"d".repeat(64)}`);
    expect(result.content).toContain("PAYMENT_PROVIDER=manual");
    expect(result.content).not.toContain("INITIAL_SETUP_TOKEN=");
  });

  it("rejects an invalid generated secret", () => {
    expect(() =>
      prepareLocalEnvContent({
        exampleContent: example,
        generatedAuthSecret: "too-short",
      }),
    ).toThrow(/AUTH_SECRET/);
  });
});
