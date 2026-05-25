"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function AddApplicationButton({ onAdd }: { onAdd: (app: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: "",
    company: "",
    location: "",
    link: "",
    status: "applied",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role.trim() || !form.company.trim()) return;

    setIsSubmitting(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (data.application) {
      onAdd(data.application);
      setIsOpen(false);
      setForm({ role: "", company: "", location: "", link: "", status: "applied" });
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus size={16} /> Add Application
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Track New Application</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Frontend Engineer"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Company</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Acme Corp"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Remote"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Link (optional)</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://jobs.acme.com/123"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving…" : "Add to Tracker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
