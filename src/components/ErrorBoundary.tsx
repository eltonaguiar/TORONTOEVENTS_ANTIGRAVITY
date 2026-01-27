'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

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
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="glass-panel p-8 rounded-2xl border border-red-500/20 max-w-md">
                        <h2 className="text-2xl font-black text-red-400 mb-4">⚠️ Something went wrong</h2>
                        <p className="text-[var(--text-2)] mb-4">
                            We encountered an error while loading events. Please try refreshing the page.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-[var(--text-3)] mb-2">Error Details</summary>
                                <pre className="text-xs bg-black/40 p-4 rounded overflow-auto max-h-48">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null, errorInfo: null });
                                window.location.reload();
                            }}
                            className="mt-4 px-6 py-3 bg-[var(--pk-500)] text-white font-bold rounded-xl hover:bg-[var(--pk-600)] transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
