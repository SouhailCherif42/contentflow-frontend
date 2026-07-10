"use client";

import { cn } from "./ui";

/*
  Signature visuelle ContentFlow : le rail de flux éditorial.
  Une fine ligne à stations qui matérialise le pipeline
  Idée → Brouillon → Relecture → Publié.
*/
export function FlowRail({
  steps,
  activeIndex = -1,
  className,
}: {
  steps: { label: string; count?: number }[];
  activeIndex?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center" style={{ flex: i === steps.length - 1 ? "0 0 auto" : "1 1 0" }}>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border-2",
                i <= activeIndex ? "border-accent bg-accent" : "border-line bg-surface",
              )}
            />
            <span className="whitespace-nowrap text-xs text-soft">
              {step.label}
              {step.count !== undefined && (
                <span className="ml-1 font-medium text-ink tabular-nums">{step.count}</span>
              )}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("mx-2 mb-5 h-px flex-1", i < activeIndex ? "bg-accent" : "bg-line")} />
          )}
        </div>
      ))}
    </div>
  );
}
