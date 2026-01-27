'use client';
import React from 'react';
import { useSettings, ThemeColor, FontSize, LayoutDensity } from '../context/SettingsContext';

export default function SettingsManager() {
    const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen } = useSettings();

    const themeColors: { name: ThemeColor; value: string }[] = [
        { name: 'pink', value: '#ec4899' },
        { name: 'blue', value: '#3b82f6' },
        { name: 'green', value: '#10b981' },
        { name: 'amber', value: '#f59e0b' },
        { name: 'purple', value: '#a855f7' },
    ];

    const toggleOpen = () => setIsSettingsOpen(!isSettingsOpen);

    return (
        <>
            {/* 1. PRIMARY PERSISTENT GEAR (Top-Right Viewport) */}
            <div className="fixed top-6 right-6 z-[200] flex gap-3 pointer-events-none">
                <button
                    onClick={toggleOpen}
                    className="pointer-events-auto px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl hover:bg-[var(--pk-500)] text-white transition-all group overflow-hidden flex items-center gap-2"
                    title="System Configuration (Top Right)"
                >
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-xl group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all">Config</span>
                    </div>
                </button>
            </div>

            {/* 2. SECONDARY FLOATING GEAR (Bottom-Right Viewport - Always Accessible) */}
            <div className="fixed bottom-6 right-6 z-[200]">
                <button
                    onClick={toggleOpen}
                    className={`w-16 h-16 rounded-full glass-panel flex items-center justify-center transition-all duration-500 shadow-2xl hover:shadow-[0_0_40px_rgba(var(--pk-500-rgb),0.6)] ${isSettingsOpen ? 'rotate-90 bg-[var(--pk-500)] text-white scale-110' : 'hover:scale-125 text-[var(--pk-300)] animate-pulse'}`}
                    title="Configuration Settings (Always Accessible)"
                    aria-label="Open Settings"
                >
                    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* SETTINGS MODAL / POPUP */}
            {isSettingsOpen && (
                <div
                    className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSettingsOpen(false)}
                >
                    <div
                        className="glass-panel rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/20 flex flex-col overflow-hidden fixed"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${settings.configPanelWidth || 450}px`,
                            height: `${settings.configPanelHeight || 800}px`,
                            maxHeight: '90vh',
                            maxWidth: '95vw',
                            resize: 'both',
                            minWidth: '350px',
                            minHeight: '400px',
                            zIndex: 301
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseUp={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            updateSettings({
                                configPanelWidth: Math.round(rect.width),
                                configPanelHeight: Math.round(rect.height)
                            });
                        }}
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 shrink-0 flex items-center justify-between bg-black/40 backdrop-blur-md z-10">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <span className="p-2 bg-[var(--pk-500)] text-white rounded-xl shadow-lg animate-spin-slow">⚙</span>
                                <span className="tracking-tight uppercase">System Architect</span>
                            </h3>
                            <button onClick={toggleOpen} className="p-2 hover:bg-white/10 rounded-full transition-colors font-bold text-2xl">×</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0 space-y-10">
                            <p className="text-[10px] text-[var(--text-3)] font-black uppercase tracking-widest opacity-50 border-b border-white/5 pb-2">Customization Protocol</p>

                            <div className="space-y-8">
                                {/* Theme Color */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--pk-300)]">City Aura (Theme)</label>
                                    <div className="flex flex-wrap gap-4">
                                        {themeColors.map(color => (
                                            <button
                                                key={color.name}
                                                onClick={() => updateSettings({ themeColor: color.name })}
                                                className={`w-10 h-10 rounded-2xl border-2 transition-all shadow-xl ${settings.themeColor === color.name ? 'border-white scale-110 ring-4 ring-[var(--pk-500)]/30' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Resizable UI Indicator */}
                                <div className="p-4 bg-[var(--pk-500)]/10 border border-[var(--pk-500)]/20 rounded-2xl">
                                    <p className="text-[10px] font-bold text-[var(--pk-200)] flex items-center gap-2">
                                        ↔️ Resizable Interface: Drag bottom-right corner to adjust your workspace.
                                    </p>
                                </div>

                                {/* Dynamic Backgrounds */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--pk-300)]">Chrono-Atmosphere (Background)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'nebula', label: 'Nebula', class: 'bg-nebula' },
                                            { id: 'midnight', label: 'Midnight', class: 'bg-midnight' },
                                            { id: 'forest', label: 'Forest', class: 'bg-forest' },
                                            { id: 'sunset', label: 'Sunset', class: 'bg-sunset' }
                                        ].map(bg => (
                                            <button
                                                key={bg.id}
                                                onClick={() => updateSettings({ activeBackground: bg.id })}
                                                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${settings.activeBackground === bg.id ? 'border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-white/5 bg-black/40 opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg ${bg.class} border border-white/20`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{bg.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Page Zoom */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Intelligence Scale (Zoom)</label>
                                    <div className="flex items-center gap-6 p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <input
                                            type="range"
                                            min="0.75"
                                            max="1.25"
                                            step="0.05"
                                            value={settings.webpageScale}
                                            onChange={(e) => updateSettings({ webpageScale: parseFloat(e.target.value) })}
                                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--pk-500)]"
                                        />
                                        <span className="text-lg font-black font-mono text-[var(--text-2)] tabular-nums">{Math.round(settings.webpageScale * 100)}%</span>
                                    </div>
                                </div>

                                {/* Intelligence Assistant Toggle */}
                                <div className="flex items-center justify-between p-4 bg-[var(--pk-500)]/10 border border-[var(--pk-500)]/20 rounded-2xl">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-tight text-[var(--pk-200)]">Chat Search Assistant</span>
                                        <span className="text-[9px] opacity-60 font-bold text-[var(--pk-300)]">Natural language discovery active</span>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ showChatAssistant: !settings.showChatAssistant })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${settings.showChatAssistant ? 'bg-[var(--pk-500)] shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.5)]' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${settings.showChatAssistant ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Font / Layout */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Text Size</label>
                                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                            {(['sm', 'md', 'lg'] as FontSize[]).map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => updateSettings({ fontSize: size })}
                                                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${settings.fontSize === size ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Density</label>
                                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                            {(['compact', 'normal', 'spacious'] as LayoutDensity[]).map(density => (
                                                <button
                                                    key={density}
                                                    onClick={() => updateSettings({ layoutDensity: density })}
                                                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${settings.layoutDensity === density ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                                >
                                                    {density.slice(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail View Mode */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Preview Engine</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'popup', label: 'Tactical Overlay', desc: 'Floating modal window' },
                                            { id: 'inline', label: 'Embedded Feed', desc: 'Inline expanding section' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => updateSettings({ detailViewMode: mode.id as any })}
                                                className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${settings.detailViewMode === mode.id ? 'border-[var(--pk-500)] bg-[var(--pk-500)]/10 shadow-[0_0_20px_rgba(var(--pk-500-rgb),0.2)]' : 'border-white/5 bg-black/20 opacity-50 hover:opacity-80'}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-tight">{mode.label}</span>
                                                <span className="text-[9px] opacity-60 font-bold">{mode.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Popup Architect */}
                                <div className="space-y-6 pt-4 border-t border-white/5 bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--pk-300)]">Overlay Architect</label>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Overlay Height</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range" min="400" max="1000" step="50"
                                                value={settings.previewHeight}
                                                onChange={(e) => updateSettings({ previewHeight: parseInt(e.target.value) })}
                                                className="flex-1 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--pk-500)]"
                                            />
                                            <span className="text-xs font-black font-mono text-[var(--pk-300)]">{settings.previewHeight}px</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Launch Position</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'center', label: 'Full Center' },
                                                { id: 'bottom-right', label: 'Chat Style' },
                                                { id: 'right', label: 'Right Dock' },
                                                { id: 'left', label: 'Left Dock' }
                                            ].map(pos => (
                                                <button
                                                    key={pos.id}
                                                    onClick={() => updateSettings({ previewPosition: pos.id as any })}
                                                    className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all border ${settings.previewPosition === pos.id ? 'bg-[var(--pk-500)] text-white border-[var(--pk-500)] shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:border-white/20'}`}
                                                >
                                                    {pos.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tight">Chatbox Mode</span>
                                            <span className="text-[10px] opacity-50 font-bold">Narrow docked overlay</span>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ isChatboxMode: !settings.isChatboxMode })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${settings.isChatboxMode ? 'bg-[var(--pk-500)] shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.5)]' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${settings.isChatboxMode ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tight">Auto-Close on Click Outside</span>
                                            <span className="text-[10px] opacity-50 font-bold">Close popup when clicking outside</span>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ autoCloseOnClickOutside: !settings.autoCloseOnClickOutside })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${settings.autoCloseOnClickOutside ? 'bg-[var(--pk-500)] shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.5)]' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${settings.autoCloseOnClickOutside ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Intelligent Filtering */}
                                <div className="space-y-6 pt-4 border-t border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--pk-300)]">Neural Filters</label>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tight">Auto-Hide Sold Out</span>
                                            <span className="text-[10px] opacity-50 font-bold">Clean up the feed automatically</span>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ hideSoldOut: !settings.hideSoldOut })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${settings.hideSoldOut ? 'bg-[var(--pk-500)]' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.hideSoldOut ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {/* Location Filter */}
                                    <div className="space-y-4 p-4 bg-gradient-to-br from-[var(--pk-500)]/10 to-purple-500/10 rounded-2xl border border-[var(--pk-500)]/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase tracking-tight text-[var(--pk-200)]">📍 Events Near Me</span>
                                                <span className="text-[10px] opacity-60 font-bold text-[var(--pk-300)]">Filter by proximity to your location</span>
                                            </div>
                                            <button
                                                onClick={() => updateSettings({ enableLocationFilter: !settings.enableLocationFilter })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${settings.enableLocationFilter ? 'bg-[var(--pk-500)] shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.5)]' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${settings.enableLocationFilter ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {settings.enableLocationFilter && (
                                            <div className="space-y-4 pt-4 border-t border-white/10">
                                                {/* Location Source */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Location Source</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { id: 'browser', label: 'Browser', icon: '🌐' },
                                                            { id: 'postal-code', label: 'Postal', icon: '📮' },
                                                            { id: 'address', label: 'Address', icon: '🏠' }
                                                        ].map(source => (
                                                            <button
                                                                key={source.id}
                                                                onClick={() => updateSettings({ locationSource: source.id as any })}
                                                                className={`py-2 px-3 text-[10px] font-black uppercase rounded-xl transition-all border ${settings.locationSource === source.id ? 'bg-[var(--pk-500)] text-white border-[var(--pk-500)] shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:border-white/20'}`}
                                                            >
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span>{source.icon}</span>
                                                                    <span>{source.label}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Postal Code Input */}
                                                {settings.locationSource === 'postal-code' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Postal Code</label>
                                                        <input
                                                            type="text"
                                                            placeholder="M5V 3A8"
                                                            value={settings.userPostalCode}
                                                            onChange={(e) => updateSettings({ userPostalCode: e.target.value.toUpperCase() })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-[var(--pk-500)] shadow-inner"
                                                            maxLength={7}
                                                        />
                                                    </div>
                                                )}

                                                {/* Address Input */}
                                                {settings.locationSource === 'address' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Address</label>
                                                        <input
                                                            type="text"
                                                            placeholder="123 Queen St W, Toronto"
                                                            value={settings.userAddress}
                                                            onChange={(e) => updateSettings({ userAddress: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[var(--pk-500)] shadow-inner"
                                                        />
                                                    </div>
                                                )}

                                                {/* Distance Radius */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Max Distance</label>
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="50"
                                                            step="1"
                                                            value={settings.maxDistanceKm}
                                                            onChange={(e) => updateSettings({ maxDistanceKm: parseInt(e.target.value) })}
                                                            className="flex-1 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--pk-500)]"
                                                        />
                                                        <span className="text-xs font-black font-mono text-[var(--pk-300)] min-w-[60px]">{settings.maxDistanceKm} km</span>
                                                    </div>
                                                </div>

                                                {/* Current Location Status */}
                                                {settings.userLatitude && settings.userLongitude && (
                                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                        <p className="text-[10px] font-bold text-green-400 flex items-center gap-2">
                                                            ✓ Location set: {settings.userLatitude.toFixed(4)}, {settings.userLongitude.toFixed(4)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Display Format */}
                                    <div className="space-y-4 p-4 bg-gradient-to-br from-[var(--pk-500)]/10 to-purple-500/10 rounded-2xl border border-[var(--pk-500)]/20">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--pk-300)]">💰 Price Display Format</label>
                                        <div className="space-y-2">
                                            <p className="text-[9px] opacity-60 font-bold text-[var(--pk-200)]">Choose how prices are displayed on event cards</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { id: 'single', label: 'Single Price', desc: 'Show minimum price or "See tickets"' },
                                                    { id: 'range', label: 'Price Range', desc: 'Show min - max when available (e.g., $25 - $75)' },
                                                    { id: 'all-ticket-types', label: 'All Ticket Types', desc: 'List all ticket types with prices' }
                                                ].map(format => (
                                                    <button
                                                        key={format.id}
                                                        onClick={() => updateSettings({ priceDisplayFormat: format.id as any })}
                                                        className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${settings.priceDisplayFormat === format.id ? 'border-[var(--pk-500)] bg-[var(--pk-500)]/20 shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.3)]' : 'border-white/5 bg-black/20 opacity-60 hover:opacity-80'}`}
                                                    >
                                                        <span className="text-xs font-black uppercase tracking-tight">{format.label}</span>
                                                        <span className="text-[9px] opacity-60 font-bold">{format.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keyword Blacklist */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Term Exclusions</label>
                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                placeholder="Enter forbidden keyword..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-[var(--pk-500)] shadow-inner"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val) {
                                                            const current = settings.excludedKeywords || [];
                                                            if (!current.includes(val)) {
                                                                updateSettings({ excludedKeywords: [...current, val] });
                                                            }
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {(settings.excludedKeywords || []).map(keyword => (
                                                    <span key={keyword} className="flex items-center gap-3 pl-4 pr-3 py-2 bg-[var(--pk-500)] text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">
                                                        {keyword}
                                                        <button onClick={() => updateSettings({ excludedKeywords: (settings.excludedKeywords || []).filter(k => k !== keyword) })} className="hover:scale-125 transition-transform">✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-white/10 opacity-30 text-center space-y-2 pb-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Antigravity UI Systems</p>
                                <p className="text-[10px] font-bold">All parameters synced to local environment.</p>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-8 border-t border-white/10 bg-black/60 backdrop-blur-md shrink-0">
                            <button
                                onClick={toggleOpen}
                                className="w-full py-5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-[var(--pk-500)] hover:text-white transition-all shadow-xl"
                            >
                                Secure Parameters & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
