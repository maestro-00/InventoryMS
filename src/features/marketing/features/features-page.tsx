import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";
import { smoothScrollToElement } from "@/shared/utils/smooth-scroll";
import { MarketingShell } from "../layout/marketing-shell";
import { FEATURE_SECTIONS } from "../shared/marketing-content";
import {
  FeaturePreview,
  MarketingAtmosphere,
  MarketingDisplayHeading,
  MarketingEyebrow,
} from "../shared/marketing-ui";

function sectionFromHash(): string {
  const hash = window.location.hash.slice(1);
  return FEATURE_SECTIONS.some((section) => section.id === hash)
    ? hash
    : FEATURE_SECTIONS[0].id;
}

export function FeaturesPage() {
  const [activeSection, setActiveSection] = useState(sectionFromHash);
  const [sectionAnimation, setSectionAnimation] = useState<Record<string, number>>({});

  const animateSection = useCallback((id: string) => {
    setSectionAnimation((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);

  const navigateToSection = useCallback(
    (id: string) => {
      setActiveSection(id);
      animateSection(id);
      const element = document.getElementById(id);
      if (element) smoothScrollToElement(element);
      window.history.replaceState(null, "", `#${id}`);
    },
    [animateSection],
  );

  useEffect(() => {
    const initial = sectionFromHash();
    if (window.location.hash) {
      setActiveSection(initial);
      animateSection(initial);
      requestAnimationFrame(() => {
        const element = document.getElementById(initial);
        if (element) smoothScrollToElement(element);
      });
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] },
    );

    for (const { id } of FEATURE_SECTIONS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [animateSection]);

  return (
    <MarketingShell activePage="features">
      <MarketingAtmosphere className="px-4 py-10 sm:py-16 md:px-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <MarketingEyebrow>Features</MarketingEyebrow>
          <MarketingDisplayHeading className="text-4xl text-navy-foreground sm:text-5xl md:text-6xl">
            Everything you need to run sales and stock
          </MarketingDisplayHeading>
          <p className="marketing-animate-in marketing-delay-2 mt-4 max-w-xl text-base leading-relaxed text-navy-foreground/70 sm:text-lg">
            InventoryMS connects counter sales, stock control, purchasing, and reporting
            in one Ghana-ready platform.
          </p>
        </div>
      </MarketingAtmosphere>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:gap-16 sm:py-16 lg:flex-row lg:px-8">
        <nav
          aria-label="Feature sections"
          className="lg:sticky lg:top-20 lg:w-52 lg:self-start"
        >
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:block">
            Jump to
          </p>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-l lg:border-border lg:px-0 lg:pb-0 lg:pl-4">
            {FEATURE_SECTIONS.map((section) => (
              <li key={section.id} className="shrink-0 lg:shrink">
                <a
                  href={`#${section.id}`}
                  aria-current={activeSection === section.id ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToSection(section.id);
                  }}
                  className={cn(
                    "block min-h-touch whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:-ml-px lg:border-l-2 lg:pl-4",
                    activeSection === section.id
                      ? "bg-muted font-medium text-foreground lg:border-primary lg:bg-transparent"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground lg:hover:border-primary lg:hover:bg-transparent",
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-1 flex-col gap-20">
          {FEATURE_SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-b border-border/60 pb-16 last:border-0 last:pb-0"
            >
              <div
                key={`${section.id}-${sectionAnimation[section.id] ?? 0}`}
                className={cn(
                  "flex flex-col gap-8 lg:flex-row lg:items-start",
                  index % 2 === 1 ? "lg:flex-row-reverse" : undefined,
                  sectionAnimation[section.id] ? "marketing-animate-in" : undefined,
                )}
              >
                <div className="flex-1">
                  <p className="mb-2 font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mb-4 text-3xl font-bold text-foreground">
                    {section.title}
                  </h2>
                  <ul className="mb-6 flex flex-col gap-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15">
                          <Check className="size-3 text-success" aria-hidden />
                        </span>
                        <span className="leading-relaxed text-foreground">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Start free trial
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>
                <div className="w-full lg:w-[min(100%,320px)] lg:shrink-0">
                  <FeaturePreview sectionId={section.id} />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="border-t border-border bg-muted/50 px-4 py-12 text-center sm:py-16 md:px-16">
        <MarketingDisplayHeading
          as="h2"
          className="mb-4 text-2xl text-foreground sm:text-3xl"
        >
          See it in your business
        </MarketingDisplayHeading>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          Start your 14-day Professional trial — no credit card required.
        </p>
        <Button
          asChild
          className="w-full max-w-xs shadow-md shadow-primary/15 sm:w-auto"
        >
          <Link to="/register">Start free trial</Link>
        </Button>
      </section>
    </MarketingShell>
  );
}
