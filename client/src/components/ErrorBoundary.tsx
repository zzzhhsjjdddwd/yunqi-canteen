import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
              <p className="mt-2 text-muted-foreground">{this.state.error?.message}</p>
              <button
                className="mt-4 rounded-full bg-primary px-6 py-2 text-white"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
