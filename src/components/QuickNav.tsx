'use client';
import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Event } from '../lib/types';

export default function QuickNav() {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSettings, importEvents, setIsSettingsOpen } = useSettings();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Toggle scroll lock when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const scrollToFeed = () => {
        const feedElement = document.getElementById('event-feed-section');
        if (feedElement) {
            feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleFeedClick = () => {
        updateSettings({ viewMode: 'feed' });
        setIsOpen(false);
        setTimeout(scrollToFeed, 100);
    };

    const handleCollectionClick = () => {
        updateSettings({ viewMode: 'saved' });
        setIsOpen(false);
        setTimeout(scrollToFeed, 100);
    };

    const handleExport = (format: 'json' | 'csv' | 'ics') => {
        const eventsToExport = settings.savedEvents;
        if (eventsToExport.length === 0) {
            alert('No saved events to export!');
            return;
        }

        let content = '';
        let mimeType = '';
        let extension = '';

        if (format === 'json') {
            content = JSON.stringify(eventsToExport, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'csv') {
            const headers = ['Title', 'Date', 'Location', 'Host', 'Price', 'URL', 'Description'];
            const rows = eventsToExport.map(e => [
                `"${(e.title || '').replace(/"/g, '""')}"`,
                `"${e.date}"`,
                `"${(e.location || '').replace(/"/g, '""')}"`,
                `"${(e.host || '').replace(/"/g, '""')}"`,
                `"${(e.price || '').replace(/"/g, '""')}"`,
                `"${e.url}"`,
                `"${(e.description || '').slice(0, 100).replace(/"/g, '""')}..."`
            ]);
            content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        } else if (format === 'ics') {
            // Basic ICS generation
            const events = eventsToExport.map(e => {
                const startDate = new Date(e.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const endDate = e.endDate
                    ? new Date(e.endDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
                    : new Date(new Date(e.date).getTime() + 3 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                return `BEGIN:VEVENT
UID:${e.id || Math.random().toString(36).substr(2)}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${e.title}
DESCRIPTION:${e.description ? e.description.slice(0, 200) + '...' : ''}
LOCATION:${e.location || 'Toronto'}
URL:${e.url}
END:VEVENT`;
            }).join('\n');

            content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TorontoEvents//Antigravity//EN
${events}
END:VCALENDAR`;
            mimeType = 'text/calendar';
            extension = 'ics';
        }

        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `toronto-events-export-${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(result);
                    if (Array.isArray(parsed)) {
                        importEvents(parsed);
                        alert(`Successfully imported ${parsed.length} events!`);
                    }
                } else {
                    alert('Only JSON import is currently supported.');
                }
            } catch (err) {
                console.error('Import failed', err);
                alert('Failed to parse file.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            {/* Trigger Button - Floating Element */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-6 left-6 z-[200] p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl hover:bg-[var(--pk-500)] text-white transition-all group group/nav"
                title="Quick Navigation"
            >
                <div className="flex flex-col gap-1.5 w-6 items-center justify-center">
                    <span className="w-full h-0.5 bg-white rounded-full group-hover/nav:w-4 transition-all" />
                    <span className="w-full h-0.5 bg-white rounded-full group-hover/nav:w-6 transition-all" />
                    <span className="w-full h-0.5 bg-white rounded-full group-hover/nav:w-4 transition-all" />
                </div>
            </button>

            {/* Overlay & Drawer */}
            <div
                className={`fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            >
                <div
                    className={`fixed top-0 left-0 h-full w-[300px] max-w-[90vw] bg-[var(--surface-0)]/95 backdrop-blur-xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[var(--pk-900)] to-transparent">
                        <h2 className="text-xl font-black uppercase tracking-tighter text-white">
                            <span className="text-[var(--pk-500)]">Quick</span> Nav
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">

                        {/* Main Sections */}
                        <div className="space-y-1">
                            <p className="px-4 py-2 text-[10px] font-black uppercase text-[var(--pk-300)] tracking-widest opacity-60">Platform</p>

                            <button
                                onClick={handleFeedClick}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settings.viewMode === 'feed' ? 'bg-[var(--pk-500)] text-white font-bold' : 'hover:bg-white/5 text-[var(--text-2)] hover:text-white'}`}
                            >
                                <span className="text-lg">🌐</span> Global Feed
                            </button>

                            <button
                                onClick={handleCollectionClick}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settings.viewMode === 'saved' ? 'bg-[var(--pk-500)] text-white font-bold' : 'hover:bg-white/5 text-[var(--text-2)] hover:text-white'}`}
                            >
                                <span className="text-lg">♥</span>
                                <span className="flex-1 truncate">My Collection</span>
                                <span className="bg-black/30 px-2 py-0.5 rounded textxs font-mono">{settings.savedEvents.length}</span>
                            </button>
                        </div>

                        {/* Export / Import Section */}
                        <div className="space-y-1 pt-4 border-t border-white/5">
                            <p className="px-4 py-2 text-[10px] font-black uppercase text-[var(--pk-300)] tracking-widest opacity-60">Data Management</p>

                            <div className="px-4 py-2 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleExport('json')}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex flex-col items-center gap-1 transition-all group overflow-hidden"
                                    title="Export as JSON"
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">📦</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider">JSON</span>
                                </button>
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex flex-col items-center gap-1 transition-all group overflow-hidden"
                                    title="Export as CSV"
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider">CSV</span>
                                </button>
                                <button
                                    onClick={() => handleExport('ics')}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex flex-col items-center gap-1 transition-all group col-span-2 overflow-hidden"
                                    title="Export Calendar File (.ics)"
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">📅</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider">Calendar (ICS)</span>
                                </button>
                            </div>

                            <button
                                onClick={handleImportClick}
                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-white/5 text-[var(--text-2)] hover:text-white transition-all overflow-hidden"
                            >
                                <span className="text-lg">📥</span> Import Collection
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".json"
                            />
                        </div>

                        {/* External Links */}
                        <div className="space-y-1 pt-4 border-t border-white/5">
                            <p className="px-4 py-2 text-[10px] font-black uppercase text-[var(--pk-300)] tracking-widest opacity-60">Network</p>

                            <a
                                href="https://findtorontoevents.ca/WINDOWSFIXER/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-blue-500/20 text-blue-200 hover:text-white transition-all border border-transparent hover:border-blue-500/30 overflow-hidden"
                            >
                                <span className="text-lg">🛠️</span> Windows Fixer
                            </a>

                            <button
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-white/5 text-[var(--text-2)] hover:text-white transition-all overflow-hidden"
                            >
                                <span className="text-lg">⚙️</span> System Settings
                            </button>
                        </div>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <p className="text-[10px] text-[var(--text-3)] text-center opacity-50">
                            Antigravity Systems v0.5.0
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
