"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  assetId: string;
  courseId: string;
  title: string;
}

interface SavedProgress {
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

export function VideoPlayer({
  assetId,
  courseId,
  title,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAt = useRef(0);
  const [status, setStatus] = useState("进度将在本机保存");

  useEffect(() => {
    const currentPlayer = videoRef.current;
    if (!currentPlayer) {
      return;
    }
    const player: HTMLVideoElement = currentPlayer;

    const localKey = `mdldm-progress:${courseId}`;

    async function loadProgress() {
      let saved: SavedProgress | null = null;

      const response = await fetch(`/api/courses/${courseId}/progress`);
      if (response.ok) {
        const payload = (await response.json()) as {
          progress: SavedProgress | null;
        };
        saved = payload.progress;
        setStatus("已连接账号学习进度");
      } else {
        const local = window.localStorage.getItem(localKey);
        saved = local ? (JSON.parse(local) as SavedProgress) : null;
      }

      if (saved && saved.currentTimeSeconds > 0) {
        player.currentTime = saved.currentTimeSeconds;
      }
    }

    async function saveProgress(completed = false) {
      const currentTimeSeconds = player.currentTime;
      const durationSeconds = Number.isFinite(player.duration)
        ? player.duration
        : 0;
      const progress = {
        currentTimeSeconds,
        durationSeconds,
        completed,
      };

      window.localStorage.setItem(localKey, JSON.stringify(progress));

      const response = await fetch(`/api/courses/${courseId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progress),
      });

      if (response.ok) {
        setStatus(completed ? "课程已完成" : "账号进度已保存");
      } else {
        setStatus(completed ? "已在本机标记完成" : "本机进度已保存");
      }
    }

    function handleLoadedMetadata() {
      void loadProgress();
    }

    function handleTimeUpdate() {
      const now = Date.now();
      if (now - lastSavedAt.current >= 10_000) {
        lastSavedAt.current = now;
        void saveProgress();
      }
    }

    function handleEnded() {
      void saveProgress(true);
    }

    player.addEventListener("loadedmetadata", handleLoadedMetadata);
    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("loadedmetadata", handleLoadedMetadata);
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("ended", handleEnded);
    };
  }, [courseId]);

  return (
    <div>
      <video
        className="aspect-video w-full rounded-xl bg-[#0d1117]"
        controls
        playsInline
        preload="metadata"
        ref={videoRef}
        src={`/api/media/${assetId}/stream`}
        title={title}
      />
      <p aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">
        {status}
      </p>
    </div>
  );
}
