import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isMe?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onEmoji?: (emoji: string) => void;
}

const EMOJIS = [
  { emoji: "👍", label: "好的" },
  { emoji: "😄", label: "哈哈" },
  { emoji: "🤔", label: "思考" },
  { emoji: "😤", label: "生气" },
  { emoji: "🎉", label: "庆祝" },
  { emoji: "🀄", label: "麻将" },
];

export default function ChatPanel({ messages, onSend, onEmoji }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-md p-3 flex flex-col gap-2">
      <div className="text-sm text-white/50 font-semibold tracking-wide uppercase">聊天</div>
      {/* Message log */}
      <div ref={logRef} className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`text-sm pb-1.5 border-b border-white/[.06] leading-relaxed ${m.isMe ? "text-amber-400/70" : "text-white/45"}`}>
            <span className="font-medium">{m.sender}</span>：{m.text}
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="flex gap-1.5 items-center mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="发送消息…"
          className="flex-1 min-w-0 bg-white/[.06] border border-white/[.12] rounded px-2.5 py-1.5 text-sm text-white/60 placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
        />
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="w-8 h-8 bg-white/[.06] border border-white/[.12] rounded flex items-center justify-center cursor-pointer text-base shrink-0 hover:bg-white/[.12] transition-colors"
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 right-0 bg-[#1a2e1a] border border-white/15 rounded-lg p-2.5 flex flex-wrap gap-2 w-36 z-50 shadow-[0_4px_16px_rgba(0,0,0,.5)]">
              {EMOJIS.map((e) => (
                <button
                  key={e.emoji}
                  onClick={() => { onEmoji?.(e.emoji); setShowEmoji(false); }}
                  className="text-lg cursor-pointer hover:scale-125 transition-transform"
                  title={e.label}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
