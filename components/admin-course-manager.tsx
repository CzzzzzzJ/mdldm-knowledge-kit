"use client";

import { useState, type FormEvent } from "react";

interface SeriesOption {
  id: string;
  title: string;
  status: string;
}

interface CourseOption {
  id: string;
  seriesId: string;
  title: string;
  status: string;
  accessLevel: string;
  videoAssetId: string | null;
}

async function readPayload(response: Response): Promise<{
  error?: string;
  asset?: { id: string };
}> {
  return (await response.json()) as {
    error?: string;
    asset?: { id: string };
  };
}

export function AdminCourseManager({
  series,
  courses,
}: {
  series: SeriesOption[];
  courses: CourseOption[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
      setBusy(false);
    }
  }

  function submitSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void run(async () => {
      const response = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          slug: form.get("slug"),
          description: form.get("description"),
          accessLevel: form.get("accessLevel"),
        }),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "创建系列失败");
      }
    });
  }

  function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void run(async () => {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId: form.get("seriesId"),
          title: form.get("title"),
          slug: form.get("slug"),
          summary: form.get("summary"),
          accessLevel: form.get("accessLevel"),
          position: Number(form.get("position")),
        }),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "创建课时失败");
      }
    });
  }

  function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const courseId = String(form.get("courseId"));
    form.set("kind", "video");

    void run(async () => {
      const upload = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      const uploadPayload = await readPayload(upload);
      if (!upload.ok || !uploadPayload.asset) {
        throw new Error(uploadPayload.error ?? "上传视频失败");
      }

      const attach = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoAssetId: uploadPayload.asset.id }),
      });
      const attachPayload = await readPayload(attach);
      if (!attach.ok) {
        throw new Error(attachPayload.error ?? "绑定视频失败");
      }
    });
  }

  function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const courseId = String(form.get("courseId"));
    const title = String(form.get("title"));
    const accessLevel = String(form.get("accessLevel"));
    const position = Number(form.get("position"));
    form.set("kind", "document");

    void run(async () => {
      const upload = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      const uploadPayload = await readPayload(upload);
      if (!upload.ok || !uploadPayload.asset) {
        throw new Error(uploadPayload.error ?? "上传资料失败");
      }

      const attach = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          mediaAssetId: uploadPayload.asset.id,
          title,
          accessLevel,
          position,
        }),
      });
      const attachPayload = await readPayload(attach);
      if (!attach.ok) {
        throw new Error(attachPayload.error ?? "绑定资料失败");
      }
    });
  }

  function publishCourse(courseId: string) {
    void run(async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/publish`, {
        method: "POST",
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "发布失败");
      }
    });
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  const inputClass =
    "focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5";

  return (
    <div className="mt-10 grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {message || "所有写操作都要求管理员会话和同源请求。"}
        </p>
        <button
          className="focus-ring rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
          disabled={busy}
          onClick={() => void logout()}
          type="button"
        >
          退出登录
        </button>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <form className="surface grid gap-4 p-6" onSubmit={submitSeries}>
          <h2 className="text-xl font-semibold">创建系列</h2>
          <input
            aria-label="系列名称"
            className={inputClass}
            name="title"
            placeholder="系列名称"
            required
          />
          <input
            aria-label="系列 Slug"
            className={inputClass}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="creator-foundations"
            required
          />
          <textarea
            aria-label="系列简介"
            className={inputClass}
            name="description"
            placeholder="系列简介"
            required
            rows={3}
          />
          <select
            aria-label="系列访问等级"
            className={inputClass}
            defaultValue="public"
            name="accessLevel"
          >
            <option value="public">公开</option>
            <option value="registered">登录可看</option>
            <option value="member">会员</option>
          </select>
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy}
            type="submit"
          >
            创建系列
          </button>
        </form>

        <form className="surface grid gap-4 p-6" onSubmit={submitCourse}>
          <h2 className="text-xl font-semibold">创建课时</h2>
          <select
            aria-label="所属系列"
            className={inputClass}
            name="seriesId"
            required
          >
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input
            aria-label="课时名称"
            className={inputClass}
            name="title"
            placeholder="课时名称"
            required
          />
          <input
            aria-label="课时 Slug"
            className={inputClass}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="first-lesson"
            required
          />
          <textarea
            aria-label="课时简介"
            className={inputClass}
            name="summary"
            placeholder="课时简介"
            required
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              aria-label="课时访问等级"
              className={inputClass}
              defaultValue="public"
              name="accessLevel"
            >
              <option value="public">公开</option>
              <option value="registered">登录可看</option>
              <option value="member">会员</option>
              <option value="course">单课</option>
              <option value="series">系列</option>
            </select>
            <input
              aria-label="课时排序"
              className={inputClass}
              defaultValue="0"
              min="0"
              name="position"
              required
              type="number"
            />
          </div>
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy || series.length === 0}
            type="submit"
          >
            创建课时
          </button>
        </form>
      </section>

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">课时发布</h2>
        <div className="mt-5 grid gap-3">
          {courses.map((course) => (
            <div
              className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 md:grid-cols-[1fr_auto]"
              key={course.id}
            >
              <div>
                <p className="font-semibold">{course.title}</p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {course.status} / {course.accessLevel} /{" "}
                  {course.videoAssetId ? "video ready" : "no video"}
                </p>
              </div>
              <button
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={busy || course.status === "published"}
                onClick={() => publishCourse(course.id)}
                type="button"
              >
                发布
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form className="surface grid gap-4 p-6" onSubmit={uploadVideo}>
          <h2 className="text-xl font-semibold">上传并绑定 MP4</h2>
          <select
            aria-label="视频所属课时"
            className={inputClass}
            name="courseId"
            required
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <input
            accept="video/mp4"
            aria-label="MP4 视频文件"
            className={inputClass}
            name="file"
            required
            type="file"
          />
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy || courses.length === 0}
            type="submit"
          >
            上传视频
          </button>
        </form>

        <form className="surface grid gap-4 p-6" onSubmit={uploadMaterial}>
          <h2 className="text-xl font-semibold">上传课程资料</h2>
          <select
            aria-label="资料所属课时"
            className={inputClass}
            name="courseId"
            required
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <input
            aria-label="资料名称"
            className={inputClass}
            name="title"
            placeholder="资料名称"
            required
          />
          <input
            accept=".pdf,.zip,.txt,.md"
            aria-label="课程资料文件"
            className={inputClass}
            name="file"
            required
            type="file"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              aria-label="资料访问等级"
              className={inputClass}
              defaultValue="public"
              name="accessLevel"
            >
              <option value="public">公开</option>
              <option value="registered">登录可见</option>
              <option value="member">会员</option>
              <option value="course">单课</option>
              <option value="series">系列</option>
            </select>
            <input
              aria-label="资料排序"
              className={inputClass}
              defaultValue="0"
              min="0"
              name="position"
              required
              type="number"
            />
          </div>
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy || courses.length === 0}
            type="submit"
          >
            上传资料
          </button>
        </form>
      </section>
    </div>
  );
}
