import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, ShieldAlert, CheckCircle2, Coins, AlertCircle, Wine, Lock, FileText, Sparkles } from 'lucide-react';
import { Partner, Booking, UserSession } from '../types';
import { calculateProgressiveBookingPrice, POPULAR_DURATIONS } from '../utils/pricing';

interface BookingModalProps {
  partner: Partner | null;
  userCredits: number;
  userSession?: UserSession;
  onClose: () => void;
  onConfirmBooking: (booking: Booking) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onOpenWallet: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  partner,
  userCredits,
  userSession,
  onClose,
  onConfirmBooking,
  onDeductCredits,
  onOpenWallet,
}) => {
  const [eventType, setEventType] = useState('ดูแลในวงสังสรรค์ / ปาร์ตี้');
  const [location, setLocation] = useState('ร้านอาหารรูฟท็อป ทองหล่อ กรุงเทพฯ');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [durationHours, setDurationHours] = useState(3);
  const [agreedToSafetyRules, setAgreedToSafetyRules] = useState(false);
  const [agreedToEscrowPolicy, setAgreedToEscrowPolicy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!partner) return null;

// ดึงราคาจริงของพาร์ทเนอร์ ถ้าไม่มีหรือเป็น 0 ให้ใช้ราคามาตรฐาน 850 เครดิต/ชม.
const realHourlyRate = Number(partner.hourlyRate || (partner as any).price || (partner as any).rate || 1500);

const pricingBreakdown = calculateProgressiveBookingPrice(realHourlyRate, durationHours);
const totalCredits = pricingBreakdown.totalPrice;
const hasEnoughCredits = userCredits >= totalCredits;

  const eventOptions = [
    'ดูแลในวงสังสรรค์ / ปาร์ตี้',
    'เพื่อนกินข้าว / ดินเนอร์หรู Fine Dining',
    'ไปงานแต่งงาน / ควงออกงานสังคม (ฟีลแฟน)',
    'เที่ยวคาเฟ่ ถ่ายรูป ช้อปปิ้ง',
    'เพื่อนดูหนัง ร้องคาราโอเกะ',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreedToSafetyRules) {
      alert('กรุณายินยอมรับทราบกฎความปลอดภัยก่อนยืนยันการจองครับ/ค่ะ');
      return;
    }
    if (!hasEnoughCredits) {
      alert('เครดิตของคุณไม่เพียงพอ กรุณาเติมเครดิตก่อนครับ/ค่ะ');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Call Backend to perform Atomic Database Transaction & Double-Booking Lock
      const res = await fetch('https://laysea-entertain-backend-1.onrender.com/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: partner.id,
          eventType,
          location,
          date,
          startTime,
          durationHours,
          totalCredits,
          clientId: userSession?.id || 'USR-CLIENT-01',
          clientName: userSession?.name || 'คุณลูกค้า',
          clientPhone: userSession?.phone || '089-112-2334',
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Double-booking conflict caught by server lock
        setErrorMessage(data.message || 'ขออภัย พาร์ทเนอร์มีคิวงานที่ยืนยันแล้วในช่วงเวลาดังกล่าว');
        setSubmitting(false);
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'เกิดข้อผิดพลาดในการสร้างคำขอนัดหมาย');
        setSubmitting(false);
        return;
      }

      // 2. Deduct credits from user wallet
      onDeductCredits(totalCredits, `พักเงินในระบบ Escrow นัดหมาย ${partner.name} (${durationHours} ชม.)`);
      onConfirmBooking(data.booking);
      alert('สร้างคำขอนัดหมายเรียบร้อย! เงินของคุณถูกพักไว้ในระบบ Escrow ปลอดภัย และระบบกำลังส่งการแจ้งเตือนไปยังพาร์ทเนอร์เพื่อตอบรับภายใน 5 นาที');
      onClose();
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">
              สร้างนัดหมายพาร์ทเนอร์ (Booking Request)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Partner Mini Header */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center gap-3">
          <img
            src={partner.imageUrl}
            alt={partner.name}
            className="w-12 h-12 rounded-xl object-cover border border-slate-700"
          />
          <div className="flex-1">
            <div className="font-bold text-white text-sm">
              {partner.name} ({partner.nickname})
            </div>
            <div className="text-xs text-rose-400">
              อัตราค่าบริการ: {realHourlyRate.toLocaleString()} เครดิต/ชม.
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>ตรวจประวัติอาชญากรรมแล้ว · มีประกันอุบัติเหตุคุ้มครอง</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong>แจ้งเตือน:</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Event Style Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-rose-400" />
              <span>สไตล์งาน / กิจกรรมที่ต้องการ:</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {eventOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setEventType(opt)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                    eventType === opt
                      ? 'bg-rose-500/15 border-rose-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{opt}</span>
                  {eventType === opt && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>สถานที่นัดพบ (ร้านอาหาร / โรงแรม / สถานที่สาธารณะ):</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น ร้านอาหารรูฟท็อป ทองหล่อ, สยามพารากอน"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * ข้อมูลที่อยู่ละเอียดจะถูกซ่อนเพื่อความปลอดภัย จนกว่าพาร์ทเนอร์จะกดยืนยันรับงาน
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                วันที่นัดหมาย:
              </label>
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                เวลาเริ่มนัดหมาย:
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Duration with Progressive Discounts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                ระยะเวลาการจ้าง:
              </label>
              <div className="text-right">
                <span className="text-amber-300 font-bold text-xs">{durationHours} ชั่วโมง</span>
                <span className="text-[10px] text-rose-400 ml-1.5 font-medium">({pricingBreakdown.badgeText})</span>
              </div>
            </div>

            {/* Duration Pills: 1-4 hrs progressively lower, and 1 full day (8 hrs) even lower */}
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_DURATIONS.map((dur) => {
                const isSelected = durationHours === dur.hours;
                return (
                  <button
                    type="button"
                    key={dur.hours}
                    onClick={() => setDurationHours(dur.hours)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="text-xs font-bold">{dur.label}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-amber-200' : 'text-rose-400'}`}>
                      {dur.hint}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              * สิทธิพิเศษ: อัตราค่าบริการต่อชั่วโมงจะลดลงเมื่อจอง 1-4 ชม. และลดลงพิเศษสูงสุดถึง 35% สำหรับแพ็กเกจเหมา 1 วัน
            </p>
          </div>

          {/* Pricing & Escrow Guarantee Box */}
          <div className="p-3.5 bg-gradient-to-tr from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl space-y-2.5 text-xs">
            {/* Header Tier Status */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{pricingBreakdown.tierLabel}</span>
              </div>
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-semibold">
                {pricingBreakdown.badgeText}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>อัตราคิดตามจริงต่อชั่วโมง:</span>
                <span className="font-semibold text-white">
                  ~{pricingBreakdown.effectiveHourlyRate.toLocaleString()} เครดิต/ชม.
                  {pricingBreakdown.discountPercent > 0 && (
                    <span className="text-slate-500 line-through text-[10.5px] ml-1.5">
                    {realHourlyRate.toLocaleString()} ฿
                   </span>
                  )}
                </span>
              </div>

              {pricingBreakdown.savingsBaht > 0 && (
                <div className="flex items-center justify-between text-emerald-400 text-[11px] font-medium bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-500/20">
                  <span>ส่วนลดระยะยาว (ประหยัดได้):</span>
                  <span className="font-bold">- {pricingBreakdown.savingsBaht.toLocaleString()} เครดิต (ลด {pricingBreakdown.discountPercent}%)</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-300 font-medium">ยอดรวมค่าบริการสุทธิ ({durationHours} ชม.):</span>
                <span className="font-bold text-amber-300 text-base">
                  {totalCredits.toLocaleString()} เครดิต (บาท)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>เครดิตในกระเป๋าของคุณ:</span>
              <span className={hasEnoughCredits ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {userCredits.toLocaleString()} เครดิต
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[10.5px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>การันตีความปลอดภัยด้วยระบบพักเงิน Escrow:</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                เงินจะถูกพักไว้ในระบบส่วนกลาง และจะโอนให้พาร์ทเนอร์ก็ต่อเมื่อผู้ให้บริการทำงานเสร็จและลูกค้ายืนยันเท่านั้น หากพาร์ทเนอร์ไม่มาตามนัด (No-show) ระบบคืนเงิน 100% ทันที
              </p>
            </div>
          </div>

          {/* Consents */}
          <div className="space-y-2 pt-1 border-t border-slate-800 text-[11px]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedToSafetyRules}
                onChange={(e) => setAgreedToSafetyRules(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
              <span className="text-rose-300 leading-snug font-medium">
                ยินยอมรับทราบกฎเหล็ก: งดบริการทางเพศ 100%, ห้ามลวนลาม, และไม่แลกเปลี่ยนคอนแทคนอกระบบ
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedToEscrowPolicy}
                onChange={(e) => setAgreedToEscrowPolicy(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
              <span className="text-slate-400 leading-snug">
                ยอมรับนโยบายการยกเลิกงาน (Cancellation Tier) และการออกใบเสร็จรับเงินอิเล็กทรอนิกส์ (E-Receipt)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            {!hasEnoughCredits ? (
              <button
                type="button"
                onClick={onOpenWallet}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>เติมเครดิตก่อนทำการจอง ({userCredits} / {totalCredits})</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'กำลังตรวจสอบคิวงาน...' : 'ยืนยันการนัดหมายและพักเงิน Escrow'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
