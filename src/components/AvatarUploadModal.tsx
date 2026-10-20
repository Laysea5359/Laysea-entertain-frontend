import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Check, User, Sparkles } from 'lucide-react';

interface AvatarUploadModalProps {
  currentAvatarUrl?: string;
  userRole: 'client' | 'partner';
  onClose: () => void;
  onSaveAvatar: (newUrl: string) => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  currentAvatarUrl,
  userRole,
  onClose,
  onSaveAvatar,
}) => {
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientPresets = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  ];

  const partnerPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onSaveAvatar(previewUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-white">
              เปลี่ยนรูปโปรไฟล์ ({userRole === 'client' ? 'ลูกค้า' : 'พาร์ทเนอร์'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-center">
          {/* Avatar Preview Circle */}
          <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-rose-500/40 bg-slate-950 shadow-xl group">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <User className="w-10 h-10" />
              </div>
            )}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white">รูปถ่ายโปรไฟล์ของคุณ</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {userRole === 'client'
                ? 'รูปโปรไฟล์ที่พาร์ทเนอร์จะเห็นเมื่อนัดพบ'
                : 'รูปโปรไฟล์หน้าตรงสำหรับยืนยันความตรงปก 100%'}
            </p>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-rose-400" />
            <span>เลือกรูปถ่ายจากมือถือ / คอมพิวเตอร์</span>
          </button>

          {/* Presets */}
          <div className="pt-2 border-t border-slate-800 space-y-2 text-left">
            <span className="text-[10px] text-slate-400 block font-medium">หรือเลือกรูปแนะนำ:</span>
            <div className="flex items-center justify-center gap-2.5">
              {(userRole === 'client' ? clientPresets : partnerPresets).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="Preset"
                  onClick={() => setPreviewUrl(url)}
                  className={`w-11 h-11 rounded-full object-cover cursor-pointer border-2 transition-all ${
                    previewUrl === url
                      ? 'border-rose-500 scale-105 shadow-md'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกรูปโปรไฟล์</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
