import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Siren,
  ArrowRight,
  Navigation,
  Lock,
  AlertTriangle,
  FileText,
  RotateCcw,
  Star,
  Check,
  Ban,
} from 'lucide-react';
import { Booking, OrderStatus } from '../types';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface BookingsListProps {
  bookings: Booking[];
  onOpenSos: () => void;
  onBrowsePartners: () => void;
  onOpenLiveTracking?: (booking: Booking) => void;
  onRefreshBookings?: () => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  onOpenSos,
  onBrowsePartners,
  onOpenLiveTracking,
  onRefreshBookings,
}) => {
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<Booking | null>(null);
  const [selectedDisputeBooking, setSelectedDisputeBooking] = useState<Booking | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Status mapping
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'matched_pending':
        return (
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
            ⏳ รอพาร์ทเนอร์ตอบรับ (5 นาที)
          </span>
        );
      case 'accepted':
        return (
          <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
            ✓ พาร์ทเนอร์ตอบรับแล้ว (กำลังเดินทาง)
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
            🟢 กำลังปฏิบัติงาน (In Progress)
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
            ✓ จบงานสมบูรณ์ (Escrow Released)
          </span>
        );
      case 'reviewed':
        return (
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
            ★ รีวิวเรียบร้อย
          </span>
        );
      case 'cancelled':
        return (
          <span className="text-[10px] bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full font-bold">
            ยกเลิกแล้ว (คืนเงินตามนโยบาย)
          </span>
        );
      case 'disputed':
        return (
          <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
            ⚠️ อยู่ระหว่างไกล่เกลี่ยข้อพิพาท
          </span>
        );
      default:
        return (
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
            {status}
          </span>
        );
    }
  };

  // 1. Client Confirms Job Completion -> Releases Escrow & Pays Payout
