import seedJobs from "@/mock-data/seed-jobs.json";
import type { Job } from "./jobs";

const JOBS = seedJobs as Job[];

export function getMockJobs(query: string): Job[] {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter((word) => word.length > 2);

  const filtered = JOBS.filter((job) => {
    const role = job.role.toLowerCase();
    const company = job.company.toLowerCase();
    const desc = job.description.toLowerCase();
    return (
      role.includes(q) ||
      company.includes(q) ||
      desc.includes(q) ||
      keywords.some((word) => role.includes(word) || company.includes(word) || desc.includes(word))
    );
  });

  const results = filtered.length ? filtered : JOBS;
  return results.slice(0, 5);
}
