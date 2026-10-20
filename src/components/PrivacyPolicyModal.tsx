import React from 'react';
import { X, ShieldCheck, Lock, MapPin, Phone, User, Trash2, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
              <p className="text-[10px] text-slate-400">Laysea Entertain · มีผลบังคับใช้ 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-[11px] text-rose-200">
            <strong>สรุปสำคัญ:</strong> แพลตฟอร์ม Laysea Entertain ให้ความสำคัญสูงสุดกับความเป็นส่วนตัวและความปลอดภัยของข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center text-[10px]">1</span>
              <span>ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</span>
            </h3>
            <ul className="space-y-2 pl-2">
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <User className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white text-[11px]">ชื่อและนามสกุล / ชื่อเล่น:</strong>
                  <p className="text-[10px] text-slate-400">ใช้สำหรับการระบุตัวตน การสื่อสารระหว่างการนัดหมาย และการออกเอกสารรับรองความปลอดภัย</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white text-[11px]">หมายเลขโทรศัพท์:</strong>
                  <p className="text-[10px] text-slate-400">ใช้สำหรับส่งรหัสยืนยัน OTP ตอนสมัครสมาชิก การป้องกันบัญชีปลอม และการติดต่อฉุกเฉิน</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white text-[11px]">ตำแหน่งที่ตั้งและพิกัด GPS:</strong>
                  <p className="text-[10px] text-slate-400">ใช้สำหรับการนัดพบ (Meetup Tracking) และการคุ้มครองความปลอดภัย (SOS Emergency Protocol) ขณะรับงานเท่านั้น</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center text-[10px]">2</span>
              <span>วัตถุประสงค์ในการนำข้อมูลไปใช้งาน</span>
            </h3>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>เพื่อการให้บริการและการนัดหมาย:</strong> ให้ลูกค้าและพาร์ทเนอร์สามารถตรวจสอบสถานะการเดินทางและจุดนัดพบได้อย่างแม่นยำ</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>เพื่อความปลอดภัยและ SOS ฉุกเฉิน:</strong> ส่งพิกัด GPS แก่เจ้าหน้าที่ตำรวจและทีมเซฟตี้ 24 ชม. กรณีส่งสัญญาณขอความช่วยเหลือ</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>เพื่อกิจกรรมการตลาดและการประชาสัมพันธ์:</strong> ส่งข่าวสาร ส่วนลดพิเศษ โปรโมชั่นเครดิต และกิจกรรมสำหรับสมาชิก (เฉพาะที่ผู้ใช้ยินยอม)</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center text-[10px]">3</span>
              <span>สิทธิในการขอลบบัญชีและข้อมูลผู้ใช้ (Right to Erasure)</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              ผู้ใช้งานมีสิทธิ์ขอลบบัญชีและข้อมูลส่วนบุคคลทั้งหมดออกจากระบบได้ตลอดเวลา โดยสามารถกดปุ่ม <strong className="text-red-400">"ลบบัญชีและข้อมูลผู้ใช้"</strong> ในหน้าตั้งค่าโปรไฟล์ของแอปพลิเคชัน ข้อมูลชื่อ เบอร์โทร และพิกัดจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center text-[10px]">4</span>
              <span>การติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              อีเมล: privacy@laysea.com · เบอร์ติดต่อศูนย์ความปลอดภัย: 02-LAYSEA-SOS · กรุงเทพมหานคร ประเทศไทย
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            รับทราบและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
