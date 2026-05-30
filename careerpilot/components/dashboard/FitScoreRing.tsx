interface FitScoreRingProps {
  score: number;
}

export function FitScoreRing({ score }: FitScoreRingProps) {
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorClass = score >= 75
    ? "text-primary"
    : score >= 55
      ? "text-muted-foreground"
      : "text-destructive";

  return (
    <div className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center" title={`${score}% match`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20" cy="20" r="16"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
          fill="none"
        />
        <circle
          cx="20" cy="20" r="16"
          stroke="currentColor"
          strokeWidth="3"
          className={colorClass}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {score}
      </span>
    </div>
  );
}
