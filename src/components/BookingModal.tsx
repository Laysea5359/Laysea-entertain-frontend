import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, ShieldAlert, CheckCircle2, Coins, AlertCircle, Wine, Lock, FileText, Sparkles } from 'lucide-react';
import { Partner, Booking, UserSession } from '../types';
import { calculateProgressiveBookingPrice, POPULAR_DURATIONS } from '../utils/pricing';
import { doc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface BookingModalProps {
  partner: Partner | null;
  userCredits: number;
  userSession?: UserSession;
  onClose: () => void;
  onConfirmBooking: (booking: Booking) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onOpenWallet: () => void;
}

// วันที่ตามเวลาท้องถิ่น (toISOString ใช้ UTC ทำให้ช่วงเที่ยงคืน-ตี 7 ของไทยได้วันเมื่อวาน)
const getLocalDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const withTimeout = <T,>(promise: Promise<T>, ms = 15000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// ตัดค่า undefined ออก เพื่อไม่ให้ Firestore error
const clean = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const BookingModal: React.FC<BookingModalProps> = ({
  partner,
  userCredits,
  userSession,
  onClose,
  onConfirmBooking,
  onDeductCredits,
  onOpenWallet,
}) => {
  // 1. นำ 2 บรรทัดเดิมนี้ใส่กลับเข้ามา
  const [eventType, setEventType] = useState('ดูแลในวงสังสรรค์ / ปาร์ตี้');
  const [location, setLocation] = useState('');

  // 1. พิกัดตำแหน่งที่เลือก
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

// 2. State สำหรับหน้าต่างปักหมุดแผนที่
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number }>({
    lat: 13.2849, // พิกัดเริ่มต้นบางแสน
    lng: 100.9151,
  });
  const [tempPlaceName, setTempPlaceName] = useState('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  // ฟังก์ชันแปลงพิกัดที่คลิกบนแผนที่เป็นชื่อสถานที่
  const handleSelectCoordsFromMap = async (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setIsResolvingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'th' } }
      );
      const data = await res.json();
      const name = data.display_name?.split(',').slice(0, 3).join(', ') || `พิกัด (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setTempPlaceName(name);
    } catch {
      setTempPlaceName(`พิกัด (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
    setIsResolvingAddress(false);
  };

  // 3. ฟังก์ชันดึงตำแหน่งปัจจุบัน
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setLocationCoords({ lat, lng });

        const isFromPC = accuracy > 2000;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'th' } }
          );
          const data = await res.json();
          const placeName =
            data.display_name?.split(',').slice(0, 3).join(', ') ||
            `พิกัดใกล้ฉัน (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          if (isFromPC) {
            setLocation(placeName);
            alert(
              '⚠️ ตรวจพบการใช้งานบนคอมพิวเตอร์/เน็ตบ้าน พิกัดอาจอิงตามชุมสายอินเทอร์เน็ต (หากไม่ตรง ท่านสามารถพิมพ์ระบุชื่อร้าน/สถานที่จริงในช่องได้เลยครับ)'
            );
          } else {
            setLocation(placeName);
          }
        } catch {
          setLocation(`ตำแหน่งปัจจุบัน (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('กรุณาเปิดสิทธิ์เข้าถึงตำแหน่ง (Location / GPS) ในเบราว์เซอร์');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const [date, setDate] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA');
  });
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const hours = String(d.getHours()).padStart(2, '0');
    return `${hours}:00`;
  });
  const [durationHours, setDurationHours] = useState(3);
  const [agreedToSafetyRules, setAgreedToSafetyRules] = useState(false);
  const [agreedToEscrowPolicy, setAgreedToEscrowPolicy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!partner) return null;

  // 1. ดึงเรตราคาตามประเภทงานที่ลูกค้าเลือกจริงแบบ Real-time
  const getDynamicHourlyRate = () => {
    const rates = (partner as any)?.serviceRates || {};
    
    if (eventType.includes('คาเฟ่') || eventType.includes('ข้าว')) {
      return Number(rates.cafe?.rate || 450);
    }
    if (eventType.includes('ดูหนัง') || eventType.includes('เกะ')) {
      return Number(rates.movie?.rate || 500);
    }
    if (eventType.includes('ปาร์ตี้') || eventType.includes('สังสรรค์')) {
      return Number(rates.party?.rate || 700);
    }
    if (eventType.includes('แต่งงาน') || eventType.includes('ออกงาน') || eventType.includes('Fine Dining')) {
      return Number(rates.event?.rate || 900);
    }

    return Number(partner.hourlyRate || 450);
  };

  const currentRatePerHour = getDynamicHourlyRate();

  // 2. คำนวณราคาใหม่ตามเรตของงานที่เลือก
  const pricingBreakdown = calculateProgressiveBookingPrice(currentRatePerHour, durationHours);
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

    if (!agreedToSafetyRules || !agreedToEscrowPolicy) {
      alert('กรุณายินยอมรับทราบกฎความปลอดภัยก่อนยืนยันการจองครับ/ค่ะ');
      return;
    }

   // ตรวจสอบความถูกต้องของวันและเวลา (ป้องกันการจองย้อนหลัง)
    const selectedDateTimeStr = `${date}T${startTime.length === 5 ? startTime + ':00' : startTime}`;
    const selectedTime = new Date(selectedDateTimeStr).getTime();
    const currentTime = Date.now();

    if (isNaN(selectedTime) || selectedTime < currentTime) {
      alert('ไม่สามารถจองวันหรือเวลาย้อนหลังได้ กรุณาเลือกวันและเวลาที่เป็นปัจจุบันหรือล่วงหน้าครับ');
      return;
    }

    const availableCredits = Number(userCredits) || 0;
    const requiredCredits = Number(totalCredits) || 0;

    // ตรวจสอบเครดิตจากยอดจริงที่มีในหน้าจอ
    if (availableCredits < requiredCredits) {
      alert(`เครดิตของคุณไม่เพียงพอ (มีอยู่ ${availableCredits.toLocaleString()} แต่ต้องใช้ ${requiredCredits.toLocaleString()} เครดิต)`);
      return;
    }

    setSubmitting(true);

    try {
      const bookingId = 'BOOK-' + Math.floor(100000 + Math.random() * 900000);
      const remainingCredits = availableCredits - requiredCredits;

     const newBookingData = {
          id: bookingId,
          bookingId: bookingId,
          partnerId: partner.id,
          partnerName: partner.nickname || partner.name || 'พาร์ทเนอร์ Laysea',
          location: location,
          locationCoords: locationCoords || tempCoords,
          eventType: eventType,
          date,
          startTime,
          durationHours: Number(durationHours),
          totalCredits: requiredCredits,
          totalAmountBaht: requiredCredits,
          clientId: userSession?.id || userSession?.uid || '',
          clientName: userSession?.name || userSession?.displayName || 'ลูกค้าทั่วไป',
          clientPhone: userSession?.phone || userSession?.phoneNumber || '',
          status: 'pending',
          escrowStatus: 'held',
          meetupStatus: 'pending',
          lat: (locationCoords || tempCoords)?.lat || null,
          lng: (locationCoords || tempCoords)?.lng || null,
          createdAt: new Date().toISOString()
        };

      // 1. บันทึกงานนัดหมายเข้าคอลเลกชัน bookings ใน Cloud Firestore ทันที
      await setDoc(doc(db, 'bookings', bookingId), newBookingData, { merge: true });

      // 2. หักยอดเครดิตจริงและบันทึกอัปเดตลง Cloud Firestore
      const cleanPhone = String(userSession?.phone || '').replace(/\D/g, '');
      const possibleKeys = [userSession?.id, cleanPhone, userSession?.phone].filter(Boolean);

      for (const k of possibleKeys) {
        if (k) {
          try {
            await setDoc(doc(db, 'users', String(k)), {
              credits: remainingCredits,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            // ข้ามคีย์ที่ไม่มี
          }
        }
      }

      console.log('[Firestore] บันทึกนัดหมายและพักเงิน Escrow สำเร็จ:', bookingId);
      alert(`จองนัดหมายสำเร็จ! พักเงิน Escrow ${requiredCredits.toLocaleString()} เครดิต (คงเหลือ ${remainingCredits.toLocaleString()} เครดิต)`);

      setSubmitting(false);
      if (onDeductCredits) onDeductCredits(requiredCredits, `จองนัดหมาย ${partner.name}`);
      if (onConfirmBooking) onConfirmBooking(newBookingData as any);
      if (onClose) onClose();
      return;
    } catch (err: any) {
      console.error('Booking save error:', err);
      setSubmitting(false);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
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
              อัตราค่าบริการ: {partner.hourlyRate.toLocaleString()} เครดิต/ชม.
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
          <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>สถานที่นัดพบ (ร้านอาหาร / คาเฟ่ / โรงแรม):</span>
              </label>

              {/* ปุ่มเปิดหน้าต่างเลือกหมุดบนแผนที่ */}
              <button
                type="button"
                onClick={() => {
                  if (locationCoords) {
                    setTempCoords(locationCoords);
                    setTempPlaceName(location);
                  }
                  setShowMapPicker(true);
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1 cursor-pointer"
              >
                🗺️ จิ้มปักหมุดบนแผนที่ / ตรวจตำแหน่ง
              </button>
            </div>

            {/* ช่องพิมพ์ระบุสถานที่ */}
            <input
              type="text"
              required
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLocationCoords(null);
              }}
              placeholder="พิมพ์ชื่อสถานที่ ร้านกาแฟ หรือโรงแรมใกล้คุณ..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />

            {/* ปุ่มกดดึงพิกัดที่ลูกค้าอยู่ตอนนี้ */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/50 rounded-xl text-[11px] text-sky-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span>{isLocating ? '⏳ กำลังค้นหาตำแหน่ง...' : '🎯 ใช้ตำแหน่งที่ฉันอยู่ตอนนี้'}</span>
              </button>
              
              {locationCoords && (
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-800/40">
                  ✓ พิกัด: {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              * ข้อมูลที่อยู่ละเอียดจะถูกซ่อนเพื่อความปลอดภัย จนกว่าพาร์ทเนอร์จะกดยืนยันรับงาน
            </p>

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
                min={new Date().toLocaleDateString('en-CA')}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch (err) {}
                }}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                เวลาเริ่มนัดหมาย (เวลาไทย):
              </label>
              <select
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="">เลือกเวลาเริ่มงาน</option>
                {Array.from({ length: 48 }).map((_, i) => {
                  const hour = String(Math.floor(i / 2)).padStart(2, '0');
                  const minute = i % 2 === 0 ? '00' : '30';
                  const timeVal = `${hour}:${minute}`;
                  return (
                    <option key={timeVal} value={timeVal} className="bg-slate-900 text-white">
                      {timeVal} น.
                    </option>
                  );
                })}
              </select>
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
                      {partner.hourlyRate.toLocaleString()} ฿
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

         {/* Modal ปักหมุดเลือกสถานที่บนแผนที่ */}
      {showMapPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  📍 จิ้มเลือกตำแหน่งนัดพบบนแผนที่
                </h4>
                <p className="text-[11px] text-slate-400">แตะหรือคลิกจุดที่ต้องการบนแผนที่เพื่อย้ายหมุด</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            {/* แผนที่แบบ Interactive จิ้มปักหมุดได้จริง */}
            <div className="relative w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <iframe
                title="Interactive Map Picker"
                width="100%"
                height="100%"
                frameBorder="0"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      const map = L.map('map').setView([${tempCoords.lat}, ${tempCoords.lng}], 15);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap'
                      }).addTo(map);

                      let marker = L.marker([${tempCoords.lat}, ${tempCoords.lng}], { draggable: true }).addTo(map);

                      function updatePos(lat, lng) {
                        window.parent.postMessage({ type: 'PIN_LOCATION', lat: lat, lng: lng }, '*');
                      }

                      // เมื่อคลิกบนแผนที่ ให้ย้ายหมุดมาตรงที่คลิกทันที
                      map.on('click', function(e) {
                        marker.setLatLng(e.latlng);
                        updatePos(e.latlng.lat, e.latlng.lng);
                      });

                      // เมื่อลากหมุดปล่อย
                      marker.on('dragend', function(e) {
                        const pos = marker.getLatLng();
                        updatePos(pos.lat, pos.lng);
                      });
                    </script>
                  </body>
                  </html>
                `}
                className="w-full h-full"
              />
            </div>

            {/* แสดงชื่อสถานที่และพิกัด */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="text-[11px] text-slate-400">ตำแหน่งที่ปักหมุด:</div>
              <div className="text-xs font-semibold text-rose-300 truncate">
                {isResolvingAddress ? 'กำลังค้นหาชื่อสถานที่...' : tempPlaceName || location || 'กรุณาแตะบนแผนที่เพื่อเลือกหมุด'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                พิกัด: {tempCoords.lat.toFixed(5)}, {tempCoords.lng.toFixed(5)}
              </div>
            </div>

            {/* ปุ่มกดยืนยันตามสถานที่นี้ */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationCoords(tempCoords);
                  if (tempPlaceName) setLocation(tempPlaceName);
                  setShowMapPicker(false);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                ✓ ยืนยันตามสถานที่นี้
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
