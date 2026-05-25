export interface CVProfile {
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  education: {
    id: string;
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    expectedGraduation?: string;
    gpa?: string;
    gpaScale?: string;
    location?: string;
  }[];
  skills: {
    category: string;
    items: string[];
    color: string;
  }[];
  projects: {
    id: string;
    name: string;
    techStack: string[];
    description: string;
    bullets?: string[];
    githubUrl?: string;
    liveUrl?: string;
    demoUrl?: string;
    featured?: boolean;
  }[];
  certifications: {
    id: string;
    title: string;
    issuer?: string;
    year: string;
    rank?: string;
    description?: string;
  }[];
  extracurricular: {
    organization: string;
    role: string;
    activities: string[];
  }[];
  interests?: string[];
}
