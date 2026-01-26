'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'pink' | 'blue' | 'green' | 'amber' | 'purple';
export type FontSize = 'sm' | 'md' | 'lg';
export type LayoutDensity = 'compact' | 'normal' | 'spacious';

interface Settings {
    fontSize: FontSize;
    layoutDensity: LayoutDensity;
    themeColor: ThemeColor;
    showTooltips: boolean;
    embedSize: 'sm' | 'md' | 'lg' | 'full';
    embedPlacement: 'left' | 'center' | 'right';
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
    fontSize: 'md',
    layoutDensity: 'normal',
    themeColor: 'pink',
    showTooltips: true,
    embedSize: 'md',
    embedPlacement: 'center',
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
        }
    }, [settings, isInitialized]);

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            <div className={`font-size-${settings.fontSize} density-${settings.layoutDensity}`}>
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
