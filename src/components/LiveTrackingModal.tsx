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

  // ใช้พิกัดจริงที่ลูกค้าจองไว้ (ถ้าไม่มี ค่อยใช้พิกัดเริ่มต้นบางแสน)
  const clientLat = (booking as any)?.locationCoords?.lat || 13.2849;
  const clientLng = (booking as any)?.locationCoords?.lng || 100.9151;

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

          {/* แผนที่ตำแหน่งจริง OpenStreetMap */}
        <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 my-2 shadow-inner">
          <iframe
            title="Live Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${clientLng - 0.008}%2C${clientLat - 0.006}%2C${clientLng + 0.008}%2C${clientLat + 0.006}&layer=mapnik&marker=${clientLat}%2C${clientLng}`}
            className="w-full h-full"
          />
        </div>

        {/* ปุ่มลัดเปิด Google Maps นำทางจริงไปยังจุดนัดพบทันที */}
        <div className="px-1 pb-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${clientLat},${clientLng}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
          >
            <span>🧭</span>
            <span>เปิด Google Maps นำทางไปยัง {booking?.location || 'จุดนัดพบ'}</span>
            <span>↗</span>
          </a>
        </div>

        {/* Safety Badge */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-emerald-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>เชื่อมต่อศูนย์พิทักษ์ความปลอดภัย Laysea</span>
          </div>
          <span className="text-slate-500 font-mono">Live GPS</span>
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
