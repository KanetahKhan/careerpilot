import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import type { PortfolioData } from "@/types/portfolio";

export const runtime = "nodejs";
export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Public portfolio page (NO auth, NOT in the (app) group).
 *
 * Reads the published snapshot by slug via the SERVICE-ROLE admin client,
 * server-side only. The `data` jsonb is the sole thing rendered, so nothing
 * private leaks beyond the intended-public fields. `cache()` dedupes the read
 * between generateMetadata and the page render within one request.
 */
const getPublishedPortfolio = cache(async (slug: string): Promise<PortfolioData | null> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("portfolios")
    .select("data")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data ? ((data as { data: PortfolioData }).data) : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPublishedPortfolio(slug);
  if (!portfolio) {
    return { title: "Portfolio not found — CareerPilot" };
  }

  const title = `${portfolio.name} — Portfolio`;
  const description =
    portfolio.headline || portfolio.summary?.slice(0, 160) || `${portfolio.name}'s portfolio`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portfolio = await getPublishedPortfolio(slug);
  if (!portfolio) notFound();

  return <PortfolioView data={portfolio} />;
}
