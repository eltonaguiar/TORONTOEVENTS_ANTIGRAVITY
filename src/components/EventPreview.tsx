'use client';
import { Event } from '../lib/types';

interface EventPreviewProps {
    event: Event;
    onClose: () => void;
}

export default function EventPreview({ event, onClose }: EventPreviewProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="glass-panel max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {event.image && (
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-64 object-cover rounded-t-2xl"
                    />
                )}

                <div className="p-8">
                    <h2 className="text-3xl font-bold text-[var(--text-1)] mb-4">{event.title}</h2>

                    <div className="flex flex-wrap gap-4 mb-6 text-sm text-[var(--text-2)]">
                        <div className="flex items-center gap-2">
                            <span className="opacity-70">📅</span>
                            <span>{new Date(event.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="opacity-70">📍</span>
                            <span>{event.location}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="opacity-70">💵</span>
                            <span>{event.price || 'TBD'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {event.categories.map((cat) => (
                            <span
                                key={cat}
                                className="px-3 py-1 rounded-full bg-[var(--pk-500)]/20 text-[var(--pk-200)] text-xs font-medium border border-[var(--pk-500)]/30"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>

                    {event.description && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-1)] mb-2">Description</h3>
                            <p className="text-[var(--text-2)] leading-relaxed">{event.description}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 btn-primary text-center"
                        >
                            Get Tickets
                        </a>

                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
