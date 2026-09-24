import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../game/network';
import { Send, X, MessageSquare } from 'lucide-react';

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  playerName: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length > 0) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  if (!isOpen) {
    // Show mini fading chat preview in lower left
    return (
      <div className="pointer-events-none fixed bottom-24 left-4 z-40 max-w-sm space-y-1">
        {messages.slice(-4).map((msg, idx) => (
          <div
            key={`${msg.id || 'msg'}-${idx}`}
            className="bg-black/70 backdrop-blur px-2.5 py-1 rounded text-xs text-white border border-white/10 shadow drop-shadow font-sans"
          >
            <span style={{ color: msg.color || '#60a5fa' }} className="font-bold mr-1.5">
              {msg.sender}:
            </span>
            <span className="text-slate-200">{msg.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-start sm:p-6 p-2 bg-black/40 backdrop-blur-xs">
      <div className="bg-neutral-900/95 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Chat do Mundo em Tempo Real</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-sans text-xs">
          {messages.length === 0 ? (
            <div className="text-slate-500 italic text-center py-8 font-mono">
              Nenhuma mensagem ainda. Diga olá aos outros construtores!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={`${msg.id || 'msg'}-${idx}`} className="leading-relaxed break-words bg-black/30 p-1.5 rounded">
                <span style={{ color: msg.color || '#38bdf8' }} className="font-bold mr-1.5">
                  {msg.sender}:
                </span>
                <span className="text-slate-100">{msg.text}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Send input */}
        <form onSubmit={handleSubmit} className="p-2 border-t border-white/10 bg-black/60 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem (Enter)..."
            maxLength={140}
            className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
