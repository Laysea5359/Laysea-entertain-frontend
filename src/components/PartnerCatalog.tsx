import React, { useState, useEffect, useMemo } from 'react';
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

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface PartnerCatalogProps {
  partners: Partner[];
  onSelectVdoCall: (partner: Partner) => void;
  onSelectBook: (partner: Partner) => void;
  onOpenAiMatching: () => void;
}

type CatalogPartner = Partner & Record<string, any>;
type GenderFilter = 'all' | 'female' | 'male' | 'lgbtq';

const API_URL: string =
  import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';

const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'party_care', label: 'ดูแลในวงสังสรรค์' },
  { id: 'wedding', label: 'ไปงานแต่ง/งานสังคม' },
  { id: 'dinner', label: 'ดินเนอร์หรู/Fine Dining' },
  { id: 'party', label: 'ชงเหล้าเป็น/ปาร์ตี้' },
  { id: 'cafe', label: 'เพื่อนเที่ยวคาเฟ่/ชิล' },
  { id: 'fan', label: 'ฟีลแฟนน่ารัก' },
];

// คำที่ใช้จับคู่ "สกิล" ของพาร์ทเนอร์กับหมวดหมู่งาน
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  party_care: ['สังสรรค์', 'ดูแล'],
  wedding: ['งานแต่ง', 'งานสังคม', 'งานเลี้ยง'],
  dinner: ['ดินเนอร์', 'fine dining', 'หรู'],
  party: ['ชงเหล้า', 'ปาร์ตี้'],
  cafe: ['คาเฟ่', 'ชิล'],
  fan: ['แฟน'],
};

