'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Event } from '../lib/types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    events?: Event[];
}

export default function ChatAssistant({ allEvents }: { allEvents: Event[] }) {
    const { settings, updateSettings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            text: 'Hello! I am your Toronto Event Assistant. How can I help you find something interesting today?',
            timestamp: new Date()
        }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    if (!settings.showChatAssistant) return null;

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        processQuery(input);
        setInput('');
    };

    const processQuery = (query: string) => {
        const q = query.toLowerCase();
        let feedback = "I've updated your filters based on your request.";

        // 1. Interpret "Dating"
        if (q.includes('dating') || q.includes('singles')) {
            updateSettings({ excludedKeywords: [] }); // Reset exclusions if asking for something specific? 
            // Or just append?
        }

        // 2. Interpret "Excluding" or "Without"
        const exclusionMatch = q.match(/(?:excluding|without|no|hide|except)\s+([^,.]+)/);
        if (exclusionMatch) {
            const forbidden = exclusionMatch[1].trim();
            const current = settings.excludedKeywords || [];
            if (!current.includes(forbidden)) {
                updateSettings({ excludedKeywords: [...current, forbidden] });
                feedback += ` Added "${forbidden}" to exclusions.`;
            }
        }

        // 3. Interpret "Sold out"
        if (q.includes('hide sold out') || q.includes('exclude sold out')) {
            updateSettings({ hideSoldOut: true });
        }

        // Simple filtering for the chat bubble results
        const filtered = allEvents.filter(e => {
            const text = `${e.title} ${e.description}`.toLowerCase();
            return text.includes(q.split(' ')[0]); // Very naive first-word match for demo
        }).slice(0, 3);

        setTimeout(() => {
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: filtered.length > 0
                    ? `${feedback} Here are some top matches:`
                    : `${feedback} I couldn't find exact matches for your specific phrase, but I've updated the main feed filters for you.`,
                timestamp: new Date(),
                events: filtered.length > 0 ? filtered : undefined
            };
            setMessages(prev => [...prev, assistantMsg]);
        }, 800);
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <div className="fixed bottom-24 right-6 z-[200]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${isOpen ? 'bg-white text-black scale-90' : 'bg-[var(--pk-500)] text-white hover:scale-110 animate-bounce-slow'}`}
                >
                    {isOpen ? (
                        <span className="text-2xl">×</span>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-xl">💬</span>
                        </div>
                    )}
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-40 right-6 w-[350px] h-[500px] glass-panel rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/20 z-[300] flex flex-col overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="p-6 bg-black/40 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Event Intelligence AI</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="opacity-40 hover:opacity-100 transition-opacity">✕</button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.map(m => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-bold leading-relaxed ${m.role === 'user' ? 'bg-[var(--pk-500)] text-white' : 'bg-white/5 text-[var(--text-2)] border border-white/10'}`}>
                                    {m.text}

                                    {m.events && (
                                        <div className="mt-4 space-y-3">
                                            {m.events.map(e => (
                                                <div key={e.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-3 group/item cursor-pointer hover:border-[var(--pk-500)]/50 transition-colors">
                                                    {e.image && <img src={e.image} className="w-10 h-10 rounded-lg object-cover" />}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate text-[10px] font-black uppercase">{e.title}</p>
                                                        <p className="text-[9px] opacity-50">{new Date(e.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-black/40 border-t border-white/10">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Try 'Find dating for singles...'"
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-[10px] font-bold text-white focus:outline-none focus:border-[var(--pk-500)] transition-all"
                            />
                            <button
                                onClick={handleSend}
                                className="absolute right-2 top-1.5 p-1.5 text-[var(--pk-500)] hover:text-white transition-colors"
                            >
                                🏹
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
