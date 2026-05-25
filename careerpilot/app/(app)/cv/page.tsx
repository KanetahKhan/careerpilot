"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileUp,
  Loader2,
} from "lucide-react";
import { ProfileHeader } from "@/components/cv/ProfileHeader";
import { SkillsCloud } from "@/components/cv/SkillsCloud";
import { ProjectsGrid } from "@/components/cv/ProjectsGrid";
import { EducationTimeline } from "@/components/cv/EducationTimeline";
import { CertificationsList } from "@/components/cv/CertificationsList";
import { ExtracurricularCard } from "@/components/cv/ExtracurricularCard";
import { transformBackendData } from "@/lib/cv-transform";
import type { CVProfile } from "@/types/cv";
import "./cv-page.css";

function CVSkeleton() {
  return (
    <div className="cv-loading">
      <Loader2 size={24} className="animate-spin" style={{ color: "#2563eb" }} />
      <p>Loading your career profile...</p>
    </div>
  );
}

function CVEmptyState({ uploading, onUpload }: { uploading: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="cv-empty">
      <div className="cv-empty-card">
        <div className="empty-icon">
          <FileUp size={28} />
        </div>
        <h2>Upload Your CV</h2>
        <p>We'll extract your skills, projects, and credentials to build your professional profile.</p>
        <label className="upload-btn">
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <FileUp size={16} />
              Choose PDF or DOCX
            </>
          )}
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={onUpload}
            hidden
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

export default function CVPage() {
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/cv/profile", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (!data?.document) {
          setProfile(null);
        } else {
          const structured = transformBackendData(data);
          setProfile(structured);
        }
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (res.ok) {
        await fetchProfile();
      }
    } catch {
      // noop
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <CVSkeleton />;
  if (!profile) return <CVEmptyState uploading={uploading} onUpload={handleUpload} />;

  return (
    <div className="cv-page">
      <ProfileHeader personal={profile.personal} />

      <div className="cv-grid">
        <div className="cv-main">
          <ProjectsGrid projects={profile.projects} />
          <EducationTimeline education={profile.education} />
          <CertificationsList certifications={profile.certifications} />
          <ExtracurricularCard extracurricular={profile.extracurricular} />
        </div>

        <aside className="cv-sidebar">
          <SkillsCloud skills={profile.skills} />
        </aside>
      </div>
    </div>
  );
}
