'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'pink' | 'blue' | 'green' | 'amber' | 'purple';
export type FontSize = 'sm' | 'md' | 'lg';
export type LayoutDensity = 'compact' | 'normal' | 'spacious';

export type PreviewMode = 'popup' | 'inline';

interface Settings {
    fontSize: FontSize;
    layoutDensity: LayoutDensity;
    themeColor: ThemeColor;
    showTooltips: boolean;
    tooltipColor: string;
    eventFontColor: string;
    tooltipFontColor: string;
    popupFontColor: string;
    detailViewMode: PreviewMode;
    embedSize: 'sm' | 'md' | 'lg' | 'full';
    embedPlacement: 'left' | 'center' | 'right';
    hideSoldOut: boolean;
    gender: 'unspecified' | 'male' | 'female';
    hideGenderSoldOut: boolean;
    excludedKeywords: string[];
    previewHeight: number;
    previewPosition: 'center' | 'bottom-right' | 'right' | 'left';
    isChatboxMode: boolean;
    userPostalCode: string;
    webpageScale: number;
    configPanelWidth: number;
    configPanelHeight: number;
    savedEvents: any[];
    activeBackground: string;
    viewLayout: 'feed' | 'table';
    showChatAssistant: boolean;
    // Location filtering
    enableLocationFilter: boolean;
    userLatitude: number | null;
    userLongitude: number | null;
    maxDistanceKm: number;
    locationSource: 'browser' | 'postal-code' | 'address';
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
    toggleSavedEvent: (event: any) => void;
    importEvents: (events: any[]) => void;
}

const defaultSettings: Settings = {
    fontSize: 'md',
    layoutDensity: 'normal',
    themeColor: 'pink',
    showTooltips: true,
    tooltipColor: '#ec4899', // Default to pink
    eventFontColor: '#ffffff', // Default white
    tooltipFontColor: '#ffffff', // Default white
    popupFontColor: '#ffffff', // Default white
    detailViewMode: 'popup',
    embedSize: 'md',
    embedPlacement: 'center', // Legacy, we use previewPosition now
    hideSoldOut: true,
    gender: 'unspecified',
    hideGenderSoldOut: false,
    excludedKeywords: ['50 and Up', '70s', '80s'],
    previewHeight: 600,
    previewPosition: 'center',
    isChatboxMode: false,
    userPostalCode: '',
    webpageScale: 1.0,
    configPanelWidth: 450,
    configPanelHeight: 800,
    savedEvents: [],
    activeBackground: 'nebula',
    viewLayout: 'feed',
    showChatAssistant: false,
    // Location filtering defaults
    enableLocationFilter: false,
    userLatitude: null,
    userLongitude: null,
    maxDistanceKm: 10, // Default to 10km radius
    locationSource: 'browser',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('toronto-events-settings');
        if (saved) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save settings to localStorage on change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('toronto-events-settings', JSON.stringify(settings));

            // Apply global CSS variables for theme
            const root = document.documentElement;
            const colors: Record<ThemeColor, string> = {
                pink: '#ec4899',
                blue: '#3b82f6',
                green: '#10b981',
                amber: '#f59e0b',
                purple: '#a855f7',
            };
            root.style.setProperty('--pk-500', colors[settings.themeColor]);

            // Generate variants
            const hexToRgb = (hex: string) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `${r}, ${g}, ${b}`;
            };
            root.style.setProperty('--pk-500-rgb', hexToRgb(colors[settings.themeColor]));

            // Apply webpage scale
            root.style.setProperty('--webpage-scale', settings.webpageScale.toString());
        }
    }, [settings, isInitialized]);

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const toggleSavedEvent = (event: any) => {
        setSettings(prev => {
            const exists = prev.savedEvents.find(e => e.id === event.id);
            let newEvents;
            if (exists) {
                newEvents = prev.savedEvents.filter(e => e.id !== event.id);
            } else {
                newEvents = [...prev.savedEvents, event];
            }
            return { ...prev, savedEvents: newEvents };
        });
    };

    const importEvents = (events: any[]) => {
        setSettings(prev => {
            const currentIds = new Set(prev.savedEvents.map(e => e.id));
            const newUnique = events.filter(e => !currentIds.has(e.id));
            return { ...prev, savedEvents: [...prev.savedEvents, ...newUnique] };
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, toggleSavedEvent, importEvents }}>
            <div className={`app-bg-wrapper bg-${settings.activeBackground}`} />
            <div
                className={`font-size-${settings.fontSize} density-${settings.layoutDensity} relative z-0`}
                style={{ scale: 'var(--webpage-scale)', transformOrigin: 'top center' }}
            >
                {children}
            </div>
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
