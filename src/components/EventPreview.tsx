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

type PreviewMode = 'details' | 'live';
type Placement = 'center' | 'right' | 'left';

export default function EventPreview({ event, onClose, isInline }: EventPreviewProps) {
    const { settings, updateSettings } = useSettings();
    const [mode, setMode] = useState<PreviewMode>('details');
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'full'>(settings.embedSize);
    const [placement, setPlacement] = useState<Placement>(settings.embedPlacement);
    const [themeColor, setThemeColor] = useState<string>('var(--pk-500)');

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
                    <button
                        onClick={() => setMode('details')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white' : 'hover:bg-white/10 opacity-70'}`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setMode('live')}
                        className={`group relative px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white' : 'hover:bg-white/10 opacity-70'}`}
                    >
                        Live Website
                        {/* Tooltip for Live Site */}
                        <div className="absolute top-full left-0 mt-2 w-64 p-2 bg-black/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 pointer-events-none">
                            Best effort embedding. Some sites may block this view.
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {!isInline && (
                        <>
                            {/* Apply to All */}
                            <button
                                onClick={handleApplyToAll}
                                className="text-[10px] font-bold uppercase tracking-wider text-[var(--pk-300)] hover:text-[var(--pk-100)] underline"
                                title="Apply these size and position settings to be the default for all future popups"
                            >
                                Apply to All
                            </button>

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
                        </>
                    )}

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full opacity-70">
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Mode content continues here (Details vs Live) */}
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
                            {isSoldOut && !genderSoldOutText && (
                                <div className="mb-6 bg-red-600/20 border border-red-600/30 text-red-200 py-3 rounded-xl text-center font-black uppercase tracking-[0.2em] text-sm animate-pulse">
                                    Status: Mission Aborted - Sold Out
                                </div>
                            )}
                            {genderSoldOutText && (
                                <div className="mb-6 bg-blue-600/20 border border-blue-600/30 text-blue-200 py-3 rounded-xl text-center font-black uppercase tracking-[0.2em] text-sm animate-pulse">
                                    {genderSoldOutText}
                                </div>
                            )}
                            <h2 className="text-4xl font-bold mb-6 leading-tight" style={{ color: settings.popupFontColor }}>{event.title}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{ color: settings.popupFontColor, opacity: 0.8 }}>
                                <div className="flex flex-col gap-1 glass-panel p-4 rounded-xl border border-white/5">
                                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Date & Time</span>
                                    <span className="font-semibold">
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
                                    <span className="font-semibold truncate">{event.location}</span>
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
                                    <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 flex items-center gap-2" style={{ color: settings.popupFontColor }}>
                                        <span className="text-[var(--pk-500)]">/</span> About This Event
                                    </h3>
                                    <p className="leading-relaxed whitespace-pre-wrap" style={{ color: settings.popupFontColor, opacity: 0.8 }}>{event.description}</p>
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
                                        className="px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-bold opacity-70"
                                        style={{ color: settings.popupFontColor }}
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-white relative">
                        {/* Proxy Toggle Banner */}
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 text-xs flex justify-between items-center border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <span className={isAllEvents ? "text-amber-600 font-bold" : ""}>
                                    {isAllEvents ? "Embeds from this site are often blocked." : "Viewing Live Site"}
                                </span>
                                <span className="opacity-70">
                                    {useProxy ? "(Using Proxy)" : "(Direct Embed)"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useProxy}
                                        onChange={(e) => setUseProxy(e.target.checked)}
                                        className="rounded text-[var(--pk-500)]"
                                    />
                                    <span>Force Proxy (Best Effort)</span>
                                </label>
                                <div className="h-4 w-px bg-gray-300 mx-2"></div>
                                <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Open Original ↗
                                </a>
                            </div>
                        </div>

                        <iframe
                            key={useProxy ? 'proxy' : 'direct'}
                            src={useProxy ? `/api/proxy?url=${encodeURIComponent(event.url)}` : event.url}
                            className="w-full flex-1 border-none bg-white"
                            title={`Preview: ${event.title}`}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
                        <div className="absolute inset-y-0 right-0 w-2 bg-black/10 hover:bg-black/30 transition-all cursor-ew-resize" />
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
