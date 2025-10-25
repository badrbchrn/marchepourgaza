import React from "react";

type FallbackRender = (args: { error: any; reset: () => void }) => React.ReactNode;

type Props = {
  fallback: FallbackRender;
  children: React.ReactNode;
};

type State = { error: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any) {
    // Optional: send to your logger
    // console.error(error);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
