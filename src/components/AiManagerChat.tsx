import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, ShieldAlert, AlertTriangle, Video, UserCheck, Bot, User, CheckCircle2, Siren, ArrowRight } from 'lucide-react';
import { ChatMessage } from '../types';

interface AiManagerChatProps {
  onOpenVdoCallModal?: () => void;
  onOpenKycModal?: () => void;
  onOpenSosModal?: () => void;
  onBrowsePartners?: () => void;
}

export const AiManagerChat: React.FC<AiManagerChatProps> = ({
  onOpenVdoCallModal,
  onOpenKycModal,
  onOpenSosModal,
  onBrowsePartners,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `สวัสดีครับ/ค่ะ ผมคือ **AI ผู้จัดการและผู้ดูแลความปลอดภัยประจำ Laysea Entertain** แพลตฟอร์มเพื่อนเที่ยว เพื่อนกินข้าว และคนควงออกงาน (ฟีลแฟน) ระดับพรีเมียม 🌟

ผมพร้อมดูแลคุณตลอด 24 ชั่วโมง ทั้งการจับคู่พาร์ทเนอร์ที่ตรงใจ แนะนำการดูตัวผ่าน VDO Call ข้อมูลการสมัครพาร์ทเนอร์ (KYC) และการกำกับดูแลกฎความปลอดภัยอย่างเคร่งครัด

💡 *คุณสามารถพิมพ์บอกความต้องการ หรือกดทดสอบหัวข้อด้านล่างได้ทันทีครับ/ค่ะ*`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    {
      label: '🎯 หาเพื่อนไปงานแต่ง (Smart Matching)',
      text: 'อยากได้คนคุยเก่ง ชงเหล้าเป็น ไปงานแต่ง เสาร์นี้',
      category: 'matching',
    },
    {
      label: '🌈 หาเพื่อน LGBTQ+ (ทรานส์/ทอม/เกย์/นอนไบนารี)',
      text: 'อยากได้เพื่อนเที่ยวแนว LGBTQ+ สไตล์เฉพาะตัว เช่น ทรานส์วูแมนลุคนางแบบ หรือทอมเท่ ไปกินข้าวคาเฟ่เสาร์นี้',
      category: 'matching',
    },
    {
      label: '🎥 กลัวไม่ตรงปก เช็คยังไง? (VDO Call)',
      text: 'กังวลว่าจะไม่ตรงปก มีวิธีเช็คหรือดูตัวก่อนจ้างงานไหม?',
      category: 'feature',
    },
    {
      label: '📋 สมัครเป็นพาร์ทเนอร์ (KYC)',
      text: 'สนใจสมัครเป็นพาร์ทเนอร์ Laysea Entertain ต้องเตรียมอะไรบ้าง?',
      category: 'onboarding',
    },
    {
      label: '🚨 แจ้งเหตุฉุกเฉิน (SOS Protocol)',
      text: 'ช่วยด้วย กำลังถูกลูกค้าแตะเนื้อต้องตัวลวนลามในร้านอาหาร SOS ขอความช่วยเหลือด่วน',
      category: 'sos',
    },
    {
      label: '🚫 บริการพิเศษ/ค้างคืน (กฎเหล็ก)',
      text: 'มีบริการค้างคืน หรือบริการทางเพศอย่างว่าไหม จ่ายเพิ่มได้',
      category: 'safety',
    },
    {
      label: '⚠️ ขอ Line จ้างนอกระบบ (กฎเหล็ก)',
      text: 'ขอเบอร์โทร หรือขอ Line ส่วนตัวได้ไหม อยากจ่ายเงินสดตรงไม่อยากผ่านระบบ',
      category: 'safety',
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://laysea-entertain-backend.onrender.com/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: data.reply || 'ขออภัย ระบบกำลังประมวลผล กรุณาลองใหม่อีกครั้งครับ/ค่ะ',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        isSosAlert: Boolean(data.isSosAlert),
        isViolationWarning: Boolean(data.isViolationWarning),
        recommendedAction: data.recommendedAction,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          text: 'ระบบกำลังดำเนินการ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้งครับ/ค่ะ',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl flex flex-col h-[740px] max-w-4xl mx-auto overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white text-sm sm:text-base">
                Laysea AI Manager & Safety Supervisor
              </h2>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                Live Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ผู้จัดการดูแลความปลอดภัยตลอด 24 ชม. · คัดกรองคู่เดท · ควบคุมกฎเหล็ก
            </p>
          </div>
        </div>

        {/* Action badges */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ปลอดภัย 100%
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> SOS คุ้มครอง
          </span>
        </div>
      </div>

      {/* Quick Prompt Presets */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> จำลองสถานการณ์:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.text)}
            className="text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-rose-600 text-white'
                    : msg.isSosAlert
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {isUser ? (
                  <User className="w-4 h-4" />
                ) : msg.isSosAlert ? (
                  <Siren className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-amber-300" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-rose-600 text-white rounded-tr-xs'
                    : msg.isSosAlert
                    ? 'bg-red-950/70 border-2 border-red-500/80 text-red-100 rounded-tl-xs shadow-lg shadow-red-950/60'
                    : msg.isViolationWarning
                    ? 'bg-amber-950/40 border border-amber-500/50 text-amber-100 rounded-tl-xs'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-tl-xs'
                }`}
              >
                {/* Special Header Flags */}
                {msg.isSosAlert && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/40 text-red-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>สัญญาณฉุกเฉินระดับสูง (SOS Protocol Activated)</span>
                  </div>
                )}
                {msg.isViolationWarning && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-500/30 text-amber-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>แจ้งเตือนระเบียบความปลอดภัยแพลตฟอร์ม</span>
                  </div>
                )}

                {/* Content with simple markdown rendering */}
                <div className="space-y-2 whitespace-pre-line">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph.split('**').map((chunk, cIdx) =>
                        cIdx % 2 === 1 ? (
                          <strong key={cIdx} className="font-semibold text-white">
                            {chunk}
                          </strong>
                        ) : (
                          chunk
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Interactive Action Shortcuts based on AI Advice */}
                {msg.recommendedAction === 'vdo_call' && onOpenVdoCallModal && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                    <button
                      onClick={onOpenVdoCallModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>ทดลองฟีเจอร์ VDO Call ดูตัวจริง (150 เครดิต)</span>
                    </button>
                  </div>
                )}

                {msg.recommendedAction === 'kyc' && onOpenKycModal && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                    <button
                      onClick={onOpenKycModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>เปิดฟอร์มสมัครพาร์ทเนอร์ (ตรวจสอบประวัติอาชญากรรม)</span>
                    </button>
                  </div>
                )}

                {msg.recommendedAction === 'browse' && onBrowsePartners && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                    <button
                      onClick={onBrowsePartners}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                    >
                      <span>ดูรายชื่อพาร์ทเนอร์ที่ผ่านการคัดกรอง</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {msg.isSosAlert && onOpenSosModal && (
                  <div className="mt-3 pt-3 border-t border-red-500/40 flex flex-wrap gap-2">
                    <button
                      onClick={onOpenSosModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md transition-all animate-pulse"
                    >
                      <Siren className="w-3.5 h-3.5" />
                      <span>เปิดศูนย์ประสานงานฉุกเฉิน & แผนที่ GPS ตำรวจ</span>
                    </button>
                  </div>
                )}

                <div
                  className={`mt-2 text-[10px] text-right ${
                    isUser ? 'text-rose-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
              <Bot className="w-4 h-4 text-amber-300 animate-spin" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl rounded-tl-xs text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>AI ผู้จัดการกำลังวิเคราะห์ความต้องการและตรวจสอบระเบียบความปลอดภัย...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์บอกสเปคพาร์ทเนอร์ สอบถามกฎ หรือส่งสัญญาณฉุกเฉิน..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">ส่ง</span>
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>* คุ้มครองความปลอดภัย 100% · ห้ามการค้าประเวณี · ละเมิดกฎระงับบัญชีทันที</span>
          <span className="text-amber-400/80 font-medium hidden sm:inline">Laysea Safety Guard 24/7</span>
        </div>
      </div>
    </div>
  );
};
