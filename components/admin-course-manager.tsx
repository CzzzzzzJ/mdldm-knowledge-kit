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

async function uploadMedia(form: FormData): Promise<{ id: string }> {
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File) || typeof kind !== "string") {
    throw new Error("请选择要上传的文件");
  }

  const ticketResponse = await fetch("/api/admin/media/upload-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  const ticket = (await ticketResponse.json()) as {
    error?: string;
    mode?: "proxy" | "direct";
    assetId?: string;
    uploadUrl?: string;
  };
  if (!ticketResponse.ok) {
    throw new Error(ticket.error ?? "创建上传任务失败");
  }

  if (ticket.mode === "proxy") {
    const upload = await fetch("/api/admin/media", {
      method: "POST",
      body: form,
    });
    const payload = await readPayload(upload);
    if (!upload.ok || !payload.asset) {
      throw new Error(payload.error ?? "上传文件失败");
    }
    return payload.asset;
  }

  if (!ticket.assetId || !ticket.uploadUrl) {
    throw new Error("直传任务信息不完整");
  }

  const upload = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!upload.ok) {
    throw new Error("上传到对象存储失败，请检查 OSS CORS 和 RAM 权限");
  }

  const complete = await fetch(
    `/api/admin/media/${ticket.assetId}/complete`,
    { method: "POST" },
  );
  const payload = await readPayload(complete);
  if (!complete.ok || !payload.asset) {
    throw new Error(payload.error ?? "确认上传结果失败");
  }
  return payload.asset;
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
          category: form.get("category"),
          tags: String(form.get("tags") ?? "")
            .split(/[,，]/u)
            .map((tag) => tag.trim())
            .filter(Boolean),
          coverImageUrl: form.get("coverImageUrl"),
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
      const asset = await uploadMedia(form);

      const attach = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoAssetId: asset.id }),
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
      const asset = await uploadMedia(form);

      const attach = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          mediaAssetId: asset.id,
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

  const inputClass =
    "focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5";
  const fieldClass = "grid gap-2 text-sm font-medium";
  const helpClass = "text-xs font-normal leading-5 text-[var(--muted)]";

  return (
    <div className="mt-10 grid gap-8">
      <div>
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {message ||
            (busy
              ? "正在处理，请不要关闭页面。"
              : "建议按 1-5 的顺序完成：先建系列和课时，再上传内容，确认后发布。")}
        </p>
      </div>

      <section className="grid gap-4">
        <div>
          <p className="eyebrow">搭好课程结构</p>
          <h2 className="mt-2 text-2xl font-semibold">先创建系列，再添加课时</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            系列是一组相关课程的合集，课时是学员实际观看的一节内容。第一次使用时，先创建一个系列，
            再在这个系列下创建第一节课。
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
        <form className="surface grid gap-4 p-6" onSubmit={submitSeries}>
          <div>
            <p className="eyebrow">创建系列</p>
            <h3 className="mt-2 text-xl font-semibold">创建课程系列</h3>
          </div>
          <label className={fieldClass}>
            系列名称
            <input
              className={inputClass}
              name="title"
              placeholder="例如：AI 博主入门课"
              required
            />
          </label>
          <label className={fieldClass}>
            网址标识（英文小写和连字符）
            <input
              className={inputClass}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="ai-creator-basics"
              required
            />
            <span className={helpClass}>
              用在系列网址中，只能填写英文小写字母、数字和连字符，例如 ai-creator-basics。
            </span>
          </label>
          <label className={fieldClass}>
            系列简介
            <textarea
              className={inputClass}
              name="description"
              placeholder="告诉学员这个系列能解决什么问题、适合谁学习"
              required
              rows={3}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldClass}>
              分类
              <input
                className={inputClass}
                maxLength={40}
                name="category"
                placeholder="例如：AI 内容创作"
              />
              <span className={helpClass}>用于课程列表筛选；没有明确分类时可以暂时留空。</span>
            </label>
            <label className={fieldClass}>
              标签
              <input
                className={inputClass}
                name="tags"
                placeholder="例如：Codex, 提示词, 自媒体"
              />
              <span className={helpClass}>多个标签用中文或英文逗号分隔，最多 10 个。</span>
            </label>
          </div>
          <label className={fieldClass}>
            系列封面 URL
            <input
              className={inputClass}
              maxLength={2048}
              name="coverImageUrl"
              placeholder="https://example.com/cover.jpg"
            />
            <span className={helpClass}>
              选填。建议使用已经上传到 OSS 或图床的 HTTPS 图片地址。
            </span>
          </label>
          <label className={fieldClass}>
            系列访问等级
            <select
              className={inputClass}
              defaultValue="public"
              name="accessLevel"
            >
              <option value="public">公开：所有人都能访问</option>
              <option value="registered">登录可看：注册用户可访问</option>
              <option value="member">会员：有效会员可访问</option>
            </select>
            <span className={helpClass}>
              系列等级决定系列页面的默认门槛；每节课还可以单独设置更具体的权限。
            </span>
          </label>
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy}
            type="submit"
          >
            创建系列
          </button>
        </form>

        <form className="surface grid gap-4 p-6" onSubmit={submitCourse}>
          <div>
            <p className="eyebrow">创建课时</p>
            <h3 className="mt-2 text-xl font-semibold">创建一节课</h3>
          </div>
          <label className={fieldClass}>
            所属系列
            <select className={inputClass} name="seriesId" required>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <span className={helpClass}>
              {series.length === 0
                ? "请先完成左侧的系列创建，至少需要一个系列。"
                : "选择这节课要出现在哪个系列中。"}
            </span>
          </label>
          <label className={fieldClass}>
            课时名称
            <input
              className={inputClass}
              name="title"
              placeholder="例如：第 1 课，认识 Codex"
              required
            />
          </label>
          <label className={fieldClass}>
            网址标识（英文小写和连字符）
            <input
              className={inputClass}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="meet-codex"
              required
            />
            <span className={helpClass}>
              用在课时网址中，只能填写英文小写字母、数字和连字符，例如 meet-codex。
            </span>
          </label>
          <label className={fieldClass}>
            课时简介
            <textarea
              className={inputClass}
              name="summary"
              placeholder="用一两句话说明学完这节课能得到什么"
              required
              rows={3}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldClass}>
              课时访问等级
              <select
                className={inputClass}
                defaultValue="public"
                name="accessLevel"
              >
                <option value="public">公开：所有人都能学习</option>
                <option value="registered">登录可看：注册后可学习</option>
                <option value="member">会员：有效会员可学习</option>
                <option value="course">单课购买：购买本课后可学习</option>
                <option value="series">系列购买：获得本系列权益后可学习</option>
              </select>
            </label>
            <label className={fieldClass}>
              课时排序
              <input
                className={inputClass}
                defaultValue="0"
                min="0"
                name="position"
                required
                type="number"
              />
              <span className={helpClass}>数字越小越靠前，第一节课通常填写 0。</span>
            </label>
          </div>
          <button
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
            disabled={busy || series.length === 0}
            type="submit"
          >
            创建课时
          </button>
        </form>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <p className="eyebrow">添加学习内容</p>
          <h2 className="mt-2 text-2xl font-semibold">为课时上传视频和配套资料</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            视频是发布课程的必要内容；PDF、ZIP、Markdown 等资料为选填。上传完成后，
            系统会自动把文件绑定到所选课时。
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <form className="surface grid gap-4 p-6" onSubmit={uploadVideo}>
            <div>
              <p className="eyebrow">上传视频</p>
              <h3 className="mt-2 text-xl font-semibold">上传并绑定 MP4 视频</h3>
            </div>
            <label className={fieldClass}>
              视频所属课时
              <select className={inputClass} name="courseId" required>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {courses.length === 0 ? (
                <span className={helpClass}>请先创建至少一节课。</span>
              ) : null}
            </label>
            <label className={fieldClass}>
              MP4 视频文件
              <input
                accept="video/mp4"
                className={inputClass}
                name="file"
                required
                type="file"
              />
              <span className={helpClass}>
                当前支持 MP4。大文件会根据存储配置自动直传 OSS。
              </span>
            </label>
            <button
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
              disabled={busy || courses.length === 0}
              type="submit"
            >
              上传视频
            </button>
          </form>

          <form className="surface grid gap-4 p-6" onSubmit={uploadMaterial}>
            <div>
              <p className="eyebrow">配套资料（选填）</p>
              <h3 className="mt-2 text-xl font-semibold">上传课程资料</h3>
            </div>
            <label className={fieldClass}>
              资料所属课时
              <select className={inputClass} name="courseId" required>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={fieldClass}>
              资料名称
              <input
                className={inputClass}
                name="title"
                placeholder="例如：本节课提示词模板"
                required
              />
            </label>
            <label className={fieldClass}>
              课程资料文件
              <input
                accept=".pdf,.zip,.txt,.md"
                className={inputClass}
                name="file"
                required
                type="file"
              />
              <span className={helpClass}>支持 PDF、ZIP、TXT 和 Markdown 文件。</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldClass}>
                资料访问等级
                <select
                  className={inputClass}
                  defaultValue="public"
                  name="accessLevel"
                >
                  <option value="public">公开：所有人可下载</option>
                  <option value="registered">登录可见：注册后可下载</option>
                  <option value="member">会员：有效会员可下载</option>
                  <option value="course">单课购买：购买本课后可下载</option>
                  <option value="series">系列购买：获得系列权益后可下载</option>
                </select>
              </label>
              <label className={fieldClass}>
                资料排序
                <input
                  className={inputClass}
                  defaultValue="0"
                  min="0"
                  name="position"
                  required
                  type="number"
                />
                <span className={helpClass}>数字越小越靠前。</span>
              </label>
            </div>
            <button
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
              disabled={busy || courses.length === 0}
              type="submit"
            >
              上传资料
            </button>
          </form>
        </div>
      </section>

      <section className="surface p-6">
        <p className="eyebrow">上线前确认</p>
        <h2 className="mt-2 text-xl font-semibold">发布课程</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          请先确认标题、权限和视频都正确。发布后，符合访问条件的学员就能在前台看到并学习课程。
        </p>
        <div className="mt-5 grid gap-3">
          {courses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
              还没有可发布的课时。请先创建系列和课时。
            </p>
          ) : null}
          {courses.map((course) => (
            <div
              className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 md:grid-cols-[1fr_auto]"
              key={course.id}
            >
              <div>
                <p className="font-semibold">{course.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  状态：{course.status === "published" ? "已发布" : "草稿"}
                  {" · "}
                  权限：
                  {{
                    public: "公开",
                    registered: "登录可看",
                    member: "会员",
                    course: "单课购买",
                    series: "系列购买",
                  }[course.accessLevel] ?? course.accessLevel}
                  {" · "}
                  视频：{course.videoAssetId ? "已绑定" : "未绑定"}
                </p>
                {!course.videoAssetId ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    发布前请先上传视频。
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={busy || course.status === "published"}
                onClick={() => publishCourse(course.id)}
                type="button"
              >
                {course.status === "published" ? "已发布" : "确认并发布"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
