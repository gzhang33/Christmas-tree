import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * A reusable Error Boundary component for catching runtime errors
 * in the React component tree and displaying a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error to an error reporting service if needed
        console.error(`ErrorBoundary (${this.props.name || 'Unknown'}) caught an error:`, error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    padding: '2rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: '#ff6b6b',
                    borderRadius: '8px',
                    border: '1px solid #ff6b6b',
                    margin: '1rem',
                    fontFamily: 'monospace',
                    zIndex: 1000,
                    position: 'relative',
                    pointerEvents: 'auto'
                }}>
                    <h2 style={{ marginTop: 0 }}>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap', cursor: 'pointer' }}>
                        <summary style={{ outline: 'none', marginBottom: '1rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </summary>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.location.reload();
                        }}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