const handleConfirmCompletion = async (bookingId: string) => {
    if (!confirm('ยืนยันจบงานและอนุมัติปล่อยเงิน Escrow ให้พาร์ทเนอร์ ใช่หรือไม่?')) return;
    setIsSubmittingAction(true);
    try {
      // อัปเดตตรงเข้า Cloud Firestore ทันที
      await setDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        escrowStatus: 'released',
        completedAt: new Date().toISOString()
      }, { merge: true });

      alert('ยืนยันจบงานและอนุมัติปล่อยเงิน Escrow เรียบร้อยแล้ว!');
      if (onRefreshBookings) onRefreshBookings();
    } catch (err) {
      console.error('Error completing booking:', err);
      alert('เกิดข้อผิดพลาดในการปล่อยเงิน Escrow');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 2. Partner No-Show Report (100% Immediate Auto-Refund)
const handleReportNoShow = async (bookingId: string) => {
  if (!confirm('ยืนยันรายงานว่าพาร์ทเนอร์ไม่มาตามเวลานัดหมาย (No-show)? ระบบจะคืนเงิน 100% เข้ากระเป๋าเครดิตของคุณทันที')) return;
  setIsSubmittingAction(true);
  try {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
    const res = await fetch(`${backendUrl}/api/bookings/${bookingId}/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'ลูกค้าแจ้งไม่มาตามเวลานัดหมาย' }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      if (onRefreshBookings) onRefreshBookings();
    }
  } catch {
    alert('เกิดข้อผิดพลาดในการรายงาน No-show');
  } finally {
    setIsSubmittingAction(false);
  }
};

  // 3. Client Cancellation (Tiered Policy)
  const handleCancelBooking = async (bookingId: string) => {
    const inputReason = prompt('กรุณาระบุเหตุผลการยกเลิกนัดหมาย (คืนเงินตามนโยบายช่วงเวลา):');
    // ถ้าผู้ใช้กด Cancel ในกล่องข้อความ ให้ยกเลิกการทำงาน
    if (inputReason === null) return;
    
    // หากกด OK โดยไม่พิมพ์ข้อความ ให้ใส่เหตุผลเริ่มต้นให้อัตโนมัติ เพื่อให้คำขอส่งต่อไปยังระบบได้
    const reason = inputReason.trim() || 'ลูกค้ายกเลิกนัดหมาย';

    setIsSubmittingAction(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${backendUrl}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, hoursUntilStart: 4 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'ยกเลิกนัดหมายและดำเนินการคืนเงินสำเร็จ');
        if (typeof onRefreshBookings === 'function') {
          onRefreshBookings();
        } else {
          // รีเฟรชหน้ารายการเพื่อให้ข้อมูลอัปเดตทันที
          window.location.reload();
        }
      } else {
        alert(data.message || 'ไม่สามารถยกเลิกนัดหมายได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการยกเลิก');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 4. Submit Dispute
  const handleSubmitDispute = async () => {
    if (!selectedDisputeBooking || !disputeReason.trim()) return;
    setIsSubmittingAction(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${backendUrl}/api/bookings/${selectedDisputeBooking.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedDisputeBooking(null);
        setDisputeReason('');
        if (onRefreshBookings) onRefreshBookings();
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการส่งข้อพิพาท');
    } finally {
      setIsSubmittingAction(false);
    }
  };

// ฟังก์ชันตรวจสอบว่านัดหมายนี้สามารถลบได้หรือไม่ (ต้องเสร็จสิ้นแล้ว หรือเวลาจริงผ่านไปแล้ว)
  const canDeleteBooking = (b: any): boolean => {
    if (!b) return false;
    // 1. ถ้างานจบแล้ว (completed), ยกเลิกแล้ว (cancelled), หรือรีวิวแล้ว สามารถลบได้ทันที
    if (['completed', 'cancelled', 'reviewed'].includes(b.status)) {
      return true;
    }

    // 2. ตรวจสอบเวลาจริง: ถ้าเวลาเริ่มงาน + ระยะเวลาชั่วโมง ได้ผ่านพ้นเวลาปัจจุบันไปแล้ว
    try {
      if (b.date && b.startTime) {
        const [hours, minutes] = String(b.startTime).split(':').map(Number);
        const bookingStartDate = new Date(b.date);
        bookingStartDate.setHours(hours || 0, minutes || 0, 0, 0);

        const durationMs = (Number(b.durationHours) || 1) * 60 * 60 * 1000;
        const bookingEndDate = new Date(bookingStartDate.getTime() + durationMs);

        if (Date.now() > bookingEndDate.getTime()) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Check booking time error:', e);
    }

    return false;
  };

  // ฟังก์ชันสั่งลบตารางนัดหมาย
  const handleDeleteBooking = async (b: any) => {
    const bookingId = b?.bookingId || b?.id;
    if (!bookingId) return;

    if (!canDeleteBooking(b)) {
      alert('⚠️ ไม่สามารถลบได้: นัดหมายนี้ยังไม่เสร็จสิ้น หรือยังไม่ถึงกำหนดเวลาสิ้นสุดงานจริง');
      return;
    }

    if (!confirm('ยืนยันที่จะลบรายการนัดหมายนี้ออกจากประวัติของคุณใช่หรือไม่?')) return;

    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      alert('ลบรายการนัดหมายเรียบร้อยแล้ว');
      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Delete booking error:', err);
      alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">รายการนัดหมายของคุณ</h2>
          <p className="text-[11px] text-slate-400">
            ระบบ State Machine & พักเงิน Escrow ปลอดภัย 100%
          </p>
        </div>
        <button
          onClick={onBrowsePartners}
          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>จองเพิ่ม</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2.5">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-semibold text-slate-300">ยังไม่มีรายการนัดหมายในขณะนี้</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            เลือกพาร์ทเนอร์ที่ตรงใจเพื่อเริ่มนัดหมาย พร้อมการันตีความปลอดภัยและป้องกันการจองซ้อน
          </p>
          <button
            onClick={onBrowsePartners}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            ค้นหาพาร์ทเนอร์
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={booking.partnerImage}
                    alt={booking.partnerName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h3 className="font-bold text-white text-xs">{booking.partnerName}</h3>
                    <div className="text-[11px] text-rose-400 font-medium">{booking.eventType}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-amber-300">
                    {booking.totalCredits.toLocaleString()} C
                  </span>
                  <div className="text-[9px] text-emerald-400 flex items-center gap-1 justify-end">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Escrow คุ้มครอง</span>
                  </div>
                </div>
              </div>

              {/* Status & Timing Banner */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(booking.status)}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptBooking(booking)}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 underline cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>ใบเสร็จ E-Receipt</span>
                </button>
              </div>

       {/* แสดงปุ่มลบเฉพาะเมื่องานเสร็จสิ้นหรือเลยกำหนดเวลาแล้วเท่านั้น */}
        {canDeleteBooking(booking) ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleDeleteBooking(booking)}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              🗑️ ลบประวัติรายการนี้
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1 italic">
              🔒 รายการนี้จะลบได้เมื่อเสร็จสิ้นงานหรือพ้นกำหนดเวลานัดหมาย
            </span>
          </div>
        )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{booking.date} ({booking.startTime} น.)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{booking.durationHours} ชั่วโมง</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{booking.location}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>เบอร์ติดต่อพาร์ทเนอร์:</span>
                  <span className="font-mono text-slate-200">{booking.partnerPhone || booking.partnerPhoneMasked}</span>
                </div>
              </div>

              {/* Lifecycle Actions */}
              <div className="space-y-2 pt-1">
                {/* 1. Live Tracking (when accepted or in progress) */}
                {(booking.status === 'accepted' || booking.status === 'in_progress') && onOpenLiveTracking && (
                  <button
                    onClick={() => onOpenLiveTracking(booking)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 animate-spin" />
                    <span>📍 ดูพิกัดนัดพบ & แผนที่สด (Live GPS Tracking)</span>
                  </button>
                )}

                {/* 2. Confirm Completion & Release Escrow */}
                {booking.status === 'in_progress' && (
                  <button
                    onClick={() => handleConfirmCompletion(booking.id)}
                    disabled={isSubmittingAction}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันจบงานเรียบร้อย & ปล่อยเงิน Escrow ให้พาร์ทเนอร์</span>
                  </button>
                )}

                {/* 3. Safety & Dispute options bar */}
                <div className="flex gap-2">
                  {/* No-show button if accepted or in progress */}
                  {(booking.status === 'matched_pending' || booking.status === 'accepted') && (
                    <button
                      onClick={() => handleReportNoShow(booking.id)}
                      disabled={isSubmittingAction}
                      className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-red-950/40 text-red-300 border border-slate-800 hover:border-red-500/40 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-red-400" />
                      <span>แจ้งไม่มาตามนัด (No-show คืนเงิน 100%)</span>
                    </button>
                  )}

                  {/* Cancel button */}
                  {booking.status === 'matched_pending' && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={isSubmittingAction}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10.5px] font-semibold cursor-pointer"
                    >
                      ยกเลิกงาน
                    </button>
                  )}

                  {/* Dispute button */}
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'disputed' && (
                    <button
                      onClick={() => setSelectedDisputeBooking(booking)}
                      className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>เปิดข้อพิพาท</span>
                    </button>
                  )}

                  {/* SOS button */}
                  <button
                    onClick={onOpenSos}
                    className="py-1.5 px-2.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    title="แจ้งเหตุฉุกเฉิน"
                  >
                    <Siren className="w-3.5 h-3.5" />
                    <span>SOS</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* E-RECEIPT MODAL */}
      {selectedReceiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-sm">ใบเสร็จรับเงิน / ใบกำกับภาษีอิเล็กทรอนิกส์</h3>
              </div>
              <button
                onClick={() => setSelectedReceiptBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>เลขที่ใบเสร็จ:</span>
                <span className="font-mono text-white font-bold">{selectedReceiptBooking.eReceiptNumber || `REC-${selectedReceiptBooking.id}`}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ผู้ออกเอกสาร:</span>
                <span className="text-slate-200">บจก. เลย์ซี เอ็นเตอร์เทนเมนต์ (สำนักงานใหญ่)</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>เลขประจำตัวผู้เสียภาษี:</span>
                <span className="font-mono text-slate-200">0105567089123</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>ชื่อลูกค้า:</span>
                <span className="text-white font-bold">{selectedReceiptBooking.clientName}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>รายการ:</span>
                <span className="text-slate-200">{selectedReceiptBooking.eventType} ({selectedReceiptBooking.durationHours} ชม.)</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>พาร์ทเนอร์ผู้ให้บริการ:</span>
                <span className="text-rose-300">{selectedReceiptBooking.partnerName}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                <span>ยอดเงินรวม (รวมภาษีมูลค่าเพิ่ม 7%):</span>
                <span className="font-bold text-amber-300 text-sm">{selectedReceiptBooking.totalAmountBaht.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-[10px] text-emerald-400">
                <span>สถานะ Escrow:</span>
                <span>{selectedReceiptBooking.escrowStatus === 'escrow_released' ? 'ปล่อยเงินให้พาร์ทเนอร์แล้ว' : 'พักเงินในระบบปลอดภัย'}</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert('ดาวน์โหลดไฟล์ PDF ใบเสร็จรับเงินสำเร็จ');
                setSelectedReceiptBooking(null);
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              ดาวน์โหลด PDF / พิมพ์ใบเสร็จ
            </button>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {selectedDisputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">เปิดข้อพิพาท (Dispute Resolution)</h3>
              </div>
              <button
                onClick={() => setSelectedDisputeBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อเปิดข้อพิพาท เงินค่าจ้าง <strong className="text-white">{selectedDisputeBooking.totalCredits} บาท</strong> จะถูกแช่แข็งในระบบ Escrow ทันที และส่งเรื่องให้ทีมแอดมินเข้าไกล่เกลี่ย
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                โปรดระบุปัญหาหรือพฤติกรรมที่ไม่ตรงตามข้อตกลง:
              </label>
              <textarea
                rows={3}
                required
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="เช่น ไม่ตรงปกอย่างมาก, มีพฤติกรรมไม่เหมาะสม, หรือไม่ครบชั่วโมง..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDisputeBooking(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={isSubmittingAction || !disputeReason.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingAction ? 'กำลังส่งเรื่อง...' : 'ส่งเรื่องให้แอดมินไกล่เกลี่ย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
