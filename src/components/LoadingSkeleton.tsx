'use client';

export function EventCardSkeleton() {
    return (
        <div className="relative h-[320px] w-full">
            <div className="absolute inset-x-0 top-0 h-full rounded-xl shadow-lg border border-white/10 overflow-hidden glass-panel animate-pulse">
                <div className="p-4 flex-1 flex flex-col">
                    {/* Date & Price */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-14 h-16 bg-white/10 rounded-lg" />
                        <div className="w-20 h-6 bg-white/10 rounded-full" />
                    </div>
                    {/* Title */}
                    <div className="space-y-2 mb-4">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                    </div>
                    {/* Meta Info */}
                    <div className="mt-auto pt-4 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-24" />
                        <div className="h-3 bg-white/10 rounded w-32" />
                    </div>
                </div>
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                    <div className="h-10 bg-white/10 rounded-xl" />
                    <div className="h-10 bg-white/10 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function EventFeedSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    );
}
