import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || "Unexpected application error.";
    try {
      const parsed = JSON.parse(error.message) as { error?: string; path?: string };
      if (parsed.error) {
        readable = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ""}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">BitfuryTech Workspace Notice</h1>
            <p className="text-sm text-slate-600">{this.state.message}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: "" })}
                className="bg-[#294158] hover:bg-[#1f3346] text-white text-xs font-semibold px-4 py-2 rounded-md cursor-pointer"
              >
                Retry Workspace
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-md cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
