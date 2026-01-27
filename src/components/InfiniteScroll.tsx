'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface InfiniteScrollProps {
    children: ReactNode;
    hasMore: boolean;
    loadMore: () => void;
    threshold?: number;
    loader?: ReactNode;
    endMessage?: ReactNode;
}

export default function InfiniteScroll({
    children,
    hasMore,
    loadMore,
    threshold = 200,
    loader,
    endMessage
}: InfiniteScrollProps) {
    const [isLoading, setIsLoading] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!hasMore || isLoading) return;

        const options: IntersectionObserverInit = {
            root: null,
            rootMargin: `${threshold}px`,
            threshold: 0.1
        };

        observerRef.current = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasMore && !isLoading) {
                setIsLoading(true);
                loadMore();
                // Reset loading state after a short delay
                setTimeout(() => setIsLoading(false), 100);
            }
        }, options);

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, isLoading, loadMore, threshold]);

    return (
        <>
            {children}
            {hasMore && (
                <div ref={sentinelRef} className="w-full h-20 flex items-center justify-center">
                    {loader || (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-[var(--pk-500)] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-[var(--text-3)]">Loading more events...</span>
                        </div>
                    )}
                </div>
            )}
            {!hasMore && endMessage && (
                <div className="w-full py-8 text-center text-[var(--text-3)] text-sm">
                    {endMessage}
                </div>
            )}
        </>
    );
}
