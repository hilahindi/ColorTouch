import type { Collection, Db } from "mongodb";

import type { SubmissionsRepository } from "./submissionsRepository";
import type { SubmissionRecord } from "../services/submissions/submissionsService";

type SubmissionDoc = SubmissionRecord & { _id: string };

export class MongoSubmissionsRepository implements SubmissionsRepository {
  private readonly collection: Collection<SubmissionDoc>;

  constructor(db: Db) {
    this.collection = db.collection<SubmissionDoc>("submissions");
  }

  async record(submission: SubmissionRecord): Promise<void> {
    await this.collection.insertOne({ _id: submission.submission_id, ...submission });
  }

  async getRecent(developerId?: string): Promise<SubmissionRecord[]> {
    const filter = developerId ? { developer_id: developerId } : {};
    const docs = await this.collection.find(filter).sort({ submitted_at: -1 }).toArray();
    return docs.map(({ _id: _omit, ...record }) => record);
  }

  async delete(submissionId: string): Promise<void> {
    await this.collection.deleteOne({ _id: submissionId });
  }

  async deleteAll(developerId: string): Promise<void> {
    await this.collection.deleteMany({ developer_id: developerId });
  }
}
