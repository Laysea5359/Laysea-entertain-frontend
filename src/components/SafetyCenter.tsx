import React from 'react';
import { ShieldCheck, AlertOctagon, PhoneCall, Ban, HeartHandshake, Eye, ShieldAlert, Award, FileCheck, Siren } from 'lucide-react';

interface SafetyCenterProps {
  onOpenSos: () => void;
  onOpenKyc: () => void;
  onOpenAiChat: () => void;
}

export const SafetyCenter: React.FC<SafetyCenterProps> = ({
  onOpenSos,
  onOpenKyc,
  onOpenAiChat,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3.5 py-1 rounded-full text-xs font-semibold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Laysea SafeGuard Charter & Zero Tolerance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          กฎเหล็กด้านความปลอดภัย & 4 เสาหลักการคุ้มครอง
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto">
          Laysea Entertain ยึดมั่นในความปลอดภัย ศักดิ์ศรีความเป็นมนุษย์ และการบริการเพื่อนร่วมทางระดับพรีเมียม ปราศจากการแสวงหาประโยชน์ทางเพศโดยสิ้นเชิง
        </p>
      </div>

      {/* The 4 Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1 */}
        <div className="bg-slate-900/90 rounded-2xl border border-red-500/30 p-6 space-y-4 hover:border-red-500/50 transition-all shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold">เสาหลักที่ 1</span>
              <h2 className="text-base font-bold text-white">
                งดเว้นบริการทางเพศทุกรูปแบบ 100%
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ไม่อนุญาตให้มีการค้าประเวณี การนัดหมายค้างคืน หรือการกระทำอนาจารทุกชนิด หากตรวจพบการเจรจาหรือความพยายามละเมิด
            ระบบและทีมงานจะปฏิเสธทันที และระงับบัญชีถาวรพร้อมดำเนินคดีตามกฎหมาย
          </p>
          <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/20 text-[11px] text-red-200">
            ⛔ <strong>คำสั่งเด็ดขาด:</strong> พาร์ทเนอร์มีสิทธิ์ยุติงานและเดินออกจากพื้นที่ได้ทันทีหากถูกลวนลาม โดยไม่มีความผิดใดๆ ทั้งสิ้น
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-6 space-y-4 hover:border-amber-500/50 transition-all shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">เสาหลักที่ 2</span>
              <h2 className="text-base font-bold text-white">
                ห้ามแลกเปลี่ยนคอนแทค & จ้างนอกระบบ
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ห้ามขอเบอร์โทรส่วนตัว, Line ID, หรือ Social Media เพื่อจ้างงานนอกแอปพลิเคชัน
            เนื่องจากการจ้างผ่านระบบ Laysea จะได้รับความคุ้มครองจาก **ระบบประกันอุบัติเหตุ** และ **ระบบเซฟตี้ 24 ชั่วโมง**
          </p>
          <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/20 text-[11px] text-amber-200">
            💳 <strong>การชำระเงิน:</strong> ทุกการว่าจ้างและ VDO Call ใช้ "เครดิต" ผ่านระบบเท่านั้น เพื่อความโปร่งใสและตรวจสอบได้
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-slate-900/90 rounded-2xl border border-rose-500/30 p-6 space-y-4 hover:border-rose-500/50 transition-all shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">เสาหลักที่ 3</span>
              <h2 className="text-base font-bold text-white">
                SOS Protocol พิกัด GPS ถึงตำรวจทันที
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            หากพาร์ทเนอร์พิมพ์ข้อความขอความช่วยเหลือ หรือส่งสัญญาณถูกคุกคาม AI และระบบจะตอบกลับปลอบโยนทันที
            และกระจายพิกัด GPS ไปยังทีมฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่ภายในเสี้ยววินาที
          </p>
          <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-500/20 text-[11px] text-rose-200 font-medium">
            🚨 <em>"ระบบได้ส่งพิกัด GPS ของคุณให้ทีมงานฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่แล้ว กรุณาอยู่ในที่ปลอดภัย"</em>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-6 space-y-4 hover:border-emerald-500/50 transition-all shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">เสาหลักที่ 4</span>
              <h2 className="text-base font-bold text-white">
                KYC ตรวจประวัติอาชญากรรม & มีประกันคุ้มครอง
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            พาร์ทเนอร์ทุกคนต้องผ่านการตรวจสอบประวัติอาชญากรรม (Criminal Background Check) ด้วยบัตรประชาชน
            ผ่านการสัมภาษณ์ออนไลน์ และแพลตฟอร์มมีการทำ **ประกันอุบัติเหตุกลุ่ม** คุ้มครองให้ทุกงาน
          </p>
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20 text-[11px] text-emerald-200">
            🛡️ <strong>ความคุ้มครอง:</strong> ประกันอุบัติเหตุและค่ารักษาพยาบาลระหว่างปฏิบัติหน้าที่สูงสุด 500,000 บาท
          </div>
        </div>
      </div>

      {/* Interactive Safety Actions */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-white text-sm">
            ต้องการทดสอบการทำงานของระบบความปลอดภัย หรือปรึกษา AI ผู้จัดการ?
          </h3>
          <p className="text-xs text-slate-400">
            คุณสามารถเปิดคุยกับ AI ผู้จัดการเพื่อตรวจสอบกฎระเบียบ หรือทดลองปุ่มฉุกเฉิน SOS ได้ตลอดเวลา
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAiChat}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            คุยกับ AI ผู้จัดการ
          </button>
          <button
            onClick={onOpenSos}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/30 flex items-center gap-1.5"
          >
            <Siren className="w-3.5 h-3.5" />
            <span>ศูนย์ฉุกเฉิน SOS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
