import React from 'react';
import { ShieldCheck, Siren, MapPin, PhoneCall, Award, Clock, Calendar, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface PartnerPortalViewProps {
  onOpenSos: () => void;
  onExitPartnerView: () => void;
}

export const PartnerPortalView: React.FC<PartnerPortalViewProps> = ({
  onOpenSos,
  onExitPartnerView,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/60 p-6 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>มุมมองพาร์ทเนอร์ผู้ให้บริการ (Partner Staff Portal)</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">ยินดีต้อนรับ พิมพ์ชนก (น้องพิมพ์)</h2>
          <p className="text-xs text-slate-300">
            สถานะ: ออนไลน์พร้อมรับงาน · ผ่านตรวจประวัติอาชญากรรม สนง.ตำรวจแห่งชาติ
          </p>
        </div>

        <button
          onClick={onExitPartnerView}
          className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>สลับกลับมุมมองลูกค้า</span>
        </button>
      </div>

      {/* Prominent Emergency Safety Box */}
      <div className="bg-red-950/30 border-2 border-red-500/60 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <Siren className="w-5 h-5 text-red-500 animate-pulse" />
              <span>ปุ่มฉุกเฉินด่วนสำหรับพาร์ทเนอร์ (One-Tap SOS Guard)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              หากลูกค้านอกลู่นอกทาง พยายามลวนลาม บังคับดื่ม หรือชวนไปสถานที่ปิด
              คุณสามารถกดปุ่มนี้ทันที ระบบจะส่งพิกัด GPS อัตโนมัติไปยังศูนย์ความปลอดภัยและเจ้าหน้าที่ตำรวจท้องที่
            </p>
          </div>
          <button
            onClick={onOpenSos}
            className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-950/80 animate-pulse uppercase tracking-wider shrink-0 cursor-pointer"
          >
            🚨 กดส่ง SOS ทันที
          </button>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-red-500/20 text-xs text-red-200">
          คำเตือนสิทธิ์พาร์ทเนอร์: <strong>คุณมีสิทธิ์ปฏิเสธการบริการทางเพศ 100%</strong> และสามารถยุติงานออกจากพื้นที่ได้ทันที
        </div>
      </div>

      {/* Status & Insurance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: KYC Status */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>สถานะตรวจสอบ KYC</span>
          </div>
          <div className="text-sm font-bold text-white">ผ่านการตรวจสอบแล้ว 100%</div>
          <p className="text-[11px] text-slate-400">
            ตรวจประวัติอาชญากรรมเรียบร้อย ไม่มีประวัติต้องห้าม
          </p>
        </div>

        {/* Card 2: Insurance Policy */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <Award className="w-4 h-4" />
            <span>ประกันอุบัติเหตุกลุ่ม</span>
          </div>
          <div className="text-sm font-bold text-white">คุ้มครองตลอดการรับงาน</div>
          <p className="text-[11px] text-slate-400">
            กรมธรรม์เลขที่ LSE-2026-9921 วงเงินคุ้มครอง 500,000 บาท
          </p>
        </div>

        {/* Card 3: Wallet Earnings */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <Clock className="w-4 h-4" />
            <span>รายได้สะสมเดือนนี้</span>
          </div>
          <div className="text-sm font-bold text-amber-300">38,400 บาท (เครดิต)</div>
          <p className="text-[11px] text-slate-400">
            รอบโอนเงินอัตโนมัติเข้าบัญชีกสิกรไทย ทุกวันศุกร์
          </p>
        </div>
      </div>

      {/* Today's Schedule for Partner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm">ตารางงานที่ได้รับการยืนยันวันนี้</h3>
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-white text-xs">ไปงานแต่งงาน (ควงออกงานสังคม)</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              เช็คอินระบบแล้ว
            </span>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p><strong>สถานที่:</strong> โรงแรมสยาม เคมปินสกี้ กรุงเทพฯ (ห้องแกรนด์บอลรูม)</p>
            <p><strong>เวลา:</strong> 18:00 - 21:00 น. (3 ชั่วโมง)</p>
            <p><strong>ธีมงาน:</strong> สุภาพทางการ สีแชมเปญ/โรสโกลด์</p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">รายได้จากการบริการ: <strong className="text-white">2,400 บาท</strong></span>
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <MapPin className="w-3.5 h-3.5" /> GPS ปักหมุดตรงกับสถานที่จัดงาน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
