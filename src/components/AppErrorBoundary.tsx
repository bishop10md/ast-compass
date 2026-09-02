import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "../lib/telemetry";

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { captureError(error, { success_or_failure: "failure", feature_name: location.pathname.split("/")[1] || "home" }); void info; }
  render() { if (!this.state.failed) return this.props.children; return <main className="fatal-error" role="alert"><p className="eyebrow">AST Compass</p><h1>Something went wrong.</h1><p>AST Compass encountered an unexpected error. Please refresh the page or try again.</p><div><button className="primary" onClick={() => location.reload()}>Refresh AST Compass</button><button className="secondary" onClick={() => location.assign("/feedback")}>Send feedback</button></div><small>No private error details are displayed on this page.</small></main>; }
}
