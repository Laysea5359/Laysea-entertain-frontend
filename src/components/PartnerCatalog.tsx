import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Video,
  Calendar,
  Star,
  MapPin,
  Sparkles,
  Filter,
  Check,
  Wine,
  Award,
  HeartHandshake,
} from 'lucide-react';
import { Partner, Gender, LgbtqSubtype } from '../types';

interface PartnerCatalogProps {
  partners: Partner[];
  onSelectVdoCall: (partner: Partner) => void;
  onSelectBook: (partner: Partner) => void;
  onOpenAiMatching: () => void;
}

export const PartnerCatalog: React.FC<PartnerCatalogProps> = ({
  partners,
  onSelectVdoCall,
  onSelectBook,
  onOpenAiMatching,
}) => {
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male' | 'lgbtq'>('all');
  const [selectedLgbtqSubtype, setSelectedLgbtqSubtype] = useState<'all' | LgbtqSubtype>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
const [activePhotoMap, setActivePhotoMap] = useState<Record<string, string>>({});
const [approvedPartners, setApprovedPartners] = useState<any[]>([]);

// State สำหรับเปิดดูอัลบั้มรูป 1-6 รูป
  const [galleryPartner, setGalleryPartner] = useState<Partner | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);

useEffect(() => {
  const fetchApprovedPartners = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${backendUrl}/api/admin/data`);
      const data = await res.json();
      if (data && Array.isArray(data.kycList)) {
        // คัดเลือกเฉพาะคนที่แอดมินอนุมัติแล้ว (approved)
        const approved = data.kycList
          .filter((k: any) => k.status === 'approved')
          .map((k: any) => ({
            id: k.id || `partner-${k.phone}`,
            name: k.fullName || k.name || 'พาร์ทเนอร์ใหม่',
            nickname: k.nickname || k.fullName?.split(' ')[0] || 'พาร์ทเนอร์',
            gender: k.gender || 'female',
            lgbtqSubtype: k.lgbtqSubtype || undefined,
            age: k.age || 25,
            height: k.height || 165,
            location: k.province || k.location || 'กรุงเทพฯ',
            imageUrl: k.avatarUrl || k.selfieUrl || k.photoFace || k.imageUrl || '',
              avatarUrl: k.avatarUrl || k.selfieUrl || k.photoFace || k.imageUrl || '',
              galleryImages: (k.galleryImages && k.galleryImages.length > 0)
                ? k.galleryImages
                : [k.avatarUrl || k.selfieUrl, k.fullBodyPhoto, k.idCardPhoto].filter(Boolean),
              hourlyRate: k.hourlyRate || 500,
              bio: k.bio || 'พาร์ทเนอร์ยืนยันตัวตนผ่านระบบเรียบร้อย (Verified Partner)',
              skills: k.skills || ['ดูแลในวงสังสรรค์', 'เพื่อนเที่ยวคาเฟ่/ชิล'],
              drinkingSkill: k.drinkingSkill || 'ดื่มเป็นเพื่อน',
              isVerified: true,
              rating: 5.0,
              reviewCount: 1,
              completedJobs: 0,
              badges: ['100% Verified', 'KYC เช็ค'],
          }));
        setApprovedPartners(approved);
      }
    } catch (err) {
      console.error('Failed to load approved partners:', err);
    }
  };

  fetchApprovedPartners();
}, []);

// รวมพาร์ทเนอร์เดิม 10 คน เข้ากับพาร์ทเนอร์ที่เพิ่งอนุมัติใหม่
const combinedPartners = [...partners, ...approvedPartners];

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'party_care', label: 'ดูแลในวงสังสรร' },
    { id: 'wedding', label: 'ไปงานแต่ง/งานสังคม' },
    { id: 'dinner', label: 'ดินเนอร์หรู/Fine Dining' },
    { id: 'party', label: 'ชงเหล้าเป็น/ปาร์ตี้' },
    { id: 'cafe', label: 'เพื่อนเที่ยวคาเฟ่/ชิล' },
    { id: 'fan', label: 'ฟีลแฟนน่ารัก' },
  ];

  const lgbtqSubtypes = [
    { id: 'all', label: 'ทั้งหมดใน LGBTQ+' },
    { id: 'trans_woman', label: '👠 ทรานส์วูแมน (Trans Woman)' },
    { id: 'tomboy', label: '🧢 ทอมเท่ (Tomboy)' },
    { id: 'gay', label: '✨ เกย์สายดูแล (Gay)' },
    { id: 'non_binary', label: '🎨 นอนไบนารี (Non-Binary)' },
  ];

  const filteredPartners = combinedPartners.filter((p) => {
    // 1. Gender filter
    if (selectedGender !== 'all' && p.gender !== selectedGender) return false;

    // 2. LGBTQ+ Subtype filter
    if (selectedGender === 'lgbtq' && selectedLgbtqSubtype !== 'all') {
      if (p.lgbtqSubtype !== selectedLgbtqSubtype) return false;
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q) || p.nickname.toLowerCase().includes(q);
      const matchSkill = p.skills.some((s) => s.toLowerCase().includes(q));
      const matchArea = p.areas.some((a) => a.toLowerCase().includes(q)) || p.location.toLowerCase().includes(q);
      const matchBio = p.bio.toLowerCase().includes(q);
      const matchTrait = p.specificTraits?.some((t) => t.toLowerCase().includes(q));
      const matchPresentation = p.stylePresentation?.toLowerCase().includes(q);
      const matchLgbtq = p.lgbtqIdentityLabel?.toLowerCase().includes(q);
      if (!matchName && !matchSkill && !matchArea && !matchBio && !matchTrait && !matchPresentation && !matchLgbtq) {
        return false;
      }
    }

    // 4. Category filter
    if (selectedCategory === 'party_care') {
      return (
        p.skills.some((s) => s.includes('สังสรร') || s.includes('ดูแล') || s.includes('ชง') || s.includes('ปาร์ตี้')) ||
        p.drinkingSkill.includes('ปาร์ตี้') ||
        p.drinkingSkill.includes('ดื่มเป็นเพื่อน')
      );
    }
    if (selectedCategory === 'wedding') {
      return p.skills.some((s) => s.includes('งานแต่ง') || s.includes('งานสังคม'));
    }
    if (selectedCategory === 'dinner') {
      return p.skills.some((s) => s.includes('ดินเนอร์') || s.includes('Fine Dining') || s.includes('กินข้าว'));
    }
    if (selectedCategory === 'party') {
      return p.drinkingSkill.includes('ปาร์ตี้') || p.skills.some((s) => s.includes('ชง') || s.includes('ปาร์ตี้'));
    }
    if (selectedCategory === 'cafe') {
      return p.skills.some((s) => s.includes('คาเฟ่') || s.includes('ถ่ายรูป') || s.includes('ช็อปปิ้ง'));
    }
    if (selectedCategory === 'fan') {
      return p.vibeTags.some((t) => t.includes('ฟีลแฟน') || t.includes('คุณหนู') || t.includes('น่ารัก'));
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search & Matching Kicker Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 p-5 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Smart Matching & 100% Verified Profiles</span>
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">
            เพื่อนเที่ยว เพื่อนกินข้าว ควงออกงานหรู (ฟีลแฟน)
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            สัมผัสประสบการณ์เพื่อนร่วมทางระดับพรีเมียม ปลอดภัย 100% รองรับทุกความหลากหลาย
            สุภาพสตรี, สุภาพบุรุษ และ **LGBTQ+** พร้อมระบุลักษณะเฉพาะตัว ตรวจสอบประวัติอาชญากรรม (KYC) ทุกคน
          </p>

          <div className="pt-1 flex flex-wrap gap-2.5">
            <button
              onClick={onOpenAiMatching}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ให้ AI ผู้จัดการช่วยจัดสเปคและจับคู่</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-rose-600/10 to-transparent pointer-events-none"></div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3.5 shadow-lg">
        {/* Gender Segmented Control: Female, Male, LGBTQ+, All */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>หมวดหมู่พาร์ทเนอร์ตามเพศ / อัตลักษณ์:</span>
            <span className="text-rose-400 font-normal">พบ {filteredPartners.length} คน</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedGender('all');
                setSelectedLgbtqSubtype('all');
              }}
              className={`py-2 px-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                selectedGender === 'all'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              พาร์ทเนอร์ทั้งหมด
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedGender('female');
                setSelectedLgbtqSubtype('all');
              }}
              className={`py-2 px-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                selectedGender === 'female'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              👩 สุภาพสตรี (Female)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedGender('male');
                setSelectedLgbtqSubtype('all');
              }}
              className={`py-2 px-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                selectedGender === 'male'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              👨 สุภาพบุรุษ (Male)
            </button>

            <button
              type="button"
              onClick={() => setSelectedGender('lgbtq')}
              className={`py-2 px-2 text-center rounded-lg font-medium transition-all cursor-pointer relative overflow-hidden ${
                selectedGender === 'lgbtq'
                  ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white shadow-md font-bold ring-1 ring-purple-400/50'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/30 border border-purple-500/20'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <span>🌈</span>
                <span>LGBTQ+</span>
              </span>
            </button>
          </div>
        </div>

        {/* Sub-filter: LGBTQ+ Specific Characteristics (ลักษณะเฉพาะ) */}
        {selectedGender === 'lgbtq' && (
          <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/30 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>เลือกลักษณะเฉพาะ LGBTQ+:</span>
              </span>
              <span className="text-[10px] text-purple-400">คัดกรองอัตลักษณ์ที่ตรงใจคุณ</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lgbtqSubtypes.map((sub) => {
                const isActive = selectedLgbtqSubtype === sub.id;
                return (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => setSelectedLgbtqSubtype(sub.id as 'all' | LgbtqSubtype)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-xs font-bold'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Box and Category Styles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, สกิล (ชงเหล้า, งานแต่ง, ทรานส์, ทอม, ถ่ายรูป), หรือย่าน..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Styles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-rose-400" /> รูปแบบงาน:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-100 text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Partners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((partner) => (
          <div
            key={partner.id}
            className={`group bg-slate-900 rounded-3xl border overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl ${
              partner.gender === 'lgbtq'
                ? 'border-purple-500/40 hover:border-purple-400/80 shadow-purple-950/20'
                : 'border-slate-800/80 hover:border-slate-700 hover:shadow-rose-950/20'
            }`}
          >
            {/* Image Container with Badges & Click to View Modal */}
          <div 
            onClick={() => {
              const targetImg = activePhotoMap[partner.id] || partner.imageUrl || partner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
              window.open(targetImg, '_blank');
            }}
            className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 cursor-pointer group/img"
            title="คลิกเพื่อเปิดดูรูปขนาดเต็ม"
          >
            <img
              src={
                (() => {
                  try {
                    const raw =
                      localStorage.getItem('laysea_partner_gallery') ||
                      localStorage.getItem(`gallery_${partner.phone}`) ||
                      localStorage.getItem(`gallery_${partner.id}`);
                    if (raw) {
                      const list = JSON.parse(raw);
                      if (Array.isArray(list) && list[0]) return list[0];
                    }
                  } catch (e) {}
                  return (
                    partner.imageUrl ||
                    partner.avatarUrl ||
                    (partner as any).selfieUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
                  );
                })()
              }
              alt={partner.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e: any) => {
                // ป้องกันรูปแตก หากลิงก์รูปเสียหรือว่างเปล่า ให้สลับใช้รูปสำรองทันที
                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
              }}
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-slate-950/80 text-white text-[11px] px-2.5 py-1 rounded-full border border-slate-700 backdrop-blur-sm">
                🔍 แตะดูรูปเต็ม
              </span>
            </div>
{/* ปุ่มกดดูอัลบั้มภาพ 1-6 รูป */}
            {(() => {
              const getRealPhotos = (): string[] => {
                if ((partner as any).galleryImages && (partner as any).galleryImages.length > 0) {
                  return (partner as any).galleryImages;
                }
                const possibleKeys = [
                  `gallery_${partner.phone}`,
                  `gallery_${partner.id}`,
                  'laysea_partner_gallery',
                  'partner_gallery_images',
                  'partner_photos'
                ];
                for (const k of possibleKeys) {
                  try {
                    const raw = localStorage.getItem(k);
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    }
                  } catch (e) {}
                }
                const singlePhoto = partner.imageUrl || partner.avatarUrl || (partner as any).selfieUrl;
                if (singlePhoto && !singlePhoto.includes('unsplash.com')) {
                  return [singlePhoto];
                }
                return [];
              };

              const partnerGallery = getRealPhotos();
              const photoCount = partnerGallery.length;

              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const photosToShow = partnerGallery.length > 0 
                      ? partnerGallery 
                      : [partner.imageUrl || partner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'];
                    setGalleryPartner({ ...partner, galleryImages: photosToShow } as any);
                    setActiveGalleryIndex(0);
                  }}
                  className="absolute bottom-2 right-2 z-10 px-2.5 py-1 bg-slate-900/85 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold border border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                >
                  <span>📸 ดูรูป ({photoCount > 0 ? photoCount : 1} รูป)</span>
                </button>
              );
            })()}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent"></div>

              {/* Online indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-200 border border-slate-800">
                <span
                  className={`w-2 h-2 rounded-full ${
                    partner.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                ></span>
                <span>{partner.isOnline ? 'พร้อมรับงาน' : 'รับงานตามนัด'}</span>
              </div>

              {/* LGBTQ+ Distinctive Badge (if applicable) */}
              {partner.gender === 'lgbtq' && (
                <div className="absolute top-10 left-3 flex items-center gap-1 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-rose-900/90 backdrop-blur-md border border-purple-400/50 text-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <span>🌈</span>
                  <span>{partner.lgbtqIdentityLabel || 'LGBTQ+'}</span>
                </div>
              )}

              {/* Verified KYC Criminal Check Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>KYC เช็คประวัติแล้ว</span>
              </div>

              {/* Partner Name & Location Overlay */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {partner.name} <span className="text-rose-400 text-sm font-normal">({partner.nickname})</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{partner.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-xs font-bold shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{partner.rating}</span>
                    <span className="text-[10px] text-slate-400">({partner.reviewsCount})</span>
                  </div>
                </div>
              </div>
            </div>

{/* แถบรูปภาพผลงาน 1-6 รูป สำหรับลูกค้ากดดู */}
          {(() => {
            const savedGallery = localStorage.getItem(`gallery_${partner.phone}`)
              ? JSON.parse(localStorage.getItem(`gallery_${partner.phone}`) || '[]')
              : (partner.gallery || [partner.imageUrl]);

            if (!savedGallery || savedGallery.length <= 1) return null;

            return (
              <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-slate-400 shrink-0 font-medium mr-1">📸 รูป:</span>
                {savedGallery.slice(0, 6).map((imgUrl: string, imgIdx: number) => {
                  const isCurrent = (activePhotoMap[partner.id] || partner.imageUrl) === imgUrl;
                  return (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoMap((prev) => ({ ...prev, [partner.id]: imgUrl }));
                      }}
                      className={`relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        isCurrent ? 'border-rose-500 scale-105 ring-2 ring-rose-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`รูปที่ ${imgIdx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            );
          })()}
            {/* Profile Content */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
              <div>
                {/* Style Presentation Callout */}
                {partner.stylePresentation && (
                  <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{partner.stylePresentation}</span>
                  </div>
                )}

                {/* Clean Metadata Line */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 flex-wrap">
                  <span>อายุ {partner.age} ปี</span>
                  <span aria-hidden="true">·</span>
                  <span>ส่วนสูง {partner.height} ซม.</span>
                  {partner.pronouns && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300">{partner.pronouns}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>สำเร็จ {partner.completedJobs} งาน</span>
                </div>

                {/* Bio text */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {partner.bio}
                </p>

                {/* Specific Traits Box (ลักษณะเฉพาะ) */}
                {partner.specificTraits && partner.specificTraits.length > 0 && (
                  <div className="mt-2.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" />
                      <span>ลักษณะเฉพาะโดดเด่น:</span>
                    </div>
                    <ul className="space-y-0.5 text-slate-300 text-[10.5px]">
                      {partner.specificTraits.slice(0, 3).map((trait, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-1">
                          <span className="text-rose-400 shrink-0">•</span>
                          <span className="truncate">{trait}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Specialties / Skills Tags */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {partner.skills.slice(0, 3).map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60"
                    >
                      {skill}
                    </span>
                  ))}
                  {partner.drinkingSkill.includes('ปาร์ตี้') && (
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Wine className="w-3 h-3" /> ชงเหล้าเป็น
                    </span>
                  )}
                </div>

                {/* Safety Guarantee Info */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> มีประกันอุบัติเหตุคุ้มครอง
                  </span>
                  <span className="text-slate-500">
                    ตรงปก 100% ไร้ฟิลเตอร์
                  </span>
                </div>
              </div>

              {/* Pricing & Call to Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-400">
                      อัตราค่าบริการเริ่มต้น:
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium">
                      ✨ 1-4 ชม. & เหมา 1 วัน ลดขั้นบันได
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-rose-400 font-['Plus_Jakarta_Sans']">
                      {partner.hourlyRate.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-300 ml-1">เครดิต / ชม.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* VDO Call Button */}
                  <button
                    onClick={() => onSelectVdoCall(partner)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600/20 to-rose-600/20 hover:from-amber-600/30 hover:to-rose-600/30 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>VDO Call ดูตัว ({partner.vdoCallRate} C)</span>
                  </button>

                  {/* Booking Button */}
                  <button
                    onClick={() => onSelectBook(partner)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-900/20 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>จองนัดหมาย</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm">ไม่พบพาร์ทเนอร์ตามเงื่อนไขที่เลือก</p>
          <button
            onClick={() => {
              setSelectedGender('all');
              setSelectedLgbtqSubtype('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}    
{/* ป๊อปอัปแสดงอัลบั้มรูป 1-6 รูป */}
      {galleryPartner && (
        <div 
          onClick={() => setGalleryPartner(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 relative flex flex-col"
          >
            {/* หัวข้อ Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>📸 อัลบั้มรูปของ {galleryPartner.name}</span>
                </h3>
                <span className="text-[10px] text-slate-400">
                  รูปที่ {activeGalleryIndex + 1} จาก {((galleryPartner as any).galleryImages || []).length} รูป
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGalleryPartner(null)}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* แสดงรูปภาพขนาดใหญ่ */}
            <div className="w-full h-72 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
              <img
                src={((galleryPartner as any).galleryImages || [])[activeGalleryIndex] || galleryPartner.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                alt={`Photo ${activeGalleryIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* แถบ Thumbnail รูปย่อย 1-6 รูป ด้านล่างสำหรับกดเปลี่ยนรูป */}
            {((galleryPartner as any).galleryImages || []).length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 justify-center">
                {((galleryPartner as any).galleryImages || []).map((imgUrl: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveGalleryIndex(idx)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activeGalleryIndex === idx 
                        ? 'border-rose-500 scale-105 shadow-md shadow-rose-950/50' 
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setGalleryPartner(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer mt-1"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
</div>
  );
};
