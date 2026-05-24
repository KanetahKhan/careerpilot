# AI assistance log

Per the CodeSprint rules (AI/LLM code generators are permitted; credit them),
this project was scaffolded and iterated with AI assistance. Core logic — the RAG
pipeline, the programmatic fit-score algorithm, the agent tool-loop, and the schema —
was written and reviewed by the team during the hackathon window.

Keep this file honest: jot down the major prompts/decisions as you build so you can
speak to "what the AI made vs. what we designed" if a judge asks.

- [ ] Initial scaffold: Next.js 15 + Supabase pgvector + Vercel AI SDK structure
- [ ] RAG core: section-aware chunking + gemini-embedding-001 + match_cv_chunks RPC
- [ ] Fit score: semantic + skill-overlap + seniority weighting
- [ ] Job Hunter agent: searchJobs + scoreFit tool loop
- [ ] (add your own as you go)