const LGBTQ_SUBTYPES = [
  { id: 'all', label: 'ทั้งหมดใน LGBTQ+' },
  { id: 'trans_woman', label: '👠 ทรานส์วูแมน (Trans Woman)' },
  { id: 'tomboy', label: '🧢 ทอมเท่ (Tomboy)' },
  { id: 'gay', label: '✨ เกย์สายดูแล (Gay)' },
  { id: 'non_binary', label: '🎨 นอนไบนารี (Non-Binary)' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** คีย์สำหรับรวมข้อมูลพาร์ทเนอร์คนเดียวกันจากหลายแหล่ง (เบอร์โทรมาก่อน) */
const getPartnerKey = (d: any): string => {
  const phoneDigits = String(d?.phone || '').replace(/\D/g, '');
  return phoneDigits || String(d?._id || d?.id || '');
};

const getPhotos = (p: CatalogPartner): string[] => {
  const raw = p.gallery || p.galleryImages;
  if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean);
  const single = p.imageUrl || p.avatarUrl;
  return single ? [single] : [];
};

/**
 * แปลงข้อมูลดิบ (Firestore / Backend) เป็นรูปแบบที่ UI ใช้
 * ไม่เติมค่าสมมติ (อายุ, ราคา, เรตติ้ง, สถานะ Verified) เพราะจะทำให้ผู้ใช้เข้าใจผิด
 */
const normalizePartner = (d: any): CatalogPartner => {
  const rawGallery = d.gallery || d.galleryImages;
  const fallbackPhoto = d.avatarUrl1 || d.avatar || d.avatarUrl || d.imageUrl;
  const photoList: string[] =
    Array.isArray(rawGallery) && rawGallery.length > 0
      ? rawGallery.filter(Boolean)
      : fallbackPhoto
      ? [fallbackPhoto]
      : [];
  const mainPhoto = photoList[0] || '';

  const isVerified =
    d.isKycVerified === true || d.kycStatus === 'approved' || d.isVerified === true;

  return {
    ...d,
    id: getPartnerKey(d),
    name: d.name || d.nickname || 'Laysea',
    nickname: d.nickname || d.name || 'Laysea',
    gender: String(d.gender || '').toLowerCase(),
    lgbtqSubtype: d.lgbtqSubtype || d.subtype || undefined,
    age: toNumber(d.age),
    height: toNumber(d.height),
    location: d.location || '',
    imageUrl: mainPhoto,
    avatarUrl: mainPhoto,
    gallery: photoList,
    galleryImages: photoList,
    hourlyRate: toNumber(d.price ?? d.hourlyRate),
    bio: d.bio || '',
    skills: Array.isArray(d.services)
      ? d.services
      : Array.isArray(d.skills)
      ? d.skills
      : [],
    drinkingSkill: d.drinkingSkill || '',
    isVerified,
    rating: toNumber(d.rating),
    reviewCount: toNumber(d.reviewsCount ?? d.reviewCount),
    completedJobs: toNumber(d.completedJobs),
    badges: isVerified ? ['100% Verified', 'KYC เช็ค'] : [],
  } as CatalogPartner;
};

const matchesGender = (p: CatalogPartner, gender: GenderFilter, sub: 'all' | LgbtqSubtype) => {
  if (gender === 'all') return true;
  const g = String(p.gender || '').toLowerCase();
  if (gender === 'lgbtq') {
    if (!(g === 'lgbtq' || p.lgbtqSubtype)) return false;
    return sub === 'all' || p.lgbtqSubtype === sub;
  }
  return g === gender;
};

const matchesSearch = (p: CatalogPartner, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [p.name, p.nickname, p.location, p.bio].map((v) => String(v || '').toLowerCase());
  const skillsMatch =
    Array.isArray(p.skills) && p.skills.some((s: string) => String(s).toLowerCase().includes(q));
  return fields.some((f) => f.includes(q)) || skillsMatch;
};

const matchesCategory = (p: CatalogPartner, category: string) => {
  if (category === 'all') return true;
  const declared: string[] = Array.isArray(p.categories)
    ? p.categories
    : p.category
    ? [p.category]
    : [];
  if (declared.includes(category)) return true;

  const keywords = CATEGORY_KEYWORDS[category] || [];
  const skills: string[] = Array.isArray(p.skills) ? p.skills.map((s: any) => String(s).toLowerCase()) : [];
  return skills.some((s) => keywords.some((k) => s.includes(k.toLowerCase())));
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const PartnerCatalog: React.FC<PartnerCatalogProps> = ({
  partners,
  onSelectVdoCall,
  onSelectBook,
  onOpenAiMatching,
}) => {
  const [selectedGender, setSelectedGender] = useState<GenderFilter>('all');
  const [selectedLgbtqSubtype, setSelectedLgbtqSubtype] = useState<'all' | LgbtqSubtype>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePhotoMap, setActivePhotoMap] = useState<Record<string, string>>({});

  // แหล่งข้อมูลแยกกัน แล้วค่อยรวม เพื่อไม่ให้แหล่งหนึ่งเขียนทับอีกแหล่งหนึ่ง
  const [backendRaw, setBackendRaw] = useState<any[]>([]);
  const [usersRaw, setUsersRaw] = useState<any[]>([]);
  const [partnersRaw, setPartnersRaw] = useState<any[]>([]);

  // อัลบั้มรูป 1-6 รูป
  const [galleryPartner, setGalleryPartner] = useState<CatalogPartner | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const db = getFirestore(app);

    // 1. Firestore: คอลเลกชัน users
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!isMounted) return;
        const list: any[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.role === 'partner' || d.userType === 'partner' || d.hourlyRate || d.price) {
            list.push({ ...d, id: docSnap.id });
          }
        });
        setUsersRaw(list);
      },
      (err) => console.warn('Firestore users sync error:', err)
    );

    // 2. Firestore: คอลเลกชัน partners (ที่หน้า PartnerPortal เขียนอัลบั้มรูปลงไป)
    const unsubPartners = onSnapshot(
      collection(db, 'partners'),
      (snapshot) => {
        if (!isMounted) return;
        setPartnersRaw(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
      },
      (err) => console.warn('Firestore partners sync error:', err)
    );

    // 3. Render Backend (MongoDB Atlas)
    fetch(`${API_URL}/api/partners`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Backend route not ready');
      })
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data.partners || data.data || [];
        setBackendRaw(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') console.warn('Backend partners fetch error:', err);
      });

    return () => {
      isMounted = false;
      controller.abort();
      unsubUsers();
      unsubPartners();
    };
  }, []);

  // รวมข้อมูลพาร์ทเนอร์คนเดียวกัน (backend < users < partners = ใหม่สุดชนะ)
  const livePartners = useMemo<CatalogPartner[]>(() => {
    const merged = new Map<string, any>();
    [backendRaw, usersRaw, partnersRaw].forEach((source) => {
      source.forEach((d) => {
        const key = getPartnerKey(d);
        if (!key) return;
        merged.set(key, { ...(merged.get(key) || {}), ...d });
      });
    });
    return Array.from(merged.values()).map(normalizePartner);
  }, [backendRaw, usersRaw, partnersRaw]);

  // ใช้ข้อมูลจริงจาก Cloud ถ้ายังไม่มีให้ใช้ partners จาก Props
  const combinedPartners: CatalogPartner[] =
    livePartners.length > 0 ? livePartners : (partners as CatalogPartner[]) || [];

  const filteredPartners = combinedPartners.filter(
    (p) =>
      matchesGender(p, selectedGender, selectedLgbtqSubtype) &&
      matchesSearch(p, searchQuery) &&
      matchesCategory(p, selectedCategory)
  );

  /* ---------- Gallery modal ---------- */
  const galleryPhotos = galleryPartner ? getPhotos(galleryPartner) : [];

  const openGallery = (p: CatalogPartner, startIndex = 0) => {
    setGalleryPartner(p);
    setActiveGalleryIndex(startIndex);
  };
  const closeGallery = () => setGalleryPartner(null);
  const stepGallery = (delta: number) => {
    if (galleryPhotos.length === 0) return;
    setActiveGalleryIndex((i) => (i + delta + galleryPhotos.length) % galleryPhotos.length);
  };

  useEffect(() => {
    if (!galleryPartner) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryPartner(null);
      if (e.key === 'ArrowRight') stepGalleryRef.current(1);
      if (e.key === 'ArrowLeft') stepGalleryRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryPartner]);

  // ให้ key handler เรียกเวอร์ชันล่าสุดของ stepGallery เสมอ
  const stepGalleryRef = React.useRef(stepGallery);
  stepGalleryRef.current = stepGallery;

  const genderButtonClass = (active: boolean) =>
    `py-2 px-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
      active
        ? 'bg-rose-600 text-white shadow-xs font-bold'
        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
    }`;

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

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
            สุภาพสตรี, สุภาพบุรุษ และ <strong className="text-white">LGBTQ+</strong>{' '}
            พร้อมระบุลักษณะเฉพาะตัว ตรวจสอบประวัติอาชญากรรม (KYC) ทุกคน
          </p>

          <div className="pt-1 flex flex-wrap gap-2.5">
            <button
              type="button"
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
              className={genderButtonClass(selectedGender === 'all')}
            >
              พาร์ทเนอร์ทั้งหมด
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedGender('female');
                setSelectedLgbtqSubtype('all');
              }}
              className={genderButtonClass(selectedGender === 'female')}
            >
              👩 สุภาพสตรี (Female)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedGender('male');
                setSelectedLgbtqSubtype('all');
              }}
              className={genderButtonClass(selectedGender === 'male')}
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
          <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>เลือกลักษณะเฉพาะ LGBTQ+:</span>
              </span>
              <span className="text-[10px] text-purple-400">คัดกรองอัตลักษณ์ที่ตรงใจคุณ</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LGBTQ_SUBTYPES.map((sub) => {
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
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, สกิล (ชงเหล้า, งานแต่ง, ทรานส์, ทอม, ถ่ายรูป), หรือย่าน..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* แถบเลือกรูปแบบงาน */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-rose-400" /> รูปแบบงาน:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              type="button"
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

      {/* Partner Grid */}
      {filteredPartners.length === 0 ? (
        <div className="p-10 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">ไม่พบพาร์ทเนอร์ที่ตรงกับเงื่อนไข</p>
          <p className="text-[11px] text-slate-500">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((p) => {
            const photos = getPhotos(p);
            const currentPhoto = activePhotoMap[p.id] || photos[0] || '';
            const skills: string[] = Array.isArray(p.skills) ? p.skills : [];
            const hasRate = toNumber(p.hourlyRate) > 0;
            const hasReviews = toNumber(p.reviewCount) > 0 && toNumber(p.rating) > 0;

            return (
              <div
                key={p.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md flex flex-col"
              >
                {/* Photo */}
                <div className="relative aspect-[4/5] bg-slate-950">
                  {currentPhoto ? (
                    <button
                      type="button"
                      onClick={() => openGallery(p, Math.max(photos.indexOf(currentPhoto), 0))}
                      className="w-full h-full cursor-pointer"
                    >
                      <img
                        src={currentPhoto}
                        alt={p.nickname || p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                      ยังไม่มีรูปภาพ
                    </div>
                  )}

                  {p.isVerified && (
                    <span className="absolute top-2 left-2 text-[10px] bg-emerald-500/90 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => openGallery(p, 0)}
                      className="absolute bottom-2 right-2 text-[10px] bg-slate-950/80 text-white px-2 py-1 rounded-lg cursor-pointer"
                    >
                      📸 ดูอัลบั้ม ({photos.length})
                    </button>
                  )}
                </div>

                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex gap-1.5 p-2 overflow-x-auto bg-slate-950/60">
                    {photos.map((img, idx) => (
                      <button
                        type="button"
                        key={`${img}-${idx}`}
                        onClick={() => setActivePhotoMap((prev) => ({ ...prev, [p.id]: img }))}
                        className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer ${
                          currentPhoto === img ? 'border-rose-500' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm">{p.nickname || p.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {[
                          toNumber(p.age) > 0 ? `${p.age} ปี` : '',
                          toNumber(p.height) > 0 ? `${p.height} ซม.` : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                    <div className="text-right text-[11px] shrink-0">
                      {hasReviews ? (
                        <div className="flex items-center gap-1 text-amber-300 font-bold">
                          <Star className="w-3 h-3 fill-amber-300" />
                          <span>{toNumber(p.rating).toFixed(2)}</span>
                          <span className="text-slate-500 font-normal">({p.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">ยังไม่มีรีวิว</span>
                      )}
                      {toNumber(p.completedJobs) > 0 && (
                        <div className="flex items-center justify-end gap-1 text-slate-400 mt-0.5">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{p.completedJobs} งาน</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {p.location && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  )}

                  {p.bio && <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">{p.bio}</p>}

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 4).map((s, idx) => (
                        <span
                          key={`${s}-${idx}`}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.drinkingSkill && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Wine className="w-3 h-3 text-rose-400" />
                      <span>{p.drinkingSkill}</span>
                    </div>
                  )}

                  {Array.isArray(p.badges) && p.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.badges.map((b: string) => (
                        <span
                          key={b}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5"
                        >
                          <Check className="w-2.5 h-2.5" /> {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-xs text-slate-400">
                      {hasRate ? (
                        <>
                          เริ่มต้น{' '}
                          <span className="text-amber-300 font-bold text-sm">
                            {toNumber(p.hourlyRate).toLocaleString('th-TH')} ฿
                          </span>{' '}
                          / ชม.
                        </>
                      ) : (
                        <span className="text-slate-500">ติดต่อสอบถามราคา</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectVdoCall(p)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-rose-400" />
                        <span>VDO Call</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectBook(p)}
                        disabled={!hasRate}
                        title={hasRate ? undefined : 'พาร์ทเนอร์ยังไม่ได้ระบุราคา'}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>จองเลย</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gallery Modal */}
      {galleryPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          onClick={closeGallery}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                อัลบั้มของ {galleryPartner.nickname || galleryPartner.name}
              </h3>
              <button
                type="button"
                onClick={closeGallery}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>

            {galleryPhotos.length === 0 ? (
              <div className="aspect-square flex items-center justify-center text-xs text-slate-500 bg-slate-950 rounded-2xl">
                ยังไม่มีรูปภาพ
              </div>
            ) : (
              <>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950">
                  <img
                    src={galleryPhotos[Math.min(activeGalleryIndex, galleryPhotos.length - 1)]}
                    alt={`รูปที่ ${activeGalleryIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {galleryPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => stepGallery(-1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 text-white cursor-pointer"
                        aria-label="รูปก่อนหน้า"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => stepGallery(1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 text-white cursor-pointer"
                        aria-label="รูปถัดไป"
                      >
                        ›
                      </button>
                    </>
                  )}
                  <span className="absolute bottom-2 right-2 text-[10px] bg-slate-950/80 text-white px-2 py-0.5 rounded-full">
                    {Math.min(activeGalleryIndex, galleryPhotos.length - 1) + 1} / {galleryPhotos.length}
                  </span>
                </div>

                {galleryPhotos.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto">
                    {galleryPhotos.map((img, idx) => (
                      <button
                        type="button"
                        key={`${img}-${idx}`}
                        onClick={() => setActiveGalleryIndex(idx)}
                        className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer ${
                          idx === activeGalleryIndex ? 'border-rose-500' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
