"use client";

import { ReactNode, useEffect, useRef, Children, cloneElement, isValidElement } from "react";

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, idx) =>
        isValidElement(child)
          ? cloneElement(child, { style: { ...(child.props as any).style, transitionDelay: `${idx * staggerDelay}s` } } as any)
          : child
      )}
    </div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timeout = setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, parseFloat(el.style.transitionDelay || "0") * 1000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
