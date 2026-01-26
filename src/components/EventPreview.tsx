'use client';
import { useState } from 'react';
import { Event } from '../lib/types';
import { useSettings } from '../context/SettingsContext';

interface EventPreviewProps {
    event: Event;
    onClose: () => void;
}

type PreviewMode = 'details' | 'live';
type Placement = 'center' | 'right' | 'left';

export default function EventPreview({ event, onClose }: EventPreviewProps) {
    const { settings, updateSettings } = useSettings();
    const [mode, setMode] = useState<PreviewMode>('details');
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'full'>(settings.embedSize);
    const [placement, setPlacement] = useState<Placement>(settings.embedPlacement);
    const [themeColor, setThemeColor] = useState<string>('var(--pk-500)');

    const sizeClasses = {
        sm: 'max-w-xl h-[60vh]',
        md: 'max-w-3xl h-[80vh]',
        lg: 'max-w-5xl h-[90vh]',
        full: 'max-w-[95%] h-[95vh]'
    };

    const placementClasses = {
        center: 'items-center justify-center',
        right: 'items-center justify-end pr-4',
        left: 'items-center justify-start pl-4'
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm p-4 transition-all duration-300 ${placementClasses[placement as keyof typeof placementClasses]}`}
            onClick={onClose}
        >
            <div
                className={`glass-panel w-full flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${sizeClasses[size as keyof typeof sizeClasses]}`}
                style={{ '--pk-500': themeColor } as any}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header / Controls */}
                <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/5">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMode('details')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white' : 'hover:bg-white/10 text-[var(--text-3)]'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setMode('live')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white' : 'hover:bg-white/10 text-[var(--text-3)]'}`}
                        >
                            Live Site
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Size Controls */}
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
                            {(['sm', 'md', 'lg', 'full'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSize(s)}
                                    className={`w-8 h-6 flex items-center justify-center text-[10px] font-bold rounded ${size === s ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Placement Controls */}
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
                            {(['left', 'center', 'right'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPlacement(p)}
                                    className={`w-8 h-6 flex items-center justify-center text-[10px] font-bold rounded ${placement === p ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {p.charAt(0).toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Color Picker (Simplified) */}
                        <div className="flex items-center gap-2">
                            {['#ec4899', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setThemeColor(c)}
                                    className={`w-4 h-4 rounded-full border border-white/20 ${themeColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-[var(--text-3)]">
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {mode === 'details' ? (
                        <div className="flex flex-col">
                            {event.image && (
                                <img
                                    src={event.image}
                                    alt={event.title}
                                    className="w-full h-80 object-cover"
                                />
                            )}

                            <div className="p-8">
                                <h2 className="text-4xl font-bold text-[var(--text-1)] mb-6 leading-tight">{event.title}</h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-[var(--text-2)]">
                                    <div className="flex flex-col gap-1 glass-panel p-4 rounded-xl border border-white/5">
                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Date & Time</span>
                                        <span className="font-semibold text-white">
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-xs">{new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>

                                    <div className="flex flex-col gap-1 glass-panel p-4 rounded-xl border border-white/5">
                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Location</span>
                                        <span className="font-semibold text-white truncate">{event.location}</span>
                                        <span className="text-xs opacity-70">Toronto, ON</span>
                                    </div>

                                    <div className="flex flex-col gap-1 glass-panel p-4 rounded-xl border border-white/5 border-l-4 border-l-[var(--pk-500)]">
                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Price</span>
                                        <span className="font-bold text-[var(--pk-300)] text-xl">{event.price || 'TBD'}</span>
                                        {event.isFree && <span className="text-[10px] text-green-400 font-bold uppercase">FREE EVENT</span>}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    {event.categories.map((cat) => (
                                        <span
                                            key={cat}
                                            className="px-4 py-1.5 rounded-full bg-[var(--pk-500)]/10 text-[var(--pk-200)] text-[10px] font-black uppercase tracking-widest border border-[var(--pk-500)]/20 shadow-lg shadow-[var(--pk-500)]/5"
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>

                                {event.description && (
                                    <div className="mb-10 prose prose-invert max-w-none">
                                        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                                            <span className="text-[var(--pk-500)]">/</span> About This Event
                                        </h3>
                                        <p className="text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
                                    </div>
                                )}

                                <div className="sticky bottom-0 bg-gradient-to-t from-[var(--surface-0)] via-[var(--surface-0)] pt-10 pb-6">
                                    <div className="flex gap-4">
                                        <a
                                            href={event.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white text-center py-4 rounded-xl font-bold text-lg shadow-xl shadow-[var(--pk-500)]/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
                                        >
                                            Secure Your Spot Now
                                        </a>

                                        <button
                                            onClick={onClose}
                                            className="px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-bold text-[var(--text-2)]"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full bg-white">
                            <iframe
                                src={event.url}
                                className="w-full flex-1 border-none bg-white"
                                title={`Preview: ${event.title}`}
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                            />
                            <div className="absolute inset-y-0 right-0 w-2 bg-black/10 hover:bg-black/30 transition-all cursor-ew-resize" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
