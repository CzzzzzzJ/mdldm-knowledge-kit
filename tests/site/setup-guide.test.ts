import { describe, expect, it } from "vitest";

import {
  getSetupLesson,
  setupLessons,
} from "@/modules/site/setup-guide";

describe("operator setup guide", () => {
  it("provides a complete in-project journey with stable slugs", () => {
    expect(setupLessons).toHaveLength(8);
    expect(new Set(setupLessons.map((lesson) => lesson.slug)).size).toBe(
      setupLessons.length,
    );
    expect(setupLessons[0]?.slug).toBe("welcome");
    expect(setupLessons.at(-1)?.slug).toBe("acceptance");
  });

  it("explains purpose, action, validation and an agent prompt on every screen", () => {
    for (const lesson of setupLessons) {
      expect(lesson.purpose.length).toBeGreaterThan(20);
      expect(lesson.actions.length).toBeGreaterThanOrEqual(3);
      expect(lesson.validation.command.length).toBeGreaterThan(0);
      expect(lesson.validation.expected.length).toBeGreaterThan(10);
      expect(lesson.prompt).toContain("当前 mdldm-knowledge-kit 仓库");
      expect(lesson.prompt).toContain("不创建第二个项目");
      expect(lesson.prompt).toContain("不输出、记录或提交任何密钥");
    }
  });

  it("falls back to the welcome lesson for an unknown query", () => {
    expect(getSetupLesson("missing").slug).toBe("welcome");
    expect(getSetupLesson("database").slug).toBe("database");
  });
});
