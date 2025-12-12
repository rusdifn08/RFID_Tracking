import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center py-8 xs:py-12 sm:py-16 md:py-20 bg-gray-50 px-4">
          <div className="text-center space-y-4 xs:space-y-5 sm:space-y-6 max-w-md mx-auto w-full">
            <div className="text-4xl xs:text-5xl sm:text-6xl text-red-500 mx-auto">⚠️</div>
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900">
              Oops! Terjadi Kesalahan
            </h1>
            <p className="text-sm xs:text-base text-gray-600">
              {this.state.error?.message || 'Terjadi kesalahan yang tidak terduga'}
            </p>
            <button
              onClick={this.handleReset}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 xs:py-2 px-4 xs:px-5 sm:px-6 rounded-lg transition-colors text-sm xs:text-base"
            >
              Coba Lagi
            </button>
            <details className="mt-3 xs:mt-4 text-left">
              <summary className="cursor-pointer text-xs xs:text-sm text-gray-500">Detail Error</summary>
              <pre className="mt-2 text-[10px] xs:text-xs bg-gray-100 p-2 xs:p-3 sm:p-4 rounded overflow-auto">
                {this.state.error?.stack || this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
