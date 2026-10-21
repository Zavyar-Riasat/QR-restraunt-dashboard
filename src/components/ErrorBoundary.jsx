import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 max-w-lg mx-auto my-8 bg-white rounded-3xl border border-[#F0E4D7] shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg text-[#2B2118]">
              Something went wrong
            </h3>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
              An unexpected display issue occurred. Don't worry, your order data has been safely recorded.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F26B1D] text-white text-xs font-bold shadow-md hover:brightness-95 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Page</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = window.location.pathname;
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-[#FFF1E6] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#7A6A5C]" />
              <span>Back to Menu</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
