"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

type Experience = { title: string; company: string; start: string; end: string; bullets: string[] };
type Education = { degree: string; institution: string; start: string; end: string; details: string };
type Project = { name: string; description: string; tech: string[] };
type FormData = {
  fullName: string; headline: string; email: string; phone: string; location: string; summary: string;
  experience: Experience[]; education: Education[]; projects: Project[]; skills: string[];
  certifications: string[]; extracurricular: string[];
};

const EMPTY: FormData = {
  fullName: "", headline: "", email: "", phone: "", location: "", summary: "",
  experience: [], education: [], projects: [], skills: [],
  certifications: [], extracurricular: [],
};

export default function EditCvPage() {
  const router = useRouter();
  const [data, setData] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [extraInput, setExtraInput] = useState("");

  useEffect(() => {
    fetch("/api/cv/build")
      .then((r) => r.json())
      .then((j) => {
        if (j && !j.error) {
          setData({
            fullName: j.fullName ?? "",
            headline: j.headline ?? "",
            email: j.email ?? "",
            phone: j.phone ?? "",
            location: j.location ?? "",
            summary: j.summary ?? "",
            experience: j.experience ?? [],
            education: j.education ?? [],
            projects: j.projects ?? [],
            skills: j.skills ?? [],
            certifications: j.certifications ?? [],
            extracurricular: j.extracurricular ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patch = useCallback((updater: (prev: FormData) => FormData) => {
    setData((prev) => updater(prev));
  }, []);

  const addExp = () => patch((p) => ({ ...p, experience: [...p.experience, { title: "", company: "", start: "", end: "", bullets: [""] }] }));
  const removeExp = (i: number) => patch((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));
  const setExp = (i: number, field: keyof Experience, value: any) => patch((p) => {
    const copy = [...p.experience];
    copy[i] = { ...copy[i], [field]: value };
    return { ...p, experience: copy };
  });

  const addEdu = () => patch((p) => ({ ...p, education: [...p.education, { degree: "", institution: "", start: "", end: "", details: "" }] }));
  const removeEdu = (i: number) => patch((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));
  const setEdu = (i: number, field: keyof Education, value: any) => patch((p) => {
    const copy = [...p.education];
    copy[i] = { ...copy[i], [field]: value };
    return { ...p, education: copy };
  });

  const addProj = () => patch((p) => ({ ...p, projects: [...p.projects, { name: "", description: "", tech: [] }] }));
  const removeProj = (i: number) => patch((p) => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }));
  const setProj = (i: number, field: keyof Project, value: any) => patch((p) => {
    const copy = [...p.projects];
    copy[i] = { ...copy[i], [field]: value };
    return { ...p, projects: copy };
  });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !data.skills.includes(s)) {
      setData((p) => ({ ...p, skills: [...p.skills, s] }));
    }
    setSkillInput("");
  };
  const removeSkill = (s: string) => setData((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  const addCert = () => {
    const c = certInput.trim();
    if (c) setData((p) => ({ ...p, certifications: [...p.certifications, c] }));
    setCertInput("");
  };
  const removeCert = (c: string) => setData((p) => ({ ...p, certifications: p.certifications.filter((x) => x !== c) }));

  const addExtra = () => {
    const e = extraInput.trim();
    if (e) setData((p) => ({ ...p, extracurricular: [...p.extracurricular, e] }));
    setExtraInput("");
  };
  const removeExtra = (e: string) => setData((p) => ({ ...p, extracurricular: p.extracurricular.filter((x) => x !== e) }));

  const addBullet = (expIdx: number) => setData((p) => {
    const copy = [...p.experience];
    copy[expIdx] = { ...copy[expIdx], bullets: [...copy[expIdx].bullets, ""] };
    return { ...p, experience: copy };
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.fullName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cv/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      router.push("/profile");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <FadeIn>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-6 py-4">
        <div>
          <p className="label mb-2">CV Builder</p>
          <h1 className="font-display text-3xl font-bold">Build your CV.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Fill in the sections below. Your CV will be chunked and embedded — the same
            pipeline as a file upload — so RAG, fit scores, and the assistant all work.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
          {/* Personal info */}
          <section className="panel p-5 space-y-4">
            <h2 className="font-display text-xl font-bold">Personal Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label mb-1 block">Full Name *</label>
                <Input value={data.fullName} onChange={(e) => setData((p) => ({ ...p, fullName: e.target.value }))} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label mb-1 block">Headline</label>
                <Input value={data.headline} onChange={(e) => setData((p) => ({ ...p, headline: e.target.value }))} placeholder="Software Engineer" />
              </div>
              <div>
                <label className="label mb-1 block">Email</label>
                <Input value={data.email} onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" />
              </div>
              <div>
                <label className="label mb-1 block">Phone</label>
                <Input value={data.phone} onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555-0123" />
              </div>
              <div>
                <label className="label mb-1 block">Location</label>
                <Input value={data.location} onChange={(e) => setData((p) => ({ ...p, location: e.target.value }))} placeholder="San Francisco, CA" />
              </div>
            </div>
            <div>
              <label className="label mb-1 block">Summary</label>
              <textarea
                value={data.summary}
                onChange={(e) => setData((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Brief professional summary…"
                rows={4}
                className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              />
            </div>
          </section>

          {/* Experience */}
          <section className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Experience</h2>
              <Button type="button" size="sm" variant="outline" onClick={addExp}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {data.experience.length === 0 && <p className="text-sm text-muted-foreground">No experience entries yet.</p>}
            {data.experience.map((exp, i) => (
              <div key={i} className="rounded-xl border border-border bg-background/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">#{i + 1}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeExp(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={exp.title} onChange={(e) => setExp(i, "title", e.target.value)} placeholder="Software Engineer" />
                  <Input value={exp.company} onChange={(e) => setExp(i, "company", e.target.value)} placeholder="Company name" />
                  <Input value={exp.start} onChange={(e) => setExp(i, "start", e.target.value)} placeholder="Start (e.g. 2020)" />
                  <Input value={exp.end} onChange={(e) => setExp(i, "end", e.target.value)} placeholder="End (e.g. 2023)" />
                </div>
                <div className="space-y-2">
                  <p className="label">Bullets</p>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-2">
                      <span className="mt-2 text-muted-foreground">•</span>
                      <Input value={b} onChange={(e) => {
                        const copy = [...data.experience];
                        copy[i].bullets[bi] = e.target.value;
                        setData((p) => ({ ...p, experience: copy }));
                      }} placeholder="Built feature X using Y…" />
                      {exp.bullets.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => {
                          const copy = [...data.experience];
                          copy[i] = { ...copy[i], bullets: copy[i].bullets.filter((_, idx) => idx !== bi) };
                          setData((p) => ({ ...p, experience: copy }));
                        }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="ghost" onClick={() => addBullet(i)}>
                    + Add bullet
                  </Button>
                </div>
              </div>
            ))}
          </section>

          {/* Education */}
          <section className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Education</h2>
              <Button type="button" size="sm" variant="outline" onClick={addEdu}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {data.education.length === 0 && <p className="text-sm text-muted-foreground">No education entries yet.</p>}
            {data.education.map((edu, i) => (
              <div key={i} className="rounded-xl border border-border bg-background/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">#{i + 1}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeEdu(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={edu.degree} onChange={(e) => setEdu(i, "degree", e.target.value)} placeholder="B.Sc. Computer Science" />
                  <Input value={edu.institution} onChange={(e) => setEdu(i, "institution", e.target.value)} placeholder="University name" />
                  <Input value={edu.start} onChange={(e) => setEdu(i, "start", e.target.value)} placeholder="Start year" />
                  <Input value={edu.end} onChange={(e) => setEdu(i, "end", e.target.value)} placeholder="End year" />
                </div>
                <div>
                  <label className="label mb-1 block">Details</label>
                  <Input value={edu.details} onChange={(e) => setEdu(i, "details", e.target.value)} placeholder="GPA, honors, relevant coursework…" />
                </div>
              </div>
            ))}
          </section>

          {/* Projects */}
          <section className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Projects</h2>
              <Button type="button" size="sm" variant="outline" onClick={addProj}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {data.projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
            {data.projects.map((proj, i) => (
              <div key={i} className="rounded-xl border border-border bg-background/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">#{i + 1}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeProj(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Input value={proj.name} onChange={(e) => setProj(i, "name", e.target.value)} placeholder="Project name" />
                <div>
                  <label className="label mb-1 block">Tech stack (comma-separated)</label>
                  <Input value={proj.tech?.join(", ") ?? ""} onChange={(e) => setProj(i, "tech", e.target.value.split(/,\s*/).filter(Boolean))} placeholder="React, Node.js, PostgreSQL" />
                </div>
                <div>
                  <label className="label mb-1 block">Description</label>
                  <textarea
                    value={proj.description}
                    onChange={(e) => setProj(i, "description", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    placeholder="What did you build?"
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Skills (tag-style) */}
          <section className="panel p-5 space-y-4">
            <h2 className="font-display text-xl font-bold">Skills</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.skills.map((s) => (
                <span key={s} className="chip bg-primary/10 text-primary border border-primary/20">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="ml-1 text-primary/60 hover:text-primary">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter"
              />
              <Button type="button" size="sm" variant="outline" onClick={addSkill}>Add</Button>
            </div>
          </section>

          {/* Certifications */}
          <section className="panel p-5 space-y-4">
            <h2 className="font-display text-xl font-bold">Certifications</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.certifications.map((c) => (
                <span key={c} className="chip bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                  {c}
                  <button type="button" onClick={() => removeCert(c)} className="ml-1 text-emerald-400/60 hover:text-emerald-400">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCert(); } }}
                placeholder="Type a certification and press Enter"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCert}>Add</Button>
            </div>
          </section>

          {/* Extracurricular */}
          <section className="panel p-5 space-y-4">
            <h2 className="font-display text-xl font-bold">Extracurricular</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.extracurricular.map((e) => (
                <span key={e} className="chip bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {e}
                  <button type="button" onClick={() => removeExtra(e)} className="ml-1 text-amber-400/60 hover:text-amber-400">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }}
                placeholder="Type an activity and press Enter"
              />
              <Button type="button" size="sm" variant="outline" onClick={addExtra}>Add</Button>
            </div>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3 pb-8">
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save CV →"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/profile")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </FadeIn>
  );
}
