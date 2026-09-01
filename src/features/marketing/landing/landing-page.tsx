import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { MarketingShell } from "../layout/marketing-shell";
import {
  LANDING_FEATURES,
  LANDING_LOGOS,
  LANDING_STATS,
} from "../shared/marketing-content";
import {
  DashboardPreview,
  LogoMarquee,
  MarketingAtmosphere,
  MarketingDisplayHeading,
  MarketingEyebrow,
} from "../shared/marketing-ui";

export function LandingPage() {
  return (
    <MarketingShell>
      <MarketingAtmosphere className="px-4 py-10 sm:py-16 md:px-16 md:py-24">
        <section className="mx-auto flex max-w-6xl flex-col items-stretch gap-10 md:flex-row md:items-center md:gap-16">
          <div className="flex-1">
            <div className="marketing-animate-in mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-navy-light/80 bg-navy-light/60 px-3 py-1.5 backdrop-blur-sm sm:mb-6">
              <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />
              <span className="text-xs leading-snug text-navy-foreground/80">
                14-day Professional trial · No credit card
              </span>
            </div>
            <MarketingDisplayHeading className="mb-4 text-4xl text-navy-foreground sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl">
              Inventory, POS,
              <br />
              <span className="text-primary">and reports</span>
              <br />
              for Ghana retailers.
            </MarketingDisplayHeading>
            <p className="marketing-animate-in marketing-delay-2 mb-8 max-w-lg text-base leading-relaxed text-navy-foreground/70 sm:mb-10 sm:text-lg">
              Real-time stock, counter sales, and reporting across every location —
              including offline POS when connectivity is unreliable.
            </p>
            <div className="marketing-animate-in marketing-delay-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button
                asChild
                className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 sm:w-auto"
              >
                <Link to="/register">Start free trial</Link>
              </Button>
              <Link
                to="/features"
                className="group inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-md border border-navy-light/60 bg-navy-light/30 px-4 text-sm font-medium text-navy-foreground backdrop-blur-sm transition-colors hover:bg-navy-light/50 sm:w-auto sm:justify-start"
              >
                See features
                <PlayCircle
                  className="size-4 transition-transform group-hover:scale-110"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
          <DashboardPreview />
        </section>
      </MarketingAtmosphere>

      <MarketingAtmosphere className="border-t border-navy-light/50 px-4 py-8 md:px-16">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-navy-foreground/50">
          Trusted by retailers across Ghana
        </p>
        <LogoMarquee logos={LANDING_LOGOS} />
      </MarketingAtmosphere>

      <section className="border-b border-border bg-background px-4 py-10 sm:py-12 md:px-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-0 md:grid-cols-4 md:divide-x md:divide-border">
          {LANDING_STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="group flex flex-col items-center rounded-xl border border-border bg-card px-4 py-5 transition-colors hover:border-primary/20 hover:bg-accent/30 sm:rounded-none sm:border-0 sm:bg-transparent sm:py-6 md:py-6"
            >
              <span className="mb-1 text-center text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                {stat.value}
              </span>
              <span className="text-center text-sm text-muted-foreground">{stat.label}</span>
              {index < LANDING_STATS.length - 1 ? (
                <span
                  className="mt-3 hidden h-px w-8 bg-primary/30 md:group-last:hidden"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 md:px-16 md:py-24">
        <div className="mx-auto mb-12 max-w-xl">
          <MarketingEyebrow>Platform</MarketingEyebrow>
          <MarketingDisplayHeading
            as="h2"
            className="mb-4 text-3xl text-foreground md:text-4xl"
          >
            Built for multi-location retail
          </MarketingDisplayHeading>
          <p className="text-base leading-relaxed text-muted-foreground">
            Everything your team needs to sell at the counter, control stock, and
            understand performance.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150"
                aria-hidden
              />
              <div className="relative mb-4 flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-navy shadow-sm">
                <feature.icon
                  className="size-[18px] text-secondary-foreground"
                  aria-hidden
                />
              </div>
              <h3 className="relative mb-2 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      <MarketingAtmosphere className="mx-4 mb-24 rounded-2xl sm:mb-20 md:mx-16">
        <section className="flex flex-col items-stretch justify-between gap-6 px-5 py-8 sm:px-8 sm:py-10 md:flex-row md:items-center md:px-14 md:py-14">
          <div>
            <MarketingDisplayHeading
              as="h2"
              className="mb-3 text-2xl text-navy-foreground md:text-3xl"
            >
              Ready to take control of your inventory?
            </MarketingDisplayHeading>
            <p className="text-base text-navy-foreground/70">
              Start your 14-day Professional trial today.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              asChild
              className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:w-auto"
            >
              <Link to="/register">
                Start free trial
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-navy-light/80 bg-navy-light/40 text-navy-foreground backdrop-blur-sm hover:bg-navy-light/60 sm:w-auto"
            >
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </section>
      </MarketingAtmosphere>
    </MarketingShell>
  );
}
