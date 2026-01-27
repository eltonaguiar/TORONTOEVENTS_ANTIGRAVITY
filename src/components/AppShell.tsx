'use client';
import { useSettings } from '../context/SettingsContext';

export default function AppShell({
    children,
    nav,
    settingsModal
}: {
    children: React.ReactNode,
    nav: React.ReactNode,
    settingsModal: React.ReactNode
}) {
    const { settings } = useSettings();

    return (
        <>
            {/* Background - Fixed and outside scale */}
            <div className={`app-bg-wrapper bg-${settings.activeBackground}`} />

            {/* Navigation & Modals - Fixed and outside scale to prevent transform clipping/context issues */}
            <div className="fixed-ui-layer relative z-[200]">
                {nav}
                {settingsModal}
            </div>

            {/* Main Content - Scalable */}
            <div
                className={`font-size-${settings.fontSize} density-${settings.layoutDensity} relative z-0 min-h-screen`}
                style={{
                    scale: 'var(--webpage-scale)',
                    transformOrigin: 'top center',
                    width: '100%'
                }}
            >
                {children}
            </div>
        </>
    );
}
