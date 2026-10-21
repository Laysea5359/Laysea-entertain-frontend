import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Siren,
  ArrowRight,
  Navigation,
  Lock,
  AlertTriangle,
  FileText,
  RotateCcw,
  User,
} from 'lucide-react';
import { Booking } from '../types';

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface BookingsListProps {
  bookings: Booking[];
  onOpenSos: () => void;
  onBrowsePartners: () => void;
  onOpenLiveTracking?: (booking: Booking) => void;
  onRefreshBookings?: () => void;
  onDeleteBooking?: (id: string) => void;
}

type BookingItem = Booking & Record<string, any>;

const API_URL: string =
  import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';

const DELETED_IDS_KEY = 'laysea_deleted_booking_ids';

const PENDING_STATUSES = ['matched_pending', 'pending', 'waiting'];
const ACCEPTED_STATUSES = ['accepted', 'confirmed'];
const DELETABLE_STATUSES = ['completed', 'reviewed', 'cancelled'];

// TODO: ตรวจสอบข้อมูลผู้ออกเอกสารให้ตรงกับข้อมูลจดทะเบียนจริง
// (ควรใช้ค่าเดียวกับเอกสาร 50 ทวิในหน้า PartnerPortal — ตอนนี้สองไฟล์ยังไม่ตรงกัน)
const RECEIPT_ISSUER = {
  name: 'บจก. เลย์ซี เอ็นเตอร์เทนเมนต์ (สำนักงานใหญ่)',
  taxId: '0105567089123',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** เวลาเริ่มงานเป็น timestamp (null ถ้าอ่านรูปแบบวันที่/เวลาไม่ได้) */
const getStartTimestamp = (b: BookingItem): number | null => {
  if (!b.date || !b.startTime) return null;
  const t = new Date(`${b.date}T${String(b.startTime).slice(0, 5)}`).getTime();
  return Number.isNaN(t) ? null : t;
};

const loadHiddenIds = (): Set<string> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (PENDING_STATUSES.includes(status)) {
    return (
      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
        ⏳ รอพาร์ทเนอร์ตอบรับ (5 นาที)
      </span>
    );
  }
  if (ACCEPTED_STATUSES.includes(status)) {
    return (
      <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
        ✓ พาร์ทเนอร์ตอบรับแล้ว
      </span>
    );
  }
  switch (status) {
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
          {status || 'ไม่ทราบสถานะ'}
        </span>
      );
  }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  onOpenSos,
  onBrowsePartners,
  onOpenLiveTracking,
  onRefreshBookings,
  onDeleteBooking,
}) => {
  // รายการจะอัปเดตตาม props เสมอ (เดิมคัดลอกเข้า state ครั้งเดียว จึงไม่เห็นการรีเฟรช)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(loadHiddenIds);
  const visibleBookings = useMemo(
    () => (bookings as BookingItem[]).filter((b) => !hiddenIds.has(b.id)),
    [bookings, hiddenIds]
  );

  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<BookingItem | null>(null);
  const [selectedDisputeBooking, setSelectedDisputeBooking] = useState<BookingItem | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  /** ยิง action ไป backend แล้วแจ้งผลตามจริง คืน true เมื่อสำเร็จ */
  const runBookingAction = async (
    bookingId: string,
    path: string,
    body: Record<string, unknown> | undefined,
    messages: { success: string; failure: string; network: string }
  ): Promise<boolean> => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        alert(data.message || messages.success);
        onRefreshBookings?.();
        return true;
      }
      alert(data.message || messages.failure);
      return false;
    } catch (err) {
      console.error(`Booking action "${path}" failed:`, err);
      alert(messages.network);
      return false;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 1. ลูกค้ายืนยันจบงาน -> ปล่อยเงิน Escrow
  const handleConfirmCompletion = async (bookingId: string) => {
    if (!confirm('ยืนยันจบงานและอนุมัติปล่อยเงิน Escrow ให้พาร์ทเนอร์ ใช่หรือไม่?')) return;
    await runBookingAction(bookingId, 'complete', undefined, {
      success: 'ปล่อยเงิน Escrow เรียบร้อยแล้ว',
      failure: 'ไม่สามารถปล่อยเงิน Escrow ได้',
      network: 'เกิดข้อผิดพลาดในการปล่อยเงิน Escrow',
    });
  };

  // 2. แจ้งพาร์ทเนอร์ไม่มาตามนัด (คืนเงิน 100%)
  const handleReportNoShow = async (bookingId: string) => {
    if (
      !confirm(
        'ยืนยันรายงานว่าพาร์ทเนอร์ไม่มาตามเวลานัดหมาย (No-show)? ระบบจะคืนเงิน 100% เข้ากระเป๋าเครดิตของคุณทันที'
      )
    )
      return;
    await runBookingAction(
      bookingId,
      'no-show',
      { notes: 'ลูกค้าแจ้งไม่มาตามเวลานัดหมาย' },
      {
        success: 'บันทึกการรายงาน No-show เรียบร้อยแล้ว',
        failure: 'ไม่สามารถรายงาน No-show ได้',
        network: 'เกิดข้อผิดพลาดในการรายงาน No-show',
      }
    );
  };

  // 3. ลูกค้ายกเลิก (คืนเงินตามช่วงเวลา)
  const handleCancelBooking = async (booking: BookingItem) => {
    const inputReason = prompt('กรุณาระบุเหตุผลการยกเลิกนัดหมาย (คืนเงินตามนโยบายช่วงเวลา):');
    if (inputReason === null) return;
    const reason = inputReason.trim() || 'ลูกค้ายกเลิกนัดหมาย';

    // คำนวณจำนวนชั่วโมงก่อนเริ่มงานจริง (เดิมส่งค่าตายตัว 4 ชม. ทำให้คิดนโยบายคืนเงินผิด)
    // ถ้าอ่านเวลานัดไม่ได้ จะไม่ส่งฟิลด์นี้ ให้ backend คำนวณเอง
    const startTs = getStartTimestamp(booking);
    const hoursUntilStart =
      startTs !== null ? Math.max(0, Math.round(((startTs - Date.now()) / 36e5) * 10) / 10) : undefined;

    await runBookingAction(
      booking.id,
      'cancel',
      { reason, ...(hoursUntilStart !== undefined ? { hoursUntilStart } : {}) },
      {
        success: 'ยกเลิกนัดหมายและดำเนินการคืนเงินสำเร็จ',
        failure: 'ไม่สามารถยกเลิกนัดหมายได้',
        network: 'เกิดข้อผิดพลาดในการยกเลิก',
      }
    );
  };

  // 4. เปิดข้อพิพาท
  const handleSubmitDispute = async () => {
    if (!selectedDisputeBooking || !disputeReason.trim()) return;
    const ok = await runBookingAction(
      selectedDisputeBooking.id,
      'dispute',
      { reason: disputeReason.trim() },
      {
        success: 'ส่งเรื่องข้อพิพาทเรียบร้อยแล้ว',
        failure: 'ไม่สามารถส่งข้อพิพาทได้',
        network: 'เกิดข้อผิดพลาดในการส่งข้อพิพาท',
      }
    );
    if (ok) {
      setSelectedDisputeBooking(null);
      setDisputeReason('');
    }
  };

  // 5. ซ่อน/ลบประวัติรายการที่จบแล้ว
  const handleDeleteHistory = (bookingId: string) => {
    if (!confirm('คุณต้องการลบประวัติการนัดหมายนี้ออกจากรายการใช่หรือไม่?')) return;
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(bookingId);
      try {
        localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn('Cannot persist deleted booking ids:', err);
      }
      return next;
    });
    onDeleteBooking?.(bookingId);
  };

  const receiptAmount = (b: BookingItem) => toNumber(b.totalAmountBaht) || toNumber(b.totalCredits);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">รายการนัดหมายของคุณ</h2>
          <p className="text-[11px] text-slate-400">
            เงินของคุณถูกพักในระบบ Escrow จนกว่าคุณจะยืนยันจบงาน
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowsePartners}
          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>จองเพิ่ม</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2.5">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-semibold text-slate-300">ยังไม่มีรายการนัดหมายในขณะนี้</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            เลือกพาร์ทเนอร์ที่ตรงใจเพื่อเริ่มนัดหมาย
          </p>
          <button
            type="button"
            onClick={onBrowsePartners}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            ค้นหาพาร์ทเนอร์
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((booking) => {
            const status = String(booking.status || '');
            const isPending = PENDING_STATUSES.includes(status);
            const isAccepted = ACCEPTED_STATUSES.includes(status);
            const isInProgress = status === 'in_progress';
            const startTs = getStartTimestamp(booking);
            // แจ้ง No-show ได้เมื่อถึงเวลานัดแล้วเท่านั้น (กันการแจ้งก่อนเวลาเพื่อขอคืนเงิน)
            const canReportNoShow = isAccepted && (startTs === null || Date.now() >= startTs);
            const canCancel = isPending || isAccepted;
            const canDispute = !['completed', 'reviewed', 'cancelled', 'disputed'].includes(status);
            const avatar =
              booking.partnerAvatar ||
              booking.partnerImage ||
              booking.partner?.avatar ||
              booking.partner?.imageUrl ||
              '';

            return (
              <div
                key={booking.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={booking.partnerName || 'Partner'}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-xs">{booking.partnerName || 'พาร์ทเนอร์'}</h3>
                      <div className="text-[11px] text-rose-400 font-medium">{booking.eventType}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-300">
                      {toNumber(booking.totalCredits).toLocaleString()} C
                    </span>
                    <div className="text-[9px] text-emerald-400 flex items-center gap-1 justify-end">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Escrow คุ้มครอง</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={status} />
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptBooking(booking)}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 underline cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>ใบเสร็จ E-Receipt</span>
                  </button>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {booking.date} ({booking.startTime} น.)
                    </span>
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
                    <span className="font-mono text-slate-200">
                      {booking.partnerPhone || booking.partnerPhoneMasked || '-'}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Actions */}
                <div className="space-y-2 pt-1">
                  {DELETABLE_STATUSES.includes(status) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(booking.id)}
                        className="text-[11px] px-2.5 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        ลบประวัติรายการนี้
                      </button>
                    </div>
                  )}

                  {/* Live Tracking */}
                  {(isAccepted || isInProgress) && onOpenLiveTracking && (
                    <button
                      type="button"
                      onClick={() => onOpenLiveTracking(booking)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>📍 ดูพิกัดนัดพบ & แผนที่สด (Live GPS Tracking)</span>
                    </button>
                  )}

                  {/* Confirm Completion & Release Escrow */}
                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleConfirmCompletion(booking.id)}
                      disabled={isSubmittingAction}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ยืนยันจบงานเรียบร้อย & ปล่อยเงิน Escrow ให้พาร์ทเนอร์</span>
                    </button>
                  )}

                  {/* Safety & Dispute options bar */}
                  <div className="flex gap-2">
                    {canReportNoShow && (
                      <button
                        type="button"
                        onClick={() => handleReportNoShow(booking.id)}
                        disabled={isSubmittingAction}
                        className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-red-950/40 disabled:opacity-50 text-red-300 border border-slate-800 hover:border-red-500/40 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        <span>แจ้งไม่มาตามนัด (No-show คืนเงิน 100%)</span>
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(booking)}
                        disabled={isSubmittingAction}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-[10.5px] font-semibold cursor-pointer"
                      >
                        ยกเลิกงาน
                      </button>
                    )}

                    {canDispute && (
                      <button
                        type="button"
                        onClick={() => setSelectedDisputeBooking(booking)}
                        className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>เปิดข้อพิพาท</span>
                      </button>
                    )}

                    <button
                      type="button"
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
            );
          })}
        </div>
      )}

      {/* E-RECEIPT MODAL */}
      {selectedReceiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          {/* พิมพ์เฉพาะใบเสร็จ (เดิม window.print() พิมพ์ทั้งหน้าเว็บ) */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
              #receipt-print-area { position: fixed; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 16px; }
              #receipt-print-area * { color: #000 !important; background: transparent !important; border-color: #999 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-sm">ใบเสร็จรับเงินอิเล็กทรอนิกส์</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div
              id="receipt-print-area"
              className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2"
            >
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>เลขที่ใบเสร็จ:</span>
                <span className="font-mono text-white font-bold">
                  {selectedReceiptBooking.eReceiptNumber || 'ยังไม่ออกเลขที่ใบเสร็จ'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>รหัสนัดหมาย:</span>
                <span className="font-mono text-slate-200">{selectedReceiptBooking.id}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ผู้ออกเอกสาร:</span>
                <span className="text-slate-200 text-right">{RECEIPT_ISSUER.name}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>เลขประจำตัวผู้เสียภาษี:</span>
                <span className="font-mono text-slate-200">{RECEIPT_ISSUER.taxId}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>ชื่อลูกค้า:</span>
                <span className="text-white font-bold">{selectedReceiptBooking.clientName || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>รายการ:</span>
                <span className="text-slate-200">
                  {selectedReceiptBooking.eventType} ({selectedReceiptBooking.durationHours} ชม.)
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>พาร์ทเนอร์ผู้ให้บริการ:</span>
                <span className="text-rose-300">{selectedReceiptBooking.partnerName || '-'}</span>
              </div>
              {toNumber(selectedReceiptBooking.vatAmountBaht) > 0 && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>ภาษีมูลค่าเพิ่ม:</span>
                  <span className="text-slate-200">
                    {toNumber(selectedReceiptBooking.vatAmountBaht).toLocaleString('th-TH')} บาท
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                <span>ยอดเงินรวม:</span>
                <span className="font-bold text-amber-300 text-sm">
                  {receiptAmount(selectedReceiptBooking).toLocaleString('th-TH')} บาท
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-emerald-400">
                <span>สถานะ Escrow:</span>
                <span>
                  {selectedReceiptBooking.escrowStatus === 'escrow_released'
                    ? 'ปล่อยเงินให้พาร์ทเนอร์แล้ว'
                    : String(selectedReceiptBooking.escrowStatus || '').includes('refund')
                    ? 'คืนเงินแล้ว'
                    : 'พักเงินในระบบปลอดภัย'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer no-print"
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
                type="button"
                onClick={() => setSelectedDisputeBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อเปิดข้อพิพาท เงินค่าจ้าง{' '}
              <strong className="text-white">
                {toNumber(selectedDisputeBooking.totalCredits).toLocaleString()} บาท
              </strong>{' '}
              จะถูกแช่แข็งในระบบ Escrow ทันที และส่งเรื่องให้ทีมแอดมินเข้าไกล่เกลี่ย
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                โปรดระบุปัญหาหรือพฤติกรรมที่ไม่ตรงตามข้อตกลง:
              </label>
              <textarea
                rows={3}
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
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={isSubmittingAction || !disputeReason.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
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
