import type { SubmissionRecord } from "../services/submissions/submissionsService";

/**
 * DB-backed store for questionnaire submissions (answers + resulting palette
 * + AI reasoning) — one record per completed personalization call. Powers
 * the dashboard's submissions table and the audience-insight analytics.
 */
export interface SubmissionsRepository {
  record(submission: SubmissionRecord): Promise<void>;
  getRecent(developerId?: string): Promise<SubmissionRecord[]>;
}
