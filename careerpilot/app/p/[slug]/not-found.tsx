import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function PortfolioNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <FileQuestion size={24} />
        </div>
        <h1 className="font-display text-2xl font-bold">Portfolio not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portfolio doesn&apos;t exist or hasn&apos;t been published yet.
        </p>
        <Link
          href="/"
          className="btn-primary mt-6 inline-flex"
        >
          Go to CareerPilot
        </Link>
      </div>
    </div>
  );
}
