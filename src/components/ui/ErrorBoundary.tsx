import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence for the whole app.
 *
 * This is a workshop tool used on a shop floor, often on one shared machine.
 * An unhandled render error without a boundary unmounts the entire React tree
 * and leaves a blank white window with no way forward but a manual restart —
 * on a desktop build there is not even a browser refresh button. Catching it
 * here keeps a recoverable screen in front of the user.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private handleReload = () => {
    // Clearing state first lets a transient error recover without a full
    // reload; if the same render fails again the boundary simply re-catches.
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 space-y-4 text-center">
          <h1 className="text-lg font-black text-gray-900">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500">
            The screen you were on could not be displayed. Your data is safe —
            nothing was lost.
          </p>
          <pre className="text-[10px] text-left text-gray-400 bg-gray-50 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap">
            {error.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-xl transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
