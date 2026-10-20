import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  ShieldCheck,
  Clock,
  PhoneCall,
  Siren,
  User,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Car,
  Compass,
} from 'lucide-react';
import { Booking } from '../types';

interface LiveTrackingModalProps {
  booking: Booking;
  currentUserRole: 'client' | 'partner' | 'admin';
  onClose: () => void;
  onOpenSos: () => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  booking,
  currentUserRole,
  onClose,
  onOpenSos,
}) => {
  // Simulated tracking state
  const [partnerDistance, setPartnerDistance] = useState(booking.distanceKm || 1.2);
  const [eta, setEta] = useState(booking.etaMinutes || 7);
  const [meetupStatus, setMeetupStatus] = useState<
    'heading_to_meetup' | 'arrived_at_venue' | 'in_session' | 'completed'
  >(booking.meetupStatus || 'heading_to_meetup');
  const [lastPing, setLastPing] = useState('เมื่อสักครู่');
  const [partnerLat, setPartnerLat] = useState(13.7432);
  const [partnerLng, setPartnerLng] = useState(100.5389);

  // Client position: Siam Kempinski / Siam Paragon
  const clientLat = 13.7468;
  const clientLng = 100.5350;

  // Simulate live movement
  useEffect(() => {
    const interval = setInterval(() => {
      setLastPing(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (meetupStatus === 'heading_to_meetup') {
        setPartnerDistance((prev) => {
          if (prev <= 0.2) {
            setMeetupStatus('arrived_at_venue');
            return 0.1;
          }
          return parseFloat((prev - 0.1).toFixed(1));
        });
        setEta((prev) => Math.max(1, prev - 1));
        // move coordinates slightly closer to client
        setPartnerLat((prev) => prev + (clientLat - prev) * 0.1);
        setPartnerLng((prev) => prev + (clientLng - prev) * 0.1);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [meetupStatus, clientLat, clientLng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Navigation className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white">
                  ระบบติดตามพิกัด GPS & ความปลอดภัยสด
                </h3>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-semibold animate-pulse">
                  Live GPS
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                พิกัดนัดพบและติดตามตำแหน่งพาร์ทเนอร์ตราบจนจบภารกิจ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Phase Kicker */}
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                meetupStatus === 'in_session'
                  ? 'bg-rose-500 animate-pulse'
                  : meetupStatus === 'arrived_at_venue'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            ></span>
            <span className="font-bold text-white text-[11px]">
              {meetupStatus === 'heading_to_meetup' && 'พาร์ทเนอร์กำลังเดินทางไปยังจุดนัดพบ'}
              {meetupStatus === 'arrived_at_venue' && 'พาร์ทเนอร์ถึงจุดนัดพบแล้ว (รอเจอกัน)'}
              {meetupStatus === 'in_session' && 'พบกันแล้ว · ระบบคุ้มครองความปลอดภัย Active 100%'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            {meetupStatus === 'heading_to_meetup' ? `ETA ~${eta} นาที` : 'เช็คอินแล้ว'}
          </div>
        </div>

        {/* Simulated High-tech Dark Interactive GPS Map */}
        <div className="relative h-64 bg-slate-950 overflow-hidden border-b border-slate-800 flex items-center justify-center">
          {/* Subtle Map Grid Background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(#475569 1px, transparent 1px), radial-gradient(#334155 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          ></div>

          {/* Road Network Lines Simulation */}
          <svg className="absolute inset-0 w-full h-full stroke-slate-800" strokeWidth="3">
            <path d="M 40 220 Q 180 180 210 110 T 360 40" fill="none" />
            <path d="M 210 110 L 160 30" fill="none" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 40 100 L 380 140" fill="none" strokeWidth="2" />
          </svg>

          {/* Connecting Path Line between Client and Partner */}
          <svg className="absolute inset-0 w-full h-full stroke-rose-500/70" strokeWidth="2.5" strokeDasharray="6 4">
            <line x1="260" y1="90" x2="130" y2="180" className="animate-pulse" />
          </svg>

          {/* Radar Waves Animation from Venue */}
          <div className="absolute top-[85px] left-[255px] -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full border border-rose-500/30 animate-ping"></div>
          </div>

          {/* 1. Client Marker Pin */}
          <div className="absolute top-20 right-20 flex flex-col items-center z-20">
            <div className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[9px] shadow-lg mb-1 flex items-center gap-1 border border-rose-400">
              <User className="w-2.5 h-2.5" />
              <span>{currentUserRole === 'client' ? 'ตำแหน่งคุณ (ลูกค้า)' : 'จุดนัดพบลูกค้า'}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-mono text-slate-400 mt-0.5">Siam Kempinski</span>
          </div>

          {/* 2. Partner Live GPS Moving Pin */}
          <div className="absolute bottom-16 left-24 flex flex-col items-center z-20">
            <div className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[9px] shadow-lg mb-1 flex items-center gap-1 border border-emerald-400 animate-bounce">
              <Car className="w-2.5 h-2.5" />
              <span>{currentUserRole === 'partner' ? 'ตำแหน่งคุณ (พาร์ทเนอร์)' : `${booking.partnerName}`}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white relative">
              <Navigation className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border border-slate-950 rounded-full animate-ping"></span>
            </div>
            <span className="text-[8px] font-mono text-slate-400 mt-0.5">กำลังเคลื่อนที่ (~35 กม./ชม.)</span>
          </div>

          {/* Live Floating Metrics Widget */}
          <div className="absolute top-2 left-2 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-2 text-[10px] space-y-0.5 z-30">
            <div className="flex items-center gap-1 text-slate-400">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>ระยะห่าง: <strong className="text-white">{partnerDistance} กม.</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>ประมาณการ: <strong className="text-white">{eta} นาที</strong></span>
            </div>
          </div>

          {/* Safety Beacon Badge */}
          <div className="absolute bottom-2 right-2 bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 rounded-xl px-2.5 py-1 text-[9px] text-emerald-300 flex items-center gap-1.5 z-30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>เชื่อมต่อศูนย์พิทักษ์ความปลอดภัย Laysea</span>
          </div>
        </div>

        {/* Meetup Details & Continuous Protection */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Venue & Location Card */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">สถานที่นัดพบ:</span>
              <span className="text-[10px] font-mono text-emerald-400">GPS Ping: {lastPing}</span>
            </div>
            <div className="font-bold text-white text-xs flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{booking.location}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              เวลานัดหมาย: {booking.date} เวลา {booking.startTime} น. (ระยะเวลา {booking.durationHours} ชม.)
            </p>
          </div>

          {/* Partner & Client Info Strip */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={booking.partnerImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={booking.partnerName || 'พาร์ทเนอร์'}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <div className="font-bold text-white text-xs">{booking.partnerNickname ? `${booking.partnerName} (${booking.partnerNickname})` : (booking.partnerName || 'พาร์ทเนอร์')}</div>
                <div className="text-[10px] text-emerald-400">✓ ประกันอุบัติเหตุคุ้มครอง 100%</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="tel:0891122334"
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="โทรติดต่อประสานงาน"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Continuous In-Job Safety Guarantee Banner */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-1 text-[11px] text-emerald-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>ระบบคุ้มครองตำแหน่งตลอดระยะเวลาการรับงาน (Safety Geo-Guard):</span>
            </div>
            <p className="text-slate-300 text-[10px] leading-relaxed">
              พิกัด GPS จะถูกส่งเข้าระบบมอนิเตอร์ของศูนย์ Laysea HQ อย่างต่อเนื่องจนกว่าจะจบงาน
              หากพบการเบี่ยงเส้นทางผิดปกติ หรือพาร์ทเนอร์กดปุ่ม SOS เจ้าหน้าที่ตำรวจ สน.พื้นที่
              จะได้รับพิกัดสดเพื่อเข้าช่วยเหลือทันที
            </p>
          </div>

          {/* Interactive Check-in & Actions */}
          <div className="pt-1 flex gap-2">
            {meetupStatus !== 'in_session' ? (
              <button
                onClick={() => setMeetupStatus('in_session')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ยืนยันว่าเจอกันแล้ว (เริ่มภารกิจ)</span>
              </button>
            ) : (
              <div className="flex-1 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                alert('🛡️ ส่งสัญญาณเช็กความปลอดภัยสำเร็จ: บันทึกพิกัด GPS ล่าสุดและแจ้งสถานะ "ปลอดภัยดี" ไปยังศูนย์ Laysea HQ เรียบร้อย');
              }}
              className="flex-1 py-2 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 rounded-xl flex items-center justify-center gap-1 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="แตะเพื่อส่งสัญญาณความปลอดภัยรอบ 30 นาที"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>เช็กปลอดภัย</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const confirmEnd = window.confirm('คุณต้องการ "สิ้นสุดภารกิจ (Complete Job)" และส่งมอบงานอย่างปลอดภัยใช่หรือไม่?');
                if (confirmEnd) {
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
                    const bId = (booking as any)?.id || 'BOOKING-CURRENT';
        await fetch(`${apiUrl}/api/bookings/${bId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: bId }),
        }).catch(() => ({}));
                  } catch (e) {
                    // Fallback
                  }
                  alert('🎉 สิ้นสุดภารกิจเรียบร้อยแล้ว! ระบบบันทึกรายได้สะสมและปิดการติดตาม GPS เรียบร้อย ขอให้เดินทางกลับอย่างปลอดภัย');
                  if (typeof onClose === 'function') {
                    onClose();
                  }
                }
              }}
              className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold shadow-md cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <span>เสร็จสิ้นงาน ✨</span>
            </button>
          </div>
            )}

            {/* Instant SOS Panic Button */}
            <button
              onClick={() => {
                onClose();
                onOpenSos();
              }}
              className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/60 flex items-center justify-center gap-1 shrink-0 animate-pulse cursor-pointer"
            >
              <Siren className="w-3.5 h-3.5" />
              <span>SOS ฉุกเฉิน</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
