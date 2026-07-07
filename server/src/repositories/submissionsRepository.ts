import type { SubmissionRecord } from "../services/submissions/submissionsService";

/**
 * DB-backed store for questionnaire submissions (answers + resulting palette
 * + AI reasoning) — one record per completed personalization call. Powers
 * the dashboard's submissions table and the audience-insight analytics.
 */
export interface SubmissionsRepository {
  record(submission: SubmissionRecord): Promise<void>;
  getRecent(developerId?: string): Promise<SubmissionRecord[]>;
  /** Returns the deleted record (so callers can cascade by user_id), or null if not found. */
  delete(submissionId: string): Promise<SubmissionRecord | null>;
  /** Returns the deleted records (so callers can cascade by user_id). */
  deleteAll(developerId: string): Promise<SubmissionRecord[]>;
}
