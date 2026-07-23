export interface CourseProgress {
  userId: string;
  courseId: string;
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
}
