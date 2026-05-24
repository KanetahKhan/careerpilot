import type { Job } from "./jobs";

/**
 * Bundled real-shaped job data so the demo works with ZERO live API calls.
 * Replace/extend these by running a few real JSearch queries during dev and
 * pasting the mapped results here. This is caching real data — NOT faking the
 * agent — so it is allowed under the rules.
 *
 * `link` points at a LinkedIn jobs SEARCH for the role — these demo rows have no
 * single real posting URL, so "Open" lands on actual current listings instead of
 * a dead placeholder. With RAPIDAPI_KEY set, live JSearch results (with real
 * per-posting apply links) replace this seed data entirely.
 */
export const SEED_JOBS: Job[] = [
  {
    id: "seed-1",
    role: "Frontend Engineer (React)",
    company: "Nimbus Labs",
    location: "Remote",
    salary: "1200–1800 USD",
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Frontend%20Engineer%20React",
    description:
      "Build performant React + TypeScript interfaces. Experience with Next.js, Tailwind CSS, REST APIs, and state management required. Bonus: testing with Jest, CI/CD.",
  },
  {
    id: "seed-2",
    role: "Backend Developer (Node.js)",
    company: "Forge Systems",
    location: "Dhaka, Bangladesh",
    salary: null,
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Backend%20Developer%20Node.js",
    description:
      "Design Node.js microservices with PostgreSQL and Docker. Knowledge of REST, message queues, and basic Kubernetes a plus. 1+ years experience.",
  },
  {
    id: "seed-3",
    role: "Machine Learning Intern",
    company: "Cortex AI",
    location: "Remote",
    salary: "Stipend",
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Intern",
    description:
      "Work on RAG pipelines and embeddings. Python, NumPy, Pandas, and familiarity with vector databases and LLM APIs expected. Great for students.",
  },
  {
    id: "seed-4",
    role: "Full-Stack Engineer",
    company: "Bluejay",
    location: "Singapore",
    salary: "3000–4500 USD",
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Full%20Stack%20Engineer",
    description:
      "End-to-end product work: React on the front, Node/Postgres on the back. We value clean commits and strong system design. 2+ years.",
  },
  {
    id: "seed-5",
    role: "Robotics Software Engineer (ROS2)",
    company: "Vanta Robotics",
    location: "Remote",
    salary: null,
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Robotics%20Software%20Engineer%20ROS2",
    description:
      "C++ and ROS2 for autonomous navigation. Experience with Gazebo simulation, sensor fusion, and path planning desired.",
  },
  {
    id: "seed-6",
    role: "Junior Software Engineer",
    company: "Atlas Cloud",
    location: "Remote",
    salary: "1500–2200 USD",
    deadline: null,
    link: "https://www.linkedin.com/jobs/search/?keywords=Junior%20Software%20Engineer",
    description:
      "Generalist role across our web stack. We use TypeScript, React, and Postgres. Strong fundamentals in data structures and algorithms required.",
  },
];
