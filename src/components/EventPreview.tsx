'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Event } from '../lib/types';
import { useSettings } from '../context/SettingsContext';
import { inferSoldOutStatus } from '../lib/scraper/utils';
import { safeParseDate, formatDateForDisplay, formatTimeForDisplay } from '../lib/utils/dateHelpers';
import { safeParsePrice, formatPriceRange, formatPrice } from '../lib/utils/priceHelpers';
import { safeGetDescription } from '../lib/utils/descriptionHelpers';
import { formatLocation } from '../lib/utils/locationHelpers';
import { getEventImage } from '../lib/utils/imageHelpers';
import { getEventBadges } from '../lib/utils/badgeHelpers';

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
    const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [resizeType, setResizeType] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number; width: number; height: number } | null>(null);

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
        // Reset position on new event, unless it's an inline preview
        if (!isInline) {
            setModalPosition(null);
        }
    }, [event.id, settings.previewWidth, settings.previewHeight, isInline]);

    // Use settings or local overrides
    const height = modalHeight;
    const width = modalWidth;
    // Use defaultPreviewPosition if set, otherwise use previewPosition
    const effectivePosition = settings.defaultPreviewPosition === 'offset'
        ? (settings.previewPosition || 'center')
        : (settings.defaultPreviewPosition || settings.previewPosition || 'center');
    const position = effectivePosition;
    const isChatbox = settings.isChatboxMode;

    // Interaction handlers (Resize & Drag)
    useEffect(() => {
        if (!isResizing && !isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;
            const { startX, startY, x, y, width, height } = dragStartRef.current;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (isDragging) {
                setModalPosition({ x: x + deltaX, y: y + deltaY });
                return;
            }

            if (resizeType) {
                let newX = x;
                let newY = y;
                let newW = width;
                let newH = height;

                if (resizeType.includes('e')) {
                    newW = Math.max(400, Math.min(1400, width + deltaX));
                }
                if (resizeType.includes('s')) {
                    newH = Math.max(400, Math.min(1000, height + deltaY));
                }
                if (resizeType.includes('w')) {
                    const maxDelta = width - 400;
                    const validDelta = Math.min(Math.max(deltaX, -maxDelta), maxDelta);
                    newW = Math.max(400, Math.min(1400, width - validDelta));
                    newX = x + (width - newW);
                }
                if (resizeType.includes('n')) {
                    const maxDelta = height - 400;
                    const validDelta = Math.min(Math.max(deltaY, -maxDelta), maxDelta);
                    newH = Math.max(400, Math.min(1000, height - validDelta));
                    newY = y + (height - newH);
                }

                setModalWidth(newW);
                setModalHeight(newH);
                setModalPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setIsDragging(false);
            setResizeType(null);
            dragStartRef.current = null;
            // Update global settings on stop
            updateSettings({ previewWidth: modalWidth, previewHeight: modalHeight });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isDragging, resizeType, modalWidth, modalHeight, updateSettings]);

    const startInteraction = (e: React.MouseEvent, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (modalRef.current) {
            // Need to get current position if not set yet (first drag)
            let currentX = modalPosition?.x || 0;
            let currentY = modalPosition?.y || 0;

            if (!modalPosition && modalRef.current) {
                const rect = modalRef.current.getBoundingClientRect();
                currentX = rect.left;
                currentY = rect.top;
                setModalPosition({ x: currentX, y: currentY });
            }

            dragStartRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                x: currentX,
                y: currentY,
                width: modalWidth,
                height: modalHeight
            };
            if (type === 'drag') {
                setIsDragging(true);
            } else {
                setIsResizing(true);
                setResizeType(type);
            }
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
        if (isInline) return {};

        // Use state position if available (after initial render/drag)
        if (modalPosition) {
            return {
                position: 'fixed' as const,
                top: `${modalPosition.y}px`,
                left: `${modalPosition.x}px`,
                margin: 0,
                zIndex: 101,
                transform: 'none'
            };
        }

        const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;
        const currentModalWidth = modalWidth;

        // Default: Center
        const centerX = (vw - currentModalWidth) / 2;
        const centerY = (vh - modalHeight) / 2;

        return {
            position: 'fixed' as const,
            top: `${centerY}px`,
            left: `${centerX}px`,
            margin: 0,
            zIndex: 101,
            transform: 'none'
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
                // Apply smart positioning (width/height come from state, not smartStyle)
                ...smartStyle
            } as any}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Resize Handles - All Directions */}
            {!isInline && (
                <>
                    {/* Corners */}
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'nw');
                        }} 
                        className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-[60] hover:bg-white/20 rounded-tl-[2rem]" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'ne');
                        }} 
                        className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-[60] hover:bg-white/20 rounded-tr-[2rem]" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'sw');
                        }} 
                        className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-[60] hover:bg-white/20 rounded-bl-[2rem]" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'se');
                        }} 
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-[60] hover:bg-white/20 rounded-br-[2rem] bg-[var(--pk-500)]/20" 
                    />

                    {/* Edges */}
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'n');
                        }} 
                        className="absolute top-0 left-6 right-6 h-2 cursor-n-resize z-[60] hover:bg-white/10" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 's');
                        }} 
                        className="absolute bottom-0 left-6 right-6 h-2 cursor-s-resize z-[60] hover:bg-white/10" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'w');
                        }} 
                        className="absolute top-6 bottom-6 left-0 w-3 cursor-w-resize z-[60] hover:bg-white/10" 
                    />
                    <div 
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            startInteraction(e, 'e');
                        }} 
                        className="absolute top-6 bottom-6 right-0 w-3 cursor-e-resize z-[60] hover:bg-white/10" 
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
            <div
                className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-xl z-50 shrink-0 cursor-move select-none"
                onMouseDown={(e) => {
                    // Start dragging unless clicking an interactive element
                    if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input')) {
                        startInteraction(e, 'drag');
                    }
                }}
            >
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
                    {/* Open in New Tab Button */}
                    <a
                        href={absoluteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-[var(--pk-500)]/20 hover:bg-[var(--pk-500)] text-white border border-[var(--pk-500)]/50 hover:border-[var(--pk-500)] flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View in New Tab
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    {/* Width Slider */}
                    <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <span className="text-[9px] uppercase font-black text-white/40">Width</span>
                        <input
                            type="range" min="400" max="1400" step="25" value={modalWidth}
                            onChange={(e) => {
                                const newWidth = parseInt(e.target.value);
                                setModalWidth(newWidth);
                                // Update position to keep centered if not manually positioned
                                if (!modalPosition && !isInline) {
                                    const vw = window.innerWidth;
                                    const centerX = (vw - newWidth) / 2;
                                    const vh = window.innerHeight;
                                    const centerY = (vh - modalHeight) / 2;
                                    setModalPosition({ x: centerX, y: centerY });
                                }
                            }}
                            onMouseUp={() => updateSettings({ previewWidth: modalWidth })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-1 accent-[var(--pk-500)] cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-white/60 min-w-[3rem] text-right">{modalWidth}px</span>
                    </div>
                    {/* Height Slider */}
                    <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <span className="text-[9px] uppercase font-black text-white/40">Height</span>
                        <input
                            type="range" min="400" max="1000" step="25" value={modalHeight}
                            onChange={(e) => {
                                const newHeight = parseInt(e.target.value);
                                setModalHeight(newHeight);
                                // Update position to keep centered if not manually positioned
                                if (!modalPosition && !isInline) {
                                    const vh = window.innerHeight;
                                    const centerY = (vh - newHeight) / 2;
                                    const vw = window.innerWidth;
                                    const centerX = (vw - modalWidth) / 2;
                                    setModalPosition({ x: centerX, y: centerY });
                                }
                            }}
                            onMouseUp={() => updateSettings({ previewHeight: modalHeight })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-1 accent-[var(--pk-500)] cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-white/60 min-w-[3rem] text-right">{modalHeight}px</span>
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
                        {(() => {
                            const eventImage = getEventImage(event.image, event.title);
                            const isDefaultImage = eventImage === getEventImage(null);
                            return (
                                <div className="w-full h-80 shrink-0 relative">
                                    <img 
                                        src={eventImage} 
                                        alt={isDefaultImage ? `${event.title} - Event image not available` : event.title} 
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/20" />
                                    {isSoldOut && (
                                        <div className="absolute top-4 left-4 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl">
                                            Sold Out
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <h2 className="text-4xl font-black leading-[1.1] tracking-tight mb-2" style={{ color: 'var(--pk-300)' }}>{event.title}</h2>
                                    {/* Multi-Day Indicator */}
                                    {event.categories.includes('Multi-Day') && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-[var(--pk-500)]/30 border border-[var(--pk-500)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--pk-300)]">
                                                📅 Multi-Day Event
                                            </span>
                                            {event.endDate && (
                                                <span className="text-xs text-white/60">
                                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Status Badges */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(() => {
                                            const badges = getEventBadges(event);
                                            return badges.map((badge, idx) => (
                                                <span 
                                                    key={idx}
                                                    className={`px-3 py-1 ${badge.bgColor} border ${badge.borderColor} rounded-full text-[10px] font-black uppercase tracking-widest ${badge.color}`}
                                                    role="status"
                                                    aria-label={badge.label}
                                                >
                                                    {badge.label}
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                </div>
                                {/* Prominent Price Display */}
                                <div className="shrink-0 px-6 py-3 bg-[var(--pk-500)]/20 border-2 border-[var(--pk-500)] rounded-2xl">
                                    <div className="text-[10px] uppercase font-black text-white/60 tracking-widest mb-1">Price</div>
                                    {(() => {
                                        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
                                        return (
                                            <>
                                                <div className="text-2xl font-black text-[var(--pk-300)]">{priceResult.price}</div>
                                                {priceResult.priceAmount !== undefined && priceResult.priceAmount > 0 && (
                                                    <div className="text-[9px] text-white/50 mt-0.5">CAD ${priceResult.priceAmount.toFixed(2)}</div>
                                                )}
                                                {!priceResult.isValid && (
                                                    <div className="text-[9px] text-yellow-400/70 mt-0.5">⚠️ Price not available</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {event.categories.map((cat) => (
                                    <span key={cat} className="px-4 py-1.5 rounded-full bg-[var(--pk-500)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--pk-500)]/20">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Enhanced Core Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                            {/* Date & Time with End Time */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📅 Date & Time</span>
                                <div className="flex flex-col">
                                    {(() => {
                                        const startDateResult = safeParseDate(event.date, event.id, event.title);
                                        const endDateResult = event.endDate ? safeParseDate(event.endDate, event.id, event.title) : null;
                                        
                                        if (!startDateResult.isValid) {
                                            return (
                                                <div className="text-yellow-400/70 text-sm">
                                                    ⚠️ Invalid Date
                                                </div>
                                            );
                                        }

                                        const startDate = startDateResult.date!;
                                        const currentYear = new Date().getFullYear();
                                        const eventYear = startDate.getFullYear();
                                        
                                        return (
                                            <>
                                                <span className="font-bold text-white">
                                                    {formatDateForDisplay(startDate, {
                                                        includeYear: eventYear !== currentYear
                                                    })}
                                                </span>
                                                <span className="text-[var(--pk-300)] text-sm font-bold">
                                                    {formatTimeForDisplay(startDate)}
                                                </span>
                                                {endDateResult?.isValid && endDateResult.date && (
                                                    <>
                                                        <span className="text-[10px] text-white/40 mt-1">Until</span>
                                                        <span className="text-[var(--pk-400)] text-xs font-bold">
                                                            {formatTimeForDisplay(endDateResult.date)}
                                                        </span>
                                                        {(() => {
                                                            const durationMs = endDateResult.date!.getTime() - startDate.getTime();
                                                            const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                                            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                                            if (hours > 0 || minutes > 0) {
                                                                return (
                                                                    <span className="text-[9px] text-white/50 mt-0.5">
                                                                        ({hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : ''})
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            
                            {/* Location with Map Link */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📍 Location</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white" title={formatLocation(event)}>{formatLocation(event)}</span>
                                    {(event.latitude && event.longitude) && (
                                        <a
                                            href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-[var(--pk-300)] hover:text-[var(--pk-200)] underline mt-1 flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            View on Map
                                        </a>
                                    )}
                                </div>
                            </div>
                            
                            {/* Price with Amount */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">💰 Price</span>
                                <div className="flex flex-col">
                                    {(() => {
                                        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
                                        
                                        // Format based on user preference
                                        let displayPrice = priceResult.price;
                                        if (settings.priceDisplayFormat === 'range' && event.minPrice !== undefined && event.maxPrice !== undefined && event.minPrice !== event.maxPrice) {
                                            displayPrice = formatPriceRange(event.minPrice, event.maxPrice);
                                        } else if (settings.priceDisplayFormat === 'all-ticket-types' && event.ticketTypes && event.ticketTypes.length > 0) {
                                            const ticketPrices = event.ticketTypes
                                                .filter(t => t.price !== undefined)
                                                .map(t => `${t.name}: ${t.priceDisplay || formatPrice(t.price)}`)
                                                .join(', ');
                                            if (ticketPrices) {
                                                displayPrice = ticketPrices;
                                            }
                                        }
                                        
                                        return (
                                            <>
                                                <span className="font-bold text-white">{displayPrice}</span>
                                                {priceResult.priceAmount !== undefined && priceResult.priceAmount > 0 && settings.priceDisplayFormat === 'single' && (
                                                    <span className="text-[10px] text-white/50">CAD ${priceResult.priceAmount.toFixed(2)}</span>
                                                )}
                                                {!priceResult.isValid && (
                                                    <span className="text-[9px] text-yellow-400/70">⚠️ Price not available</span>
                                                )}
                                            </>
                                        );
                                    })()}
                                    {isSoldOut && (
                                        <span className="text-[9px] text-red-400 font-bold mt-1">SOLD OUT</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Host/Organizer */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">👤 Host</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{event.host || event.source}</span>
                                    <span className="text-[10px] text-white/50">via {event.source}</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Details Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 mt-4">
                            {/* Status */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📊 Status</span>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-sm ${
                                        event.status === 'UPCOMING' ? 'text-green-400' :
                                        event.status === 'CANCELLED' ? 'text-red-400' :
                                        event.status === 'MOVED' ? 'text-yellow-400' :
                                        'text-white/60'
                                    }`}>
                                        {event.status}
                                    </span>
                                    {event.isSoldOut && (
                                        <span className="text-[10px] text-red-400 font-bold">Sold Out</span>
                                    )}
                                    {event.genderSoldOut && event.genderSoldOut !== 'none' && (
                                        <span className="text-[10px] text-orange-400 font-bold">
                                            {event.genderSoldOut.toUpperCase()} tickets sold out
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Categories/Tags */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">🏷️ Categories</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {event.categories.map((cat) => (
                                        <span key={cat} className="px-2 py-0.5 rounded-full bg-[var(--pk-500)]/20 text-[var(--pk-300)] text-[9px] font-bold uppercase tracking-wider border border-[var(--pk-500)]/30">
                                            {cat}
                                        </span>
                                    ))}
                                    {event.tags && event.tags.length > 0 && event.tags.filter(t => !event.categories.includes(t)).map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-white/60 text-[9px] font-medium border border-white/10">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Last Updated */}
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">🔄 Last Updated</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white text-sm">
                                        {new Date(event.lastUpdated).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    <span className="text-[9px] text-white/40">
                                        {Math.round((new Date().getTime() - new Date(event.lastUpdated).getTime()) / (1000 * 60 * 60))}h ago
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* About Section - Full Description */}
                        <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Description</h3>
                            <div className="prose prose-invert max-w-none leading-relaxed">
                                <div className="text-base text-white/90 whitespace-pre-wrap break-words">
                                    {(() => {
                                        const description = safeGetDescription(event.description, 'No further details provided by the host.');
                                        return description ? (
                                            <div className="space-y-3">
                                                {description.split('\n\n').map((paragraph, idx) => (
                                                    <p key={idx} className="mb-3 last:mb-0">
                                                        {paragraph.trim()}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-white/50 italic">No further details provided by the host.</p>
                                        );
                                    })()}
                                </div>
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
            onClick={settings.autoCloseOnClickOutside ? onClose : undefined}
        >
            {content}
        </div>,
        document.body
    );
}
