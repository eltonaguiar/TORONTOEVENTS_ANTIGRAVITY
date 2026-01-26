'use client';
import React, { useState } from 'react';
import { useSettings, ThemeColor, FontSize, LayoutDensity } from '../context/SettingsContext';

export default function SettingsManager() {
    const { settings, updateSettings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);

    const themeColors: { name: ThemeColor; value: string }[] = [
        { name: 'pink', value: '#ec4899' },
        { name: 'blue', value: '#3b82f6' },
        { name: 'green', value: '#10b981' },
        { name: 'amber', value: '#f59e0b' },
        { name: 'purple', value: '#a855f7' },
    ];

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            {/* Gear Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full glass-panel flex items-center justify-center transition-all duration-500 shadow-2xl ${isOpen ? 'rotate-90 bg-[var(--pk-500)] text-white' : 'hover:scale-110 text-[var(--pk-300)]'}`}
                title="Configuration Settings"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Settings Panel */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-85 glass-panel rounded-2xl p-6 shadow-2xl border border-white/10 animate-fade-in backdrop-blur-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-md pb-2 z-10">
                        <span className="text-[var(--pk-500)]">⚙</span> System Config
                    </h3>

                    <div className="space-y-8">
                        {/* Theme Color */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Aura Color</label>
                            <div className="flex gap-3">
                                {themeColors.map(color => (
                                    <button
                                        key={color.name}
                                        onClick={() => updateSettings({ themeColor: color.name })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${settings.themeColor === color.name ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Page Zoom */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Webpage Scale</label>
                            <div className="flex items-center gap-4 px-1">
                                <input
                                    type="range"
                                    min="0.75"
                                    max="1.25"
                                    step="0.05"
                                    value={settings.webpageScale}
                                    onChange={(e) => updateSettings({ webpageScale: parseFloat(e.target.value) })}
                                    className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--pk-500)]"
                                />
                                <span className="text-xs font-mono w-10 text-right text-[var(--text-2)]">{Math.round(settings.webpageScale * 100)}%</span>
                            </div>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Visual Scale</label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-black/20 rounded-lg">
                                {(['sm', 'md', 'lg'] as FontSize[]).map(size => (
                                    <button
                                        key={size}
                                        onClick={() => updateSettings({ fontSize: size })}
                                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${settings.fontSize === size ? 'bg-[var(--pk-500)] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        {size.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Layout Density */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Layout Density</label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-black/20 rounded-lg">
                                {(['compact', 'normal', 'spacious'] as LayoutDensity[]).map(density => (
                                    <button
                                        key={density}
                                        onClick={() => updateSettings({ layoutDensity: density })}
                                        className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${settings.layoutDensity === density ? 'bg-[var(--pk-500)] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        {density.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Detail View Mode */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">Detail View Mode</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-lg">
                                {[
                                    { id: 'popup', label: 'Modal Pop-up' },
                                    { id: 'inline', label: 'Inline Embed' }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => updateSettings({ detailViewMode: mode.id as any })}
                                        className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${settings.detailViewMode === mode.id ? 'bg-[var(--pk-500)] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Popup Architect */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--pk-300)] opacity-70">Popup Architect</label>

                            {/* Height Slider */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Preview Height</label>
                                <div className="flex items-center gap-4 px-1">
                                    <input
                                        type="range"
                                        min="400"
                                        max="1000"
                                        step="50"
                                        value={settings.previewHeight}
                                        onChange={(e) => updateSettings({ previewHeight: parseInt(e.target.value) })}
                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--pk-500)]"
                                    />
                                    <span className="text-xs font-mono w-10 text-right text-[var(--text-2)]">{settings.previewHeight}px</span>
                                </div>
                            </div>

                            {/* Position Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Anchor Position</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-lg">
                                    {[
                                        { id: 'center', label: 'Center Focus' },
                                        { id: 'bottom-right', label: 'Bottom Right' },
                                        { id: 'right', label: 'Right Side' },
                                        { id: 'left', label: 'Left Side' }
                                    ].map(pos => (
                                        <button
                                            key={pos.id}
                                            onClick={() => updateSettings({ previewPosition: pos.id as any })}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${settings.previewPosition === pos.id ? 'bg-[var(--pk-500)] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            {pos.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chatbox Mode Toggle */}
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Chatbox Mode</span>
                                    <span className="text-[10px] text-[var(--text-3)]">Docked & compact style</span>
                                </div>
                                <button
                                    onClick={() => updateSettings({ isChatboxMode: !settings.isChatboxMode })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.isChatboxMode ? 'bg-[var(--pk-500)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.isChatboxMode ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Event Filters Section */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--pk-300)] opacity-70">Intelligent Filtering</label>

                            {/* Hide Sold Out */}
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Hide Sold Out</span>
                                    <span className="text-[10px] text-[var(--text-3)]">Remove unavailable events</span>
                                </div>
                                <button
                                    onClick={() => updateSettings({ hideSoldOut: !settings.hideSoldOut })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.hideSoldOut ? 'bg-[var(--pk-500)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.hideSoldOut ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Gender Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Target Gender</label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-black/20 rounded-lg">
                                    {[
                                        { id: 'unspecified', label: 'None' },
                                        { id: 'male', label: 'Male' },
                                        { id: 'female', label: 'Female' }
                                    ].map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => updateSettings({ gender: g.id as any })}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${settings.gender === g.id ? 'bg-[var(--pk-500)] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Gender Specific Sold Out */}
                            {settings.gender !== 'unspecified' && (
                                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 animate-fade-in">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-blue-100">Gender Filter</span>
                                        <span className="text-[10px] text-blue-300/70">Hide sold out for {settings.gender}s</span>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ hideGenderSoldOut: !settings.hideGenderSoldOut })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${settings.hideGenderSoldOut ? 'bg-blue-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.hideGenderSoldOut ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            )}

                            {/* Keyword Blacklist */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Keyword Blacklist</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add keyword to hide..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--pk-500)]"
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
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {(settings.excludedKeywords || []).map(keyword => (
                                            <span
                                                key={keyword}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-[var(--pk-500)]/10 border border-[var(--pk-500)]/20 rounded text-[10px] font-bold text-[var(--pk-200)] group"
                                            >
                                                {keyword}
                                                <button
                                                    onClick={() => {
                                                        const current = settings.excludedKeywords || [];
                                                        updateSettings({ excludedKeywords: current.filter(k => k !== keyword) });
                                                    }}
                                                    className="hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-[var(--text-3)] italic">Hides events containing these words in title/info.</p>
                                </div>
                            </div>
                        </div>

                        {/* Tooltips & Color */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-3)]">X-Ray Options</label>
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Tooltips</span>
                                    <span className="text-[10px] text-[var(--text-3)]">Hover intelligence</span>
                                </div>
                                <button
                                    onClick={() => updateSettings({ showTooltips: !settings.showTooltips })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.showTooltips ? 'bg-[var(--pk-500)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.showTooltips ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            {settings.showTooltips && (
                                <div className="space-y-2 px-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Tooltip Glow</label>
                                    <div className="flex gap-2">
                                        {['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ffffff'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateSettings({ tooltipColor: color })}
                                                className={`w-6 h-6 rounded-md border transition-all ${settings.tooltipColor === color ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5 sticky bottom-0 bg-[#0a0a0b]/80 backdrop-blur-md pb-2 mt-auto">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all border border-white/10"
                            >
                                Close & Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
