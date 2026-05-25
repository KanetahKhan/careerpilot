"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ScrollWipeContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function ScrollWipeContainer({
  children,
  className,
  staggerDelay = 100,
}: ScrollWipeContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("space-y-4", className)}>
      {Array.isArray(children)
        ? (children as ReactNode[]).map((child, i) => (
            <div
              key={i}
              className={cn(
                "transition-all duration-500 ease-out",
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${i * staggerDelay}ms` }}
            >
              {child}
            </div>
          ))
        : (
          <div
            className={cn(
              "transition-all duration-500 ease-out",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            )}
          >
            {children}
          </div>
        )
      }
    </div>
  );
}
