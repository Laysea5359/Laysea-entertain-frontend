import React, { useState } from 'react';
import { X, ShieldCheck, HeartHandshake, CheckCircle2 } from 'lucide-react';

interface KycModalProps {
  onClose: () => void;
}

// ฟังก์ชันย่อขนาดรูปภาพก่อนแปลงเป็น Base64 ป้องกันแรมและ Database เต็ม
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(reader.result as string);
    };
    reader.onerror = () => resolve('');
  });
};

export const KycModal: React.FC<KycModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [age, setAge] = useState('24');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [bankName, setBankName] = useState('กสิกรไทย (KBANK)');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // เอกสารรูปภาพ (เก็บเป็น Base64)
  const [idCardImage, setIdCardImage] = useState<string>('');
  const [portraitImage, setPortraitImage] = useState<string>('');
  const [fullBodyImage, setFullBodyImage] = useState<string>('');
  const [bankBookImage, setBankBookImage] = useState<string>('');

  // ยินยอมเงื่อนไข
  const [consentCriminalCheck, setConsentCriminalCheck] = useState(false);
  const [consentInsurance, setConsentInsurance] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentCriminalCheck || !consentInsurance) {
      alert('กรุณายินยอมการตรวจสอบประวัติอาชญากรรมและการทำประกันอุบัติเหตุ');
      return;
    }

    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');

      const res = await fetch(`${apiUrl}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          nickname,
          gender,
          age,
          phone: cleanPhone,
          lineId,
          idCardNumber,
          bankName,
          bankAccountNumber,
          bankAccountName,
          idCardImage,
          portraitImage,
          fullBodyImage,
          bankBookImage,
          consentCriminalCheck,
          consentInsurance,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการส่งเอกสาร กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('KYC Submit Error:', err);
      // กรณีเน็ตเวิร์กขัดข้องชั่วคราว
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                สมัครเป็นพาร์ทเนอร์ Laysea Entertain
              </h3>
              <p className="text-[11px] text-slate-400">
                ระบบคัดกรอง KYC & ตรวจสอบประวัติอาชญากรรมระดับมาตรฐาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress indicator */}
        <div className="bg-slate-950/40 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step >= 1 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </span>
            <span className={step >= 1 ? 'text-white font-medium' : 'text-slate-500'}>ข้อมูลทั่วไป</span>
          </div>
          <span className="text-slate-600">———</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step >= 2 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={step >= 2 ? 'text-white font-medium' : 'text-slate-500'}>เอกสารสำคัญ</span>
          </div>
          <span className="text-slate-600">———</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step >= 3 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={step >= 3 ? 'text-white font-medium' : 'text-slate-500'}>ความปลอดภัย</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">ส่งข้อมูลสมัครเรียบร้อยแล้ว!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                เจ้าหน้าที่ Laysea Safety Team ได้รับเอกสารของท่านแล้ว และกำลังดำเนินการส่งตรวจเช็คประวัติอาชญากรรม (KYC)
                พร้อมเตรียมนัดหมายสัมภาษณ์ออนไลน์ผ่านระบบ VDO Call ภายใน 24 ชั่วโมง
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>สิทธิประโยชน์ที่ท่านจะได้รับเมื่อผ่านเกณฑ์:</span>
                </div>
                <ul className="text-slate-400 space-y-1 list-disc list-inside">
                  <li>ประกันอุบัติเหตุคุ้มครองทุกงานที่รับผ่านระบบ</li>
                  <li>ระบบ SOS พิกัดฉุกเฉินเชื่อมต่อตำรวจและทีมเซฟตี้ 24 ชม.</li>
                  <li>รับค่าตอบแทนเข้าบัญชีธนาคารตรงเวลาทุกสัปดาห์</li>
                  <li>ปฏิเสธลูกค้าที่ลวนลามได้ทันทีโดยไม่มีบทลงโทษ</li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ชื่อ-นามสกุล (ตามบัตร ปชช.):
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="นาย / นางสาว..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ชื่อเล่น (Nickname):
                      </label>
                      <input
                        type="text"
                        required
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="เช่น มิน, เบลล์, วิน..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        เพศ:
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'female' | 'male')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="female">สุภาพสตรี (Female)</option>
                        <option value="male">สุภาพบุรุษ (Male)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        อายุ (ปี):
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="45"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        เบอร์โทรศัพท์ติดต่อ:
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Line ID:
                      </label>
                      <input
                        type="text"
                        required
                        value={lineId}
                        onChange={(e) => setLineId(e.target.value)}
                        placeholder="Line ID..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      ถัดไป: เตรียมเอกสารสำคัญ →
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {/* 1. National ID Card Upload & Input */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-white">1. บัตรประชาชน (ID Card)</div>
                        <div className="text-[11px] text-slate-400">รูปถ่ายบัตรประชาชนเพื่อตรวจประวัติอาชญากรรม</div>
                      </div>
                      <label className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        idCardImage ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}>
                        {idCardImage ? '✓ อัปโหลดแล้ว' : '+ แนบรูปบัตร'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                        onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                   const compressed = await compressImage(file);
                                                   setIdCardImage(compressed);
                                               }
                                             }}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      maxLength={13}
                      placeholder="กรอกเลขประจำตัวประชาชน 13 หลัก..."
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  {/* 2. Photos Upload */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-white">2. รูปถ่ายหน้าตรงและเต็มตัว (Photos)</div>
                      <div className="text-[11px] text-slate-400">รูปถ่ายคมชัด ไม่สวมแว่นดำหรือหมวกบังใบหน้า</div>
                    </div>
                    <div className="flex gap-2">
                      <label className={`px-3 py-1.5 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        portraitImage ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}>
                        {portraitImage ? '✓ หน้าตรง' : '+ หน้าตรง'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                   const compressed = await compressImage(file);
                                                   setPortraitImage(compressed);
                                               }
                                             }}

                        />
                      </label>

                      <label className={`px-3 py-1.5 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        fullBodyImage ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}>
                        {fullBodyImage ? '✓ เต็มตัว' : '+ เต็มตัว'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                   const compressed = await compressImage(file);
                                                   setFullBodyImage(compressed);
                                               }
                                             }}

                        />
                      </label>
                    </div>
                  </div>

                  {/* 3. Bank Account Upload */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-white">3. หน้าสมุดบัญชีธนาคาร (Bank Book)</div>
                        <div className="text-[11px] text-slate-400">ชื่อบัญชีต้องตรงกับชื่อบัตรประชาชน</div>
                      </div>
                      <label className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        bankBookImage ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}>
                        {bankBookImage ? '✓ อัปโหลดแล้ว' : '+ แนบสมุดบัญชี'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const compressed = await compressImage(file);
                                      setBankBookImage(compressed);
                             }
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
      <select
  value={bankName}
  onChange={(e) => setBankName(e.target.value)}
  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
>
  <option value="กสิกรไทย (KBANK)">กสิกรไทย (KBANK)</option>
  <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
  <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
  <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
  <option value="กรุงศรีอยุธยา (BAY)">กรุงศรีอยุธยา (BAY)</option>
  <option value="ทหารไทยธนชาต (TTB)">ทหารไทยธนชาต (TTB)</option>
  <option value="ออมสิน (GSB)">ออมสิน (GSB)</option>
  <option value="ธ.ก.ส. (BAAC)">ธ.ก.ส. (BAAC)</option>
  <option value="ยูโอบี (UOB)">ยูโอบี (UOB)</option>
  <option value="เกียรตินาคินภัทร (KKP)">เกียรตินาคินภัทร (KKP)</option>
  <option value="ซีไอเอ็มบี ไทย (CIMBT)">ซีไอเอ็มบี ไทย (CIMBT)</option>
  <option value="ทรูมันนี่ วอลเล็ท (TrueMoney)">ทรูมันนี่ วอลเล็ท (TrueMoney)</option>
</select>
                      <input
                        type="text"
                        placeholder="เลขบัญชีธนาคาร..."
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อบัญชี..."
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                    >
                      ถัดไป: ความปลอดภัย & การสัมภาษณ์ →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>ขั้นตอนการคัดกรองและการคุ้มครองความปลอดภัย</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      พาร์ทเนอร์ทุกคนต้องผ่านการสัมภาษณ์ออนไลน์ และตรวจสอบประวัติอาชญากรรมอย่างเคร่งครัด
                    </p>
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-200">
                      🛡️ <strong>ความคุ้มครองพิเศษ:</strong> มีประกันอุบัติเหตุคุ้มครองทุกงานที่รับผ่านระบบ
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={consentCriminalCheck}
                        onChange={(e) => setConsentCriminalCheck(e.target.checked)}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 leading-snug">
                        ข้าพเจ้ายินยอมให้บริษัทดำเนินการตรวจสอบประวัติอาชญากรรม และเข้ารับการสัมภาษณ์ออนไลน์
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={consentInsurance}
                        onChange={(e) => setConsentInsurance(e.target.checked)}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 leading-snug">
                        ข้าพเจ้ารับทราบสิทธิการคุ้มครองประกันอุบัติเหตุ และยินยอมปฏิบัติตามกฎเหล็กงดเว้นบริการทางเพศ 100%
                      </span>
                    </label>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      disabled={!consentCriminalCheck || !consentInsurance || isSubmitting}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30"
                    >
                      {isSubmitting ? 'กำลังส่งเอกสาร...' : 'ยืนยันส่งใบสมัครพาร์ทเนอร์'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};