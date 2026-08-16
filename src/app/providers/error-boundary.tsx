import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "../../shared/telemetry/telemetry";
import { SupportReference } from "../../shared/ui/states/ui-state";

interface Props {
  children: ReactNode;
  traceId?: string;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public override state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, {
      ...(this.props.traceId ? { traceId: this.props.traceId } : {}),
      ...(info.componentStack ? { componentStack: info.componentStack } : {}),
    });
  }

  public override render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" className="flex flex-col gap-3 p-4">
          <p>Something went wrong. Check the support reference if you contact us.</p>
          <SupportReference traceId={this.props.traceId ?? "unavailable"} />
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
