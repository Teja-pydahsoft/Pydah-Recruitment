import React from 'react';
import { FaExclamationTriangle, FaRedo, FaWifi } from 'react-icons/fa';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: !navigator.onLine
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      isOffline: !navigator.onLine
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.isOffline;

      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-card">
            <div className={`error-boundary-icon ${isChunkError ? 'chunk-error' : 'general-error'}`}>
              {isChunkError ? <FaWifi /> : <FaExclamationTriangle />}
            </div>

            <h3 className="error-boundary-title">
              {isChunkError
                ? 'Connection Interrupted or Page Failed to Load'
                : 'Something went wrong on this page'}
            </h3>

            <p className="error-boundary-message">
              {isChunkError
                ? 'Your device might be offline or experienced a network hiccup while changing pages. Please check your internet connection and try again.'
                : 'An unexpected error occurred while rendering this section. You can try reloading or returning to the dashboard.'}
            </p>

            <div className="error-boundary-actions">
              <button
                type="button"
                className="error-boundary-retry-btn"
                onClick={this.handleReset}
              >
                <FaRedo /> Try Again
              </button>

              <button
                type="button"
                className="error-boundary-home-btn"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
