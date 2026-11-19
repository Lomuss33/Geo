import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onError: (error: unknown) => void;
};

// Keep a failed renderer inside its scene. The outer shell owns the recovery UI;
// its retry key remounts this boundary instead of reusing failed renderer state.
export class RendererErrorBoundary extends Component<
  Props,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
