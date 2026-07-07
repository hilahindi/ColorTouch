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

  async delete(submissionId: string): Promise<SubmissionRecord | null> {
    const doc = await this.collection.findOneAndDelete({ _id: submissionId });
    if (!doc) return null;
    const { _id: _omit, ...record } = doc;
    return record;
  }

  async deleteAll(developerId: string): Promise<SubmissionRecord[]> {
    const docs = await this.collection.find({ developer_id: developerId }).toArray();
    await this.collection.deleteMany({ developer_id: developerId });
    return docs.map(({ _id: _omit, ...record }) => record);
  }
}
