import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Calendar, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { Partner } from '../types';

interface VdoCallModalProps {
  partner: Partner | null;
  userCredits: number;
  onClose: () => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onProceedToBook: (partner: Partner) => void;
}

export const VdoCallModal: React.FC<VdoCallModalProps> = ({
  partner,
  userCredits,
  onClose,
  onDeductCredits,
  onProceedToBook,
}) => {
  const [callState, setCallState] = useState<'prompt' | 'connecting' | 'connected' | 'ended'>('prompt');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  if (!partner) return null;

  const handleStartCall = () => {
    if (userCredits < partner.vdoCallRate) {
      alert(`เครดิตของคุณไม่เพียงพอ (ต้องการ ${partner.vdoCallRate} เครดิต) กรุณาเติมเครดิตก่อนครับ/ค่ะ`);
      return;
    }
    const success = onDeductCredits(partner.vdoCallRate, `VDO Call ดูตัวพาร์ทเนอร์: ${partner.nickname}`);
    if (success) {
      setCallState('connecting');
      setTimeout(() => {
        setCallState('connected');
      }, 2000);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">
              ระบบ VDO Call ดูตัวจริง (Live Video Verification)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {callState === 'prompt' && (
          <div className="p-6 space-y-6 text-center">
            <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-rose-500/30 p-1">
              <img
                src={partner.imageUrl}
                alt={partner.name}
                className="w-full h-full object-cover rounded-full"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>

            <div>
              <h4 className="text-xl font-bold text-white">
                VDO Call ดูตัว {partner.name} ({partner.nickname})
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                ยืนยันตัวตนสด ไม่ใช้ฟิลเตอร์ลวงตา มั่นใจได้ 100% ว่าตรงปกก่อนจ้างงาน
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-left text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>อัตราค่าบริการดูตัว:</span>
                <span className="font-bold text-amber-400">{partner.vdoCallRate} เครดิต / ครั้ง</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>เครดิตคงเหลือของคุณ:</span>
                <span className="font-semibold text-white">{userCredits.toLocaleString()} เครดิต</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>พาร์ทเนอร์ทุกคนผ่านการยืนยันตัวตนและตรวจประวัติอาชญากรรม (KYC)</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleStartCall}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>เริ่ม VDO Call (หัก {partner.vdoCallRate} เครดิต)</span>
              </button>
            </div>
          </div>
        )}

        {callState === 'connecting' && (
          <div className="p-12 text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
              <img
                src={partner.imageUrl}
                alt={partner.name}
                className="w-full h-full object-cover rounded-full p-2"
              />
            </div>
            <h4 className="text-base font-semibold text-white">กำลังเชื่อมต่อสายตรงถึง {partner.nickname}...</h4>
            <p className="text-xs text-slate-400">ระบบรักษาความปลอดภัยกำลังเข้ารหัสสัญญาณเสียงและภาพแบบ End-to-End</p>
          </div>
        )}

        {callState === 'connected' && (
          <div className="relative aspect-[4/3] bg-slate-950 flex flex-col justify-between overflow-hidden">
            {/* Live Video Feed (Simulation) */}
            <img
              src={partner.galleryImages[1] || partner.imageUrl}
              alt="Live Partner Feed"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60 pointer-events-none"></div>

            {/* Top Info Bar */}
            <div className="relative z-10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-white">LIVE ({formatTimer(seconds)})</span>
                <span className="text-slate-400 text-xs">· ตรงปก 100%</span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Match</span>
              </div>
            </div>

            {/* User Self Camera PIP (Picture in Picture) */}
            <div className="absolute top-16 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl z-20">
              <div className="w-full h-full bg-slate-800 flex items-center justify-center relative">
                {isVideoEnabled ? (
                  <div className="text-center p-2">
                    <span className="text-[10px] text-slate-300">กล้องของคุณ (เปิดอยู่)</span>
                  </div>
                ) : (
                  <div className="text-center p-2 text-slate-500">
                    <VideoOff className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-[9px]">ปิดกล้อง</span>
                  </div>
                )}
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[9px] text-emerald-400">
                  <Volume2 className="w-2.5 h-2.5" />
                  <span>เสียงสด</span>
                </div>
              </div>
            </div>

            {/* Partner Name & Speech Bubble */}
            <div className="relative z-10 p-4 space-y-4">
              <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800/80 max-w-sm">
                <p className="text-xs text-slate-200">
                  <span className="font-semibold text-rose-400">{partner.nickname}:</span> "สวัสดีค่ะ! ยินดีที่ได้คุยกันนะคะ ตัวจริงเหมือนในรูปเป๊ะเลย ยินดีไปเป็นเพื่อนร่วมงานค่ะ"
                </p>
              </div>

              {/* In-Call Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full border transition-colors ${
                    isMuted
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                  title={isMuted ? 'เปิดไมค์' : 'ปิดไมค์'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={`p-3 rounded-full border transition-colors ${
                    !isVideoEnabled
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                  title={isVideoEnabled ? 'ปิดกล้อง' : 'เปิดกล้อง'}
                >
                  {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                {/* Confirm and Book Directly */}
                <button
                  onClick={() => {
                    setCallState('ended');
                    onProceedToBook(partner);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold shadow-lg shadow-rose-900/40 flex items-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>พอใจตรงปก · จองเลย!</span>
                </button>

                {/* End Call */}
                <button
                  onClick={() => setCallState('ended')}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
                  title="วางสาย"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {callState === 'ended' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">สิ้นสุดการ VDO Call ดูตัวเรียบร้อยแล้ว</h4>
              <p className="text-xs text-slate-400 mt-1">
                ระยะเวลาสนทนา {formatTimer(seconds)} · ขอบคุณที่ใช้บริการ Laysea Verification
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  onClose();
                  onProceedToBook(partner);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                ดำเนินการจองนัดหมาย ({partner.nickname})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
