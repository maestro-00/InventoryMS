import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AppProblem } from "../../api/errors/app-problem";
import { Button } from "../button";

export function LoadingState({
  label,
  actionLabel,
}: {
  label: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-start gap-3" data-state="loading">
      <p role="status">{label}</p>
      {actionLabel ? (
        <Button type="button" disabled>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3" data-state="empty">
      <p>{title}</p>
      <Button type="button" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

export function FilteredEmptyState({
  title,
  onReset,
}: {
  title: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3" data-state="filtered-empty">
      <p>{title}</p>
      <Button type="button" variant="outline" onClick={onReset}>
        Clear filters
      </Button>
    </div>
  );
}

export function ValidationSummary({ problem }: { problem: AppProblem }) {
  const messages = Object.entries(problem.fieldErrors).flatMap(([field, errors]) =>
    errors.map((error) => `${field}: ${error}`),
  );
  return (
    <div role="alert" className="rounded-md border border-destructive p-3">
      <p>{problem.title}</p>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      {problem.traceId ? <SupportReference traceId={problem.traceId} /> : null}
    </div>
  );
}

export function DenialState({
  destination,
}: {
  destination: NonNullable<LinkProps["to"]>;
}) {
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p>You do not have access to this page.</p>
      <Link to={destination}>Go to dashboard</Link>
    </div>
  );
}

export function StaleConflictState({
  currentValue,
  draftValue,
  onReload,
}: {
  currentValue: string;
  draftValue: string;
  onReload: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p>This record changed on the server. Submit again after reviewing.</p>
      <p>Server: {currentValue}</p>
      <p>Your draft: {draftValue}</p>
      <Button type="button" onClick={onReload}>
        Reload current values
      </Button>
    </div>
  );
}

export function ApprovalRequiredState({
  href,
}: {
  href: NonNullable<LinkProps["to"]>;
}) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <p>This action needs approval before it can continue.</p>
      <Link to={href}>Open approval</Link>
    </div>
  );
}

export function ReadOnlyState({ upgradeHint }: { upgradeHint: string }) {
  return (
    <div role="status">
      <p>The subscription is read-only. {upgradeHint}</p>
    </div>
  );
}

export function RateLimitState({
  retryAfterSeconds,
  onRetry,
}: {
  retryAfterSeconds: number;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p>Too many attempts. Retry in {retryAfterSeconds} seconds.</p>
      <Button type="button" disabled onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function NotFoundState({ resource }: { resource: string }) {
  return (
    <div role="status">
      <p>{resource} not found.</p>
    </div>
  );
}

export function PlanLimitState({ limit, current }: { limit: string; current: string }) {
  return (
    <div role="status">
      <p>
        Plan limit reached: {limit} (current {current}).
      </p>
    </div>
  );
}

export function SupportReference({ traceId }: { traceId: string }) {
  return (
    <p>
      Support reference: <code>{traceId}</code>
    </p>
  );
}

export function ConfirmAction({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div role="group" aria-label={label}>
      {children}
    </div>
  );
}
