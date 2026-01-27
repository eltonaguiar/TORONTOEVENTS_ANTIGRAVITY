'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Event } from '../lib/types';
import { useSettings } from '../context/SettingsContext';
import { inferSoldOutStatus } from '../lib/scraper/utils';

interface EventPreviewProps {
    event: Event;
    onClose: () => void;
    isInline?: boolean;
    anchor?: DOMRect;
}

type PreviewMode = 'details' | 'live' | 'split';
type Placement = 'center' | 'right' | 'left';

export default function EventPreview({ event, onClose, isInline, anchor }: EventPreviewProps) {
    const { settings, updateSettings, toggleSavedEvent, setIsSettingsOpen } = useSettings();
    const [mode, setMode] = useState<PreviewMode>('details');
    const [mounted, setMounted] = useState(false);
    const [iframeError, setIframeError] = useState(false);
    const [workaroundAttempt, setWorkaroundAttempt] = useState(0);
    const [iframeUrl, setIframeUrl] = useState<string>('');
    const [modalWidth, setModalWidth] = useState(settings.previewWidth || 896);
    const [modalHeight, setModalHeight] = useState(settings.previewHeight || 600);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeType, setResizeType] = useState<'width' | 'height' | 'both' | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset error state when event changes
    useEffect(() => {
        setIframeError(false);
        setWorkaroundAttempt(0);
        setIframeUrl('');
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        // Reset modal size to saved defaults
        setModalWidth(settings.previewWidth || 896);
        setModalHeight(settings.previewHeight || 600);
    }, [event.id, settings.previewWidth, settings.previewHeight]);

    // Use settings or local overrides
    const height = modalHeight;
    const width = modalWidth;
    // Use defaultPreviewPosition if set, otherwise use previewPosition
    const effectivePosition = settings.defaultPreviewPosition === 'offset'
        ? (settings.previewPosition || 'center')
        : (settings.defaultPreviewPosition || settings.previewPosition || 'center');
    const position = effectivePosition;
    const isChatbox = settings.isChatboxMode;

    // Resize handlers
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStartRef.current || !resizeType) return;

            const deltaX = e.clientX - resizeStartRef.current.x;
            const deltaY = e.clientY - resizeStartRef.current.y;

            if (resizeType === 'width' || resizeType === 'both') {
                const newWidth = Math.max(400, Math.min(1400, resizeStartRef.current.width + deltaX));
                setModalWidth(newWidth);
            }

            if (resizeType === 'height' || resizeType === 'both') {
                const newHeight = Math.max(400, Math.min(1000, resizeStartRef.current.height + deltaY));
                setModalHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeType(null);
            resizeStartRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeType]);

    const handleResizeStart = (e: React.MouseEvent, type: 'width' | 'height' | 'both') => {
        e.preventDefault();
        e.stopPropagation();
        if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            resizeStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                width: rect.width,
                height: rect.height
            };
            setIsResizing(true);
            setResizeType(type);
        }
    };

    const handleSaveSize = () => {
        updateSettings({
            previewWidth: modalWidth,
            previewHeight: modalHeight
        });
        // Show brief confirmation
        const btn = document.querySelector('[data-save-size-btn]') as HTMLElement;
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✓ Saved';
            setTimeout(() => {
                btn.innerHTML = original;
            }, 2000);
        }
    };

    const isSaved = settings.savedEvents?.some((e) => e.id === event.id) ?? false;

    // Smart Positioning Logic
    // CRITICAL: Always use fixed positioning relative to VIEWPORT, not document
    // This ensures modals appear correctly even when user is scrolled down
    const getSmartPosition = () => {
        // Always use fixed positioning relative to viewport
        if (isInline) return {};

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const currentModalWidth = isChatbox ? 500 : (mode === 'split' ? 1200 : width);

        // Handle default positioning preferences
        if (settings.defaultPreviewPosition === 'center' || (position === 'center' && !anchor)) {
            return {
                position: 'fixed' as const,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${currentModalWidth}px`,
                maxWidth: '95vw',
                maxHeight: '90vh',
                margin: 0,
                zIndex: 101
            };
        }

        if (settings.defaultPreviewPosition === 'left' && !anchor) {
            return {
                position: 'fixed' as const,
                top: '50%',
                left: '20px',
                transform: 'translateY(-50%)',
                width: `${currentModalWidth}px`,
                maxWidth: '95vw',
                maxHeight: '90vh',
                margin: 0,
                zIndex: 101
            };
        }

        if (settings.defaultPreviewPosition === 'right' && !anchor) {
            return {
                position: 'fixed' as const,
                top: '50%',
                right: '20px',
                left: 'auto',
                transform: 'translateY(-50%)',
                width: `${currentModalWidth}px`,
                maxWidth: '95vw',
                maxHeight: '90vh',
                margin: 0,
                zIndex: 101
            };
        }

        // "offset" or smart positioning relative to anchor (default behavior)
        if (!anchor) {
            // No anchor, fallback to center
            return {
                position: 'fixed' as const,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${currentModalWidth}px`,
                maxWidth: '95vw',
                maxHeight: '90vh',
                margin: 0,
                zIndex: 101
            };
        }

        // Smart positioning relative to anchor (offset mode)
        let top = anchor.top;
        let left = anchor.right + 20;

        // Viewport Collision Detection
        if (left + currentModalWidth > vw) {
            left = anchor.left - currentModalWidth - 20;
        }

        if (left < 0) {
            left = (vw - currentModalWidth) / 2;
            top = anchor.bottom + 20;
        }

        if (top + height > vh) {
            top = vh - height - 20;
        }

        if (top < 20) top = 20;
        if (left < 20) left = 20;
        if (left + currentModalWidth > vw - 20) left = vw - currentModalWidth - 20;

        return {
            position: 'fixed' as const,
            top: `${top}px`,
            left: `${left}px`,
            width: `${currentModalWidth}px`,
            maxWidth: '95vw',
            margin: 0,
            transform: 'none',
            zIndex: 101
        };
    };

    const smartStyle = getSmartPosition();

    // Fixed absolute URL for iframe - preventing GitHub relative link 404s
    const getAbsoluteUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) {
            // SNEAKY EMBED: For AllEvents.in, try using the /amp/ version which is more iframe-friendly
            if (url.includes('allevents.in/event/')) {
                return url.replace('allevents.in/event/', 'allevents.in/amp/event/');
            }
            return url;
        }

        // If relative, assume source domain
        if (event.source === 'AllEvents.in' || url.includes('allevents.in')) {
            const path = url.startsWith('/') ? url : `/${url}`;
            let full = `https://allevents.in${path}`;
            // SNEAKY EMBED fallback for relative paths
            if (full.includes('/event/')) {
                full = full.replace('/event/', '/amp/event/');
            }
            return full;
        }
        if (event.source === 'Eventbrite' || url.includes('eventbrite')) {
            const path = url.startsWith('/') ? url : `/${url}`;
            return `https://www.eventbrite.ca${path}`;
        }
        return url;
    };

    const absoluteUrl = getAbsoluteUrl(event.url);

    // Generate workaround URLs for AllEvents.in
    const getWorkaroundUrls = (baseUrl: string): string[] => {
        if (!baseUrl.includes('allevents.in')) return [baseUrl];

        const workarounds: string[] = [];

        // Workaround 1: Try /amp/ version (already in getAbsoluteUrl, but ensure it's first)
        if (baseUrl.includes('/event/') && !baseUrl.includes('/amp/')) {
            workarounds.push(baseUrl.replace('/event/', '/amp/event/'));
        }

        // Workaround 2: Try with referrer policy bypass (using proxy-like approach)
        // Add ?embed=true parameter
        if (!baseUrl.includes('?embed=true')) {
            workarounds.push(baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'embed=true');
        }

        // Workaround 3: Try mobile version
        if (!baseUrl.includes('/m/')) {
            workarounds.push(baseUrl.replace('allevents.in/', 'allevents.in/m/'));
        }

        // Workaround 4: Try with no referrer (using data URL approach won't work, so skip)
        // Workaround 5: Original URL as last resort
        workarounds.push(baseUrl);

        return [...new Set(workarounds)]; // Remove duplicates
    };

    // Get current iframe URL based on workaround attempt
    useEffect(() => {
        if (event.source === 'AllEvents.in' || absoluteUrl.includes('allevents.in')) {
            const workarounds = getWorkaroundUrls(absoluteUrl);
            const url = workarounds[workaroundAttempt] || absoluteUrl;
            setIframeUrl(url);
        } else {
            setIframeUrl(absoluteUrl);
        }
    }, [absoluteUrl, workaroundAttempt, event.source]);

    // Handle iframe load error
    const handleIframeError = () => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }

        // Wait a bit to see if it loads
        errorTimeoutRef.current = setTimeout(() => {
            if (iframeRef.current) {
                try {
                    // Try to access iframe content to detect if it loaded
                    const iframe = iframeRef.current;
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

                    // If we can't access the document, it might be blocked
                    if (!iframeDoc || iframeDoc.body?.textContent?.includes('blocked') || iframeDoc.body?.textContent?.includes('forbidden')) {
                        const workarounds = getWorkaroundUrls(absoluteUrl);
                        if (workaroundAttempt < workarounds.length - 1) {
                            // Try next workaround
                            setWorkaroundAttempt(workaroundAttempt + 1);
                        } else {
                            // All workarounds failed
                            setIframeError(true);
                        }
                    }
                } catch (e) {
                    // Cross-origin error - try next workaround
                    const workarounds = getWorkaroundUrls(absoluteUrl);
                    if (workaroundAttempt < workarounds.length - 1) {
                        setWorkaroundAttempt(workaroundAttempt + 1);
                    } else {
                        setIframeError(true);
                    }
                }
            }
        }, 3000); // Wait 3 seconds before declaring error
    };

    // Handle iframe load success
    const handleIframeLoad = () => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        setIframeError(false);
    };

    // Toronto Dating Hub Priority Check
    const isTDH = event.title.toLowerCase().includes('toronto dating hub') || (event.description || '').toLowerCase().includes('toronto dating hub');
    const isTDHBypassed = isTDH && event.source !== 'Eventbrite';
    const hubEventbriteUrl = isTDHBypassed ? `https://www.eventbrite.ca/o/toronto-dating-hub-31627918491` : null;

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

    const placementClasses = {
        center: 'items-center justify-center bg-black/80 backdrop-blur-sm p-4',
        'bottom-right': 'items-end justify-end p-8 pointer-events-none',
        right: 'items-center justify-end p-4 bg-black/40 backdrop-blur-sm',
        left: 'items-center justify-start p-4 bg-black/40 backdrop-blur-sm'
    };

    const content = (
        <div
            ref={modalRef}
            className={`
                ${isInline ? 'w-full h-full flex flex-col' : `glass-panel shadow-2xl transition-all duration-500 pointer-events-auto rounded-[2.5rem] overflow-hidden flex flex-col relative`}
                ${isChatbox && !isInline ? 'border-2 border-[var(--pk-500)]/30 animate-slide-up ring-4 ring-black/50' : ''}
                ${anchor && position !== 'center' ? 'animate-zoom-in' : ''}
            `}
            style={{
                height: isInline ? '100%' : `${height}px`,
                width: isInline ? '100%' : `${width}px`,
                backgroundColor: 'var(--surface-1)',
                color: settings.popupFontColor,
                // CRITICAL: Always use fixed positioning relative to viewport
                // This ensures modal appears in viewport even when scrolled
                position: isInline ? 'relative' : 'fixed',
                ...smartStyle
            } as any}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Resize Handles */}
            {!isInline && (
                <>
                    {/* Bottom-right corner resize handle */}
                    <div
                        onMouseDown={(e) => handleResizeStart(e, 'both')}
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 bg-[var(--pk-500)]/20 hover:bg-[var(--pk-500)]/40 rounded-tl-lg transition-colors flex items-center justify-center group"
                        title="Drag to resize"
                    >
                        <div className="w-3 h-3 border-2 border-[var(--pk-500)] rounded-tl-lg group-hover:border-white transition-colors" />
                    </div>
                    {/* Right edge resize handle */}
                    <div
                        onMouseDown={(e) => handleResizeStart(e, 'width')}
                        className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-16 cursor-ew-resize z-50 hover:bg-[var(--pk-500)]/30 transition-colors rounded-l"
                        title="Drag to resize width"
                    />
                    {/* Bottom edge resize handle */}
                    <div
                        onMouseDown={(e) => handleResizeStart(e, 'height')}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 cursor-ns-resize z-50 hover:bg-[var(--pk-500)]/30 transition-colors rounded-t"
                        title="Drag to resize height"
                    />
                </>
            )}
            {/* Visual Connector Line (Smart Arrow) */}
            {anchor && position !== 'center' && !isInline && (
                <div
                    className="absolute -left-10 top-1/2 -translate-y-1/2 hidden lg:block"
                    style={{
                        left: smartStyle.left && parseInt(smartStyle.left) > anchor.right ? '-40px' : 'auto',
                        right: smartStyle.left && parseInt(smartStyle.left) < anchor.left ? '-40px' : 'auto',
                        transform: smartStyle.left && parseInt(smartStyle.left) < anchor.left ? 'scaleX(-1) translateY(-50%)' : 'translateY(-50%)'
                    }}
                >
                    <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                        <path d="M0 10H40M40 10L30 0M40 10L30 20" stroke="var(--pk-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
                    </svg>
                </div>
            )}
            {/* Header / Premium Controls */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-xl z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setMode('details')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        {!isChatbox && (
                            <button
                                onClick={() => setMode('split')}
                                className={`hidden md:block px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'split' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Split
                            </button>
                        )}
                        <button
                            onClick={() => setMode('live')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Live Site
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <span className="text-[10px] uppercase font-black text-white/40">Height</span>
                        <input
                            type="range" min="300" max="1000" step="50" value={height}
                            onChange={(e) => setModalHeight(parseInt(e.target.value))}
                            onMouseUp={() => updateSettings({ previewHeight: modalHeight })}
                            className="w-16 h-1 accent-[var(--pk-500)] cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={handleSaveSize}
                        data-save-size-btn
                        className="p-2 bg-white/5 hover:bg-[var(--pk-500)] text-white/40 hover:text-white rounded-xl transition-all border border-white/10"
                        title="Save Current Size as Default"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                    </button>

                    <div className="hidden md:flex bg-black/20 p-1 rounded-xl border border-white/5 gap-1">
                        {[
                            { id: 'center', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /> },
                            { id: 'left', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h10M4 16h10" /> },
                            { id: 'right', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 8h10M10 16h10" /> },
                            { id: 'offset', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /> }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => updateSettings({ defaultPreviewPosition: opt.id as any })}
                                className={`p-1.5 rounded-lg transition-all ${settings.defaultPreviewPosition === opt.id ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                title={`Set Default Position: ${opt.id.charAt(0).toUpperCase() + opt.id.slice(1)}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {opt.icon}
                                </svg>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => toggleSavedEvent && toggleSavedEvent(event)}
                        className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 bg-white/5 hover:bg-[var(--pk-500)] text-white/40 hover:text-white rounded-xl transition-all border border-white/10 group/pg"
                        title="Tweak Global Settings"
                    >
                        <span className="group-hover/pg:rotate-90 transition-transform block text-lg leading-none">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </span>
                    </button>

                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-white font-bold text-xl">
                        ×
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex bg-[#0a0a0b]">
                {/* DETAILS PANE (Requested Layout) */}
                {(mode === 'details' || mode === 'split') && (
                    <div className={`flex flex-col overflow-y-auto custom-scrollbar ${mode === 'split' ? 'w-1/3 border-r border-white/10 shrink-0' : 'w-full'}`}>
                        {event.image && (
                            <div className="w-full h-80 shrink-0 relative">
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/20" />
                                {isSoldOut && (
                                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl">
                                        Sold Out
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Toronto Dating Hub Priority Notice */}
                        {isTDHBypassed && (
                            <div className="p-6 bg-red-600/20 border-2 border-red-600 rounded-[2rem] animate-pulse-slow">
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl">⚠️</span>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black uppercase text-red-400 tracking-tight">Source Priority Conflict</h4>
                                        <p className="text-sm font-bold text-white/80 leading-relaxed">
                                            This event is tagged as <span className="text-[var(--pk-300)]">Toronto Dating Hub</span>.
                                            For the best experience and guaranteed ticketing, we recommend viewing this directly on Eventbrite.ca.
                                        </p>
                                        <a
                                            href={hubEventbriteUrl || '#'}
                                            target="_blank"
                                            className="inline-block mt-2 px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-red-700 transition-colors"
                                        >
                                            Switch to Eventbrite Source →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <h2 className="text-4xl font-black mb-6 leading-[1.1] tracking-tight" style={{ color: 'var(--pk-300)' }}>{event.title}</h2>
                            <div className="flex flex-wrap gap-2">
                                {event.categories.map((cat) => (
                                    <span key={cat} className="px-4 py-1.5 rounded-full bg-[var(--pk-500)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--pk-500)]/20">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Core Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📅 Date & Time</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">
                                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-[var(--pk-300)] text-sm font-bold">
                                        {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📍 Location</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white truncate">{event.location}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">💰 Price</span>
                                <div className="flex flex-col underline decoration-[var(--pk-500)]/50">
                                    <span className="font-bold text-white">{event.price || 'Free'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📰 Source</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{event.source}</span>
                                </div>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white">Description</h3>
                            <div className="prose prose-sm prose-invert max-w-none opacity-80 leading-relaxed text-base">
                                <p className="whitespace-pre-wrap">{event.description || "No further details provided by the host."}</p>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-wrap gap-4 pt-8 border-t border-white/5 sticky bottom-0 bg-[#0a0a0b]/90 backdrop-blur-md pb-4">
                            <a
                                href={absoluteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-[200px] bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white text-center py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--pk-500)]/30 transition-all hover:-translate-y-1"
                            >
                                View Full Event Page →
                            </a>
                            <button
                                onClick={onClose}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors border border-white/10"
                            >
                                Close
                            </button>
                        </div>

                        {/* Live Site Preview Area */}
                        <div className="mt-12 pt-8 border-t-2 border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Event Page Preview</h3>
                                <div className="text-[10px] uppercase font-black text-white/30">Interactive IFrame</div>
                            </div>

                            <div className="relative w-full rounded-3xl border-4 border-white/5 shadow-inner overflow-hidden bg-black/20" style={{ height: `${Math.max(400, height - 200)}px`, transition: 'height 0.3s ease' }}>
                                {/* Always show link icon in top-right corner */}
                                <a
                                    href={absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-4 right-4 z-50 p-3 bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
                                    title="Open event in new tab"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="absolute -bottom-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        Open in New Tab
                                    </span>
                                </a>

                                {/* Eventbrite - always blocked */}
                                {(event.source === 'Eventbrite' || absoluteUrl.includes('eventbrite')) ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0b]">
                                        <div className="w-16 h-16 mb-4 rounded-full bg-[#F05537] flex items-center justify-center text-white text-3xl shadow-lg">
                                            🔒
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-2">External Content Protected</h4>
                                        <p className="text-sm text-[var(--text-2)] max-w-sm mb-6">
                                            Eventbrite does not allow embedded previews. Please open the event page directly.
                                        </p>
                                        <a
                                            href={absoluteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-[#F05537] hover:bg-[#d14429] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20"
                                        >
                                            Open Event on Eventbrite ↗
                                        </a>
                                    </div>
                                ) : iframeError && (event.source === 'AllEvents.in' || absoluteUrl.includes('allevents.in')) ? (
                                    /* AllEvents.in - All workarounds failed */
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0b]">
                                        <div className="w-16 h-16 mb-4 rounded-full bg-yellow-600 flex items-center justify-center text-white text-3xl shadow-lg animate-pulse">
                                            ⚠️
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-2">Failed to Load Preview</h4>
                                        <p className="text-sm text-[var(--text-2)] max-w-sm mb-6">
                                            AllEvents.in preview could not be loaded. Please open the event page directly using the link icon above.
                                        </p>
                                        <a
                                            href={absoluteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20"
                                        >
                                            Open Event on AllEvents.in ↗
                                        </a>
                                    </div>
                                ) : (
                                    /* Try to load iframe with workarounds */
                                    <iframe
                                        ref={iframeRef}
                                        src={iframeUrl || absoluteUrl}
                                        className="w-full h-full bg-white"
                                        title={`Preview: ${event.title}`}
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                                        onError={handleIframeError}
                                        onLoad={handleIframeLoad}
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                            </div>

                            <p className="text-sm text-white/40 italic flex items-center gap-2">
                                <span>If the preview doesn't load,</span>
                                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--pk-300)] underline hover:text-white transition-colors flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    click here to open the event page
                                </a>
                            </p>
                        </div>
                    </div>
                )}

                {/* FULL LIVE SITE PANE (When not in Details mode) */}
                {mode === 'live' && (
                    <div className="flex flex-col bg-white w-full h-full relative">
                        {/* Always show link icon in top-right corner */}
                        <a
                            href={absoluteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-4 right-4 z-50 p-3 bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
                            title="Open event in new tab"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="absolute -bottom-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Open in New Tab
                            </span>
                        </a>

                        {/* Eventbrite - always blocked */}
                        {(event.source === 'Eventbrite' || absoluteUrl.includes('eventbrite')) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
                                <div className="w-16 h-16 mb-4 rounded-full bg-[#F05537] flex items-center justify-center text-white text-3xl shadow-lg">
                                    🔒
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">External Content Protected</h4>
                                <p className="text-sm text-gray-600 max-w-sm mb-6">
                                    Eventbrite does not allow embedded previews. Please open the event page directly.
                                </p>
                                <a
                                    href={absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-[#F05537] hover:bg-[#d14429] text-white font-bold rounded-xl transition-all shadow-lg"
                                >
                                    Open Event on Eventbrite ↗
                                </a>
                            </div>
                        ) : iframeError && (event.source === 'AllEvents.in' || absoluteUrl.includes('allevents.in')) ? (
                            /* AllEvents.in - All workarounds failed */
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
                                <div className="w-16 h-16 mb-4 rounded-full bg-yellow-600 flex items-center justify-center text-white text-3xl shadow-lg animate-pulse">
                                    ⚠️
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Preview</h4>
                                <p className="text-sm text-gray-600 max-w-sm mb-6">
                                    AllEvents.in preview could not be loaded. Please open the event page directly using the link icon above.
                                </p>
                                <a
                                    href={absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg"
                                >
                                    Open Event on AllEvents.in ↗
                                </a>
                            </div>
                        ) : (
                            /* Try to load iframe with workarounds */
                            <iframe
                                ref={iframeRef}
                                src={iframeUrl || absoluteUrl}
                                className="w-full h-full border-none"
                                title={`Live: ${event.title}`}
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                                onError={handleIframeError}
                                onLoad={handleIframeLoad}
                                referrerPolicy="no-referrer"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (isInline) return content;
    if (!mounted) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[100] transition-all duration-500 ${position === 'center' ? 'pointer-events-none' : placementClasses[position as keyof typeof placementClasses]}`}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 100
            }}
            onClick={onClose}
        >
            {content}
        </div>,
        document.body
    );
}
