'use client';
import { useState } from 'react';
import { Event } from '../lib/types';
import { useSettings } from '../context/SettingsContext';
import { inferSoldOutStatus } from '../lib/scraper/utils';

interface EventPreviewProps {
    event: Event;
    onClose: () => void;
    isInline?: boolean;
}

type PreviewMode = 'details' | 'live' | 'split';
type Placement = 'center' | 'right' | 'left';

export default function EventPreview({ event, onClose, isInline }: EventPreviewProps) {
    const { settings, updateSettings, toggleSavedEvent } = useSettings();
    const [mode, setMode] = useState<PreviewMode>('details');
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'full'>(settings.embedSize);
    const [placement, setPlacement] = useState<Placement>(settings.embedPlacement);
    const [themeColor, setThemeColor] = useState<string>('var(--pk-500)');

    const isSaved = settings.savedEvents?.some((e) => e.id === event.id) ?? false;

    // Proxy capabilities
    const isAllEvents = event.url.includes('allevents.in');
    const [useProxy, setUseProxy] = useState(isAllEvents);

    const bodyText = (event.title + ' ' + (event.description || ''));
    const { isSoldOut: inferredSoldOut, genderSoldOut: inferredGenderOut } = inferSoldOutStatus(bodyText);
    const isSoldOut = event.isSoldOut || inferredSoldOut;

    let genderSoldOutText = '';
    if (settings.gender !== 'unspecified') {
        const gender = settings.gender;
        const currentGenderOut = event.genderSoldOut === 'both' || event.genderSoldOut === gender || inferredGenderOut === 'both' || inferredGenderOut === gender;

        if (currentGenderOut) {
            genderSoldOutText = `${gender.toUpperCase()} TICKETS SOLD OUT`;
        }
    }

    const handleApplyToAll = () => {
        updateSettings({
            embedSize: size,
            embedPlacement: placement,
            themeColor: settings.themeColor // We are not changing theme color here locally really, except for var override which is complex. ignoring themeColor sync for now as it wasn't explicitly requested to be consistent with others? User said "resizing,/coloring/ positioning". Okay, let's assuming coloring refers to the font/theme.
            // Actually, the local 'themeColor' state is just initialized to var(--pk-500). It doesn't seem mutable in the UI currently?
            // Wait, looking at lines 21 in original: const [themeColor, setThemeColor] = useState<string>('var(--pk-500)');
            // It is used in line 53: style={{ '--pk-500': themeColor }
            // But there are no controls to change it in the UI I read previously.
            // User requested "allow a user to 'apply to all' , which will make all popups behave similarly".
            // So I should sync size and placement.
        });
        alert('Settings applied to all popups!');
    };

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

    const content = (
        <div
            className={`${isInline ? 'w-full h-full flex flex-col' : 'glass-panel w-full flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ' + sizeClasses[size as keyof typeof sizeClasses]}`}
            style={{
                '--pk-500': themeColor,
                color: settings.popupFontColor
            } as any}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header / Controls */}
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/5">
                <div className="flex items-center gap-2">
                    {/* View Modes */}
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('details')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            Info
                        </button>
                        <button
                            onClick={() => setMode('split')}
                            className={`hidden md:block px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'split' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                            title="Side-by-Side View"
                        >
                            Split View
                        </button>
                        <button
                            onClick={() => setMode('live')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            Full Site
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Save Button in Preview */}
                    <button
                        onClick={() => {
                            if (toggleSavedEvent) toggleSavedEvent(event);
                        }}
                        className={`p-2 rounded-full transition-all ${isSaved ? 'bg-red-500 text-white shadow-lg' : 'bg-black/20 text-white/50 hover:bg-black/40 hover:text-white'}`}
                        title={isSaved ? "Remove from My Events" : "Save to My Events"}
                    >
                        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>

                    {/* Apply to All */}
                    {!isInline && (
                        <button
                            onClick={handleApplyToAll}
                            className="text-[10px] font-bold uppercase tracking-wider text-[var(--pk-300)] hover:text-[var(--pk-100)] underline hidden md:block"
                            title="Apply these size and position settings to be the default for all future popups"
                        >
                            Save View Defaults
                        </button>
                    )}

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full opacity-70 text-white font-bold">
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex">
                {/* DETAILS PANE (Left or Full) */}
                {(mode === 'details' || mode === 'split') && (
                    <div className={`flex flex-col overflow-y-auto custom-scrollbar ${mode === 'split' ? 'w-1/3 border-r border-white/10 min-w-[320px]' : 'w-full'}`}>
                        {event.image && (
                            <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-64 object-cover"
                            />
                        )}
                        <div className="p-6">
                            {/* Status Badges */}
                            {isSoldOut && !genderSoldOutText && (
                                <div className="mb-4 bg-red-600/20 border border-red-600/30 text-red-200 py-2 rounded-lg text-center font-black uppercase text-xs">
                                    Sold Out
                                </div>
                            )}
                            <h2 className="text-2xl font-bold mb-4 leading-tight" style={{ color: settings.popupFontColor }}>{event.title}</h2>

                            <div className="flex flex-col gap-3 mb-6 text-sm" style={{ color: settings.popupFontColor, opacity: 0.9 }}>
                                <div className="flex items-center gap-3">
                                    <span className="opacity-50 text-lg">📅</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold">
                                            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="opacity-70 text-xs">
                                            {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="opacity-50 text-lg">📍</span>
                                    <span className="truncate">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="opacity-50 text-lg">🎟️</span>
                                    <span className="font-bold text-[var(--pk-300)]">{event.price || 'Price TBD'}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {event.categories.map((cat) => (
                                    <span key={cat} className="px-2 py-1 rounded-md bg-[var(--pk-500)]/10 text-[var(--pk-200)] text-[10px] font-bold uppercase border border-[var(--pk-500)]/20">
                                        {cat}
                                    </span>
                                ))}
                            </div>

                            {event.description && (
                                <div className="mb-8 prose prose-sm prose-invert max-w-none opacity-80">
                                    <p className="whitespace-pre-wrap">{event.description}</p>
                                </div>
                            )}

                            <div className="sticky bottom-0 bg-[var(--surface-0)] pt-4 pb-0 mt-auto">
                                <a
                                    href={event.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white text-center py-3 rounded-lg font-bold shadow-lg transition-transform hover:-translate-y-1"
                                >
                                    Get Tickets ↗
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* EMBED PANE (Right or Full) */}
                {(mode === 'live' || mode === 'split') && (
                    <div className={`flex flex-col bg-white h-full ${mode === 'split' ? 'w-2/3' : 'w-full'}`}>
                        {/* Proxy Header */}
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 text-xs flex justify-between items-center border-b border-gray-200 shrink-0">
                            <span className={isAllEvents ? "text-amber-600 font-bold" : ""}>
                                {isAllEvents ? "Embed Blocked?" : "Live Site"}
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={useProxy}
                                    onChange={(e) => setUseProxy(e.target.checked)}
                                    className="rounded text-[var(--pk-500)]"
                                />
                                <span>Use Proxy</span>
                            </label>
                        </div>
                        <iframe
                            src={useProxy ? `/api/proxy?url=${encodeURIComponent(event.url)}` : event.url}
                            className="w-full flex-1 border-none bg-white"
                            title={`Preview: ${event.title}`}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    if (isInline) return content;

    return (
        <div
            className={`fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm p-4 transition-all duration-300 ${placementClasses[placement as keyof typeof placementClasses]}`}
            onClick={onClose}
        >
            {content}
        </div>
    );
}
