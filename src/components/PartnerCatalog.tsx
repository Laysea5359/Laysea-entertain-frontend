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
} from 'lucide-react';
import { Partner, LgbtqSubtype } from '../types';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../firebase';

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
    let isMounted = true;

    const mapAndSetPartners = (rawList: any[]) => {
      const formatted = rawList.map((d: any) => {
        const rawGallery = d.gallery || d.galleryImages || [];
        const photoList = Array.isArray(rawGallery) && rawGallery.length > 0 
          ? rawGallery 
          : (d.avatarUrl1 || d.avatar || d.imageUrl ? [d.avatarUrl1 || d.avatar || d.imageUrl] : []);

        const mainPhoto = photoList[0] || d.avatarUrl1 || d.avatar || d.imageUrl || '';

        return {
          id: d._id || d.id || d.phone,
          name: d.name || d.nickname || 'Laysea',
          nickname: d.nickname || d.name || 'Laysea',
          gender: d.gender || 'male',
          age: d.age || 28,
          height: d.height || 175,
          location: d.location || 'ชลบุรี / บางแสน',
          imageUrl: mainPhoto,
          avatarUrl: mainPhoto,
          gallery: photoList,
          galleryImages: photoList,
          hourlyRate: d.price || d.hourlyRate || 1500,
          bio: d.bio || 'พาร์ทเนอร์ยืนยันตัวตนเรียบร้อย (Verified Partner)',
          skills: d.services || d.skills || ['ดูแลในวงสังสรรค์', 'เพื่อนเที่ยวคาเฟ่/ชิล'],
          drinkingSkill: d.drinkingSkill || 'ดื่มเป็นเพื่อน',
          isVerified: true,
          rating: d.rating || 5.0,
          reviewCount: d.reviewsCount || 0,
          completedJobs: d.completedJobs || 0,
          badges: ['100% Verified', 'KYC เช็ค']
        };
      });

      if (isMounted && formatted.length > 0) {
        setApprovedPartners(formatted);
      }
    };

    // 1. ดึงข้อมูลสดจาก Firestore
    const db = getFirestore(app);
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const liveList: any[] = [];
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        if (d.role === 'partner' || d.userType === 'partner' || d.hourlyRate || d.price) {
          liveList.push({ id: doc.id, ...d });
        }
      });

      if (liveList.length > 0) {
        mapAndSetPartners(liveList);
      }
    }, (err) => {
      console.warn('Firestore live sync error:', err);
    });

    // 2. ดึงจาก Render Backend (MongoDB Atlas) ควบคู่
    fetch('https://laysea-entertain-backend-1.onrender.com/api/partners')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Backend route not ready');
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.partners || data.data || []);
        if (list.length > 0) {
          mapAndSetPartners(list);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // ใช้ข้อมูลพาร์ทเนอร์จริงจาก Cloud ถ้ายังไม่มีให้ใช้ partners จาก Props
  const combinedPartners = approvedPartners.length > 0 ? approvedPartners : partners;

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

  const filteredPartners = (combinedPartners || []).filter((p) => {
    // 1. ตรวจสอบเพศ
    if (selectedGender && selectedGender !== 'all') {
      const partnerGender = (p.gender || '').toLowerCase();
      if (partnerGender && partnerGender !== selectedGender.toLowerCase()) {
        return false;
      }
    }

    // 2. LGBTQ+ Subtype filter
    if (selectedGender === 'lgbtq' && selectedLgbtqSubtype && selectedLgbtqSubtype !== 'all') {
      if (p.lgbtqSubtype && p.lgbtqSubtype !== selectedLgbtqSubtype) {
        return false;
      }
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      const name = (p.name || '').toLowerCase();
      const nickname = (p.nickname || '').toLowerCase();
      const location = (p.location || '').toLowerCase();
      const bio = (p.bio || '').toLowerCase();
      const skillsMatch = Array.isArray(p.skills) && p.skills.some((s: string) => String(s).toLowerCase().includes(q));

      const isMatch = name.includes(q) || nickname.includes(q) || location.includes(q) || bio.includes(q) || skillsMatch;
      if (!isMatch) return false;
    }

    // 4. Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      const skills = Array.isArray(p.skills) ? p.skills : [];
      const drink = p.drinkingSkill || '';
      if (selectedCategory === 'party_care') {
        const matchParty = skills.some((s: string) => String(s).includes('สังสรรค์') || String(s).includes('ดูแล')) || drink !== '';
        if (!matchParty) return false;
      }
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

        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-rose-600/10 to-transparent pointer-events-none"></div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3.5 shadow-lg">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
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

        {/* Sub-filter: LGBTQ+ */}
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

        {/* Search Box */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, สกิล (ชงเหล้า, งานแต่ง, ทรานส์, ทอม, ถ่ายรูป), หรือย่าน..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-5