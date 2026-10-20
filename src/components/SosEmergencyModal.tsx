import React, { useState } from 'react';
import { X, AlertTriangle, Siren, MapPin, PhoneCall, ShieldAlert, CheckCircle2, Radio, Shield } from 'lucide-react';
import { SosIncident } from '../types';

interface SosEmergencyModalProps {
  onClose: () => void;
  incidents: SosIncident[];
  onTriggerSos: (message: string) => void;
}

export const SosEmergencyModal: React.FC<SosEmergencyModalProps> = ({
  onClose,
  incidents,
  onTriggerSos,
}) => {
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [customThreat, setCustomThreat] = useState('ถูกลูกค้าพยายามแตะเนื้อต้องตัว ลวนลามในร้าน');
  const [gpsCoordinates] = useState({ lat: 13.736717, lng: 100.560638 });

  const handlePanicClick = () => {
    setPanicTriggered(true);
    onTriggerSos(customThreat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-red-500/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Urgent Header */}
        <div className="flex items-center justify-between p-4 bg-red-950/80 border-b border-red-500/40">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center animate-pulse">
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                ศูนย์ปฏิบัติการฉุกเฉิน Laysea SOS & Safety Center
              </h3>
              <p className="text-[11px] text-red-200">
                ระบบรักษาความปลอดภัยพาร์ทเนอร์และลูกค้าแบบ Real-time GPS 24/7
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-900/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {panicTriggered ? (
            <div className="space-y-4">
              {/* Massive Confirmation Banner */}
              <div className="p-5 bg-red-950/60 border-2 border-red-500 rounded-2xl space-y-3 text-red-100 shadow-lg">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                  <span>สถานะ: กำลังประสานงานเจ้าหน้าที่ตำรวจและทีมเผชิญเหตุด่วน</span>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-red-500/40 space-y-2">
                  <p className="text-xs text-rose-200">
                    ใจเย็นๆ นะครับ/คะ คุณไม่ต้องตกใจ ขอให้พยายามตั้งสติและถอยห่างจากจุดเสี่ยง
                  </p>
                  <p className="text-sm font-bold text-white bg-red-900/40 p-2.5 rounded-lg border border-red-500/30">
                    "ระบบได้ส่งพิกัด GPS ของคุณให้ทีมงานฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่แล้ว กรุณาอยู่ในที่ปลอดภัย"
                  </p>
                </div>

                {/* GPS Dispatch Info */}
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span>พิกัด GPS ที่ส่งออก: {gpsCoordinates.lat}, {gpsCoordinates.lng} (ย่านสุขุมวิท/ทองหล่อ)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>แจ้งเตือนสถานีตำรวจนครบาลทองหล่อ / สน.พื้นที่เรียบร้อยแล้ว</span>
                  </div>
                </div>
              </div>

              {/* Action Advice Box */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>คำแนะนำทันทีเพื่อความปลอดภัย:</span>
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-400 text-[11px]">
                  <li>เดินไปในจุดที่มีผู้คนพลุกพล่าน เช่น เคาน์เตอร์ร้าน พนักงานร้าน หรือหน้า รปภ.</li>
                  <li>ไม่ต้องกลัวเรื่องเสียมารยาท คุณมีสิทธิ์ปฏิเสธการลวนลามได้ 100%</li>
                  <li>สายด่วนทีมเซฟตี้ Laysea กำลังติดต่อโทรเข้าหาคุณทันที</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPanicTriggered(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
                >
                  กลับไปหน้ารวม
                </button>
                <a
                  href="tel:191"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>โทรออก 191 ทันที</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Panic Button Section */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    ปุ่มกดฉุกเฉิน SOS สำหรับพาร์ทเนอร์และผู้ใช้งาน
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    กดเมื่อถูกคุกคาม ถูกลวนลาม บังคับ หรือรู้สึกไม่ปลอดภัยระหว่างการนัดหมาย
                  </p>
                </div>
              </div>

              {/* Threat Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ระบุเหตุการณ์ฉุกเฉินเบื้องต้น:
                </label>
                <select
                  value={customThreat}
                  onChange={(e) => setCustomThreat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ถูกลูกค้าพยายามแตะเนื้อต้องตัว ลวนลามในร้าน">ถูกลูกค้าพยายามแตะเนื้อต้องตัว / ลวนลามในร้าน</option>
                  <option value="ถูกชวนไปสถานที่ปิด หรือพยายามพาไปโรงแรม">ถูกชวนไปสถานที่ปิด / บังคับไปค้างคืน</option>
                  <option value="ถูกข่มขู่ คุกคามทางวาจา หรือทางกายภาพ">ถูกข่มขู่ คุกคามทางวาจา หรือทางกายภาพ</option>
                  <option value="ลูกค้ามีพฤติกรรมมึนเมา ไม่ปลอดภัย">ลูกค้ามีอาการมึนเมามาก คุมสติไม่อยู่</option>
                  <option value="ขอความช่วยเหลือฉุกเฉินทั่วไป">ขอความช่วยเหลือฉุกเฉินทั่วไป (SOS)</option>
                </select>
              </div>

              {/* Panic Trigger Button */}
              <button
                onClick={handlePanicClick}
                className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl text-sm font-extrabold shadow-xl shadow-red-950/80 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/50"
              >
                <Siren className="w-5 h-5 animate-bounce" />
                <span>กดส่งสัญญาณ SOS ฉุกเฉินทันที (Live GPS Police Dispatch)</span>
              </button>

              {/* Protocol summary */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>มาตรการปกป้องพาร์ทเนอร์ตามกฎเหล็กของ Laysea:</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ทันทีที่กดส่งสัญญาณ พิกัด GPS สดของคุณจะถูกยิงตรงไปยังทีมมอนิเตอร์ความปลอดภัย 24 ชม.
                  และเชื่อมโยงประสานงานสายตรวจในท้องที่โดยอัตโนมัติ โดยพาร์ทเนอร์สามารถยุติงานและออกจากพื้นที่ได้ทันที
                </p>
              </div>

              {/* Active Log / History */}
              {incidents.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">
                    ประวัติการแจ้งเตือน SOS ล่าสุด:
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {incidents.slice(0, 3).map((inc) => (
                      <div
                        key={inc.id}
                        className="p-2.5 bg-slate-950 rounded-xl border border-red-500/30 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-red-300">{inc.message}</div>
                          <div className="text-[10px] text-slate-500">
                            {inc.location} · {inc.timestamp}
                          </div>
                        </div>
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-medium">
                          {inc.status === 'dispatched' ? 'ส่งตำรวจแล้ว' : 'คลี่คลาย'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
