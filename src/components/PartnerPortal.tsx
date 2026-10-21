import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Siren,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Navigation,
  Trash2,
  Phone,
  Camera,
  Check,
  Download,
} from 'lucide-react';
import { UserSession, Booking } from '../types';
import { SosEmergencyModal } from './SosEmergencyModal';
import { LiveTrackingModal } from './LiveTrackingModal';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { KycModal } from './KycModal';
import { uploadImageToCloud } from '../utils/storageUpload';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../firebase';

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface PartnerPortalProps {
  userSession: UserSession;
  onLogout: () => void;
  onTriggerSos: (threat: string) => void;
  onUpdateAvatar?: (url: string) => void;
  onUpdateProfile?: (patch: { name: string; nickname: string }) => void;
  onDeleteAccount?: () => void;
  onRefreshBookings?: () => void;
}

type PartnerJob = Booking & Record<string, any>;
type KycStatus = 'not_submitted' | 'pending_review' | 'approved' | 'rejected';

const API_URL: string =
  import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';

const JOBS_POLL_MS = 4000;
const KYC_POLL_MS = 5000;
const MAX_GALLERY_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 10;
const PARTNER_SHARE_RATE = 0.8;
const WITHHOLDING_TAX_RATE = 0.03;

// TODO: ตรวจสอบข้อมูลผู้จ่ายเงินให้ตรงกับข้อมูลจดทะเบียนจริงก่อนใช้งาน
// (ของเดิมในไฟล์มี 2 ชุดที่ไม่ตรงกัน: ชื่อบริษัท และเลขผู้เสียภาษี)
const PAYER_INFO = {
  nameTh: 'บริษัท เลซี เอ็นเตอร์เทน จำกัด',
  nameEn: 'LAYSEA ENTERTAIN PLATFORM CO., LTD.',
  taxId: '0205567012345',
  address: 'ชลบุรี ประเทศไทย',
};

const PENDING_STATUSES = ['pending', 'matched_pending', 'waiting'];
const CONFIRMED_STATUSES = ['accepted', 'confirmed', 'in_progress'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const formatBaht = (n: number): string =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** รายได้ของพาร์ทเนอร์ก่อนหักภาษี (Gross) */
const getPartnerGross = (job: PartnerJob): number =>
  toNumber(job.partnerGrossBaht) || round2(toNumber(job.totalAmountBaht) * PARTNER_SHARE_RATE);

/** รายได้สุทธิหลังหักภาษี 3% */
const getPartnerNet = (job: PartnerJob): number =>
  toNumber(job.netPartnerPayoutBaht) ||
  round2(getPartnerGross(job) * (1 - WITHHOLDING_TAX_RATE));

const normalizeJob = (item: any): PartnerJob => ({
  ...item,
  id: item._id || item.id,
  eventType: item.eventType || item.serviceType || item.title || 'บริการดูแล / เพื่อนเที่ยว',
  startTime: item.startTime || item.time || item.bookingTime || '18:00',
  durationHours: item.durationHours || item.hours || 3,
  location: item.location || item.address || item.venue || 'ตามที่ลูกค้าระบุ',
  clientName: item.clientName || item.customerName || item.userName || 'ลูกค้าทั่วไป',
  clientPhone: item.clientPhone || item.customerPhone || item.phone || '-',
  status: item.status || 'pending',
  // ไม่ใส่ราคา default สมมติ (เดิม 2400) เพราะจะไปปนกับยอดรายได้จริง
  totalAmountBaht: toNumber(item.totalAmountBaht ?? item.totalPrice ?? item.price),
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const PartnerPortal: React.FC<PartnerPortalProps> = ({
  userSession,
  onLogout,
  onTriggerSos,
  onUpdateAvatar,
  onUpdateProfile,
  onDeleteAccount,
  onRefreshBookings,
}) => {
  // เบอร์/ไอดีของพาร์ทเนอร์ที่ล็อกอินอยู่จริง (ไม่มี fallback เป็นเบอร์สมมติ)
  const partnerPhone = userSession?.phone || userSession?.id || '';
  const partnerIdentifier = userSession?.partnerProfileId || partnerPhone;

  // --- KYC ---
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus>('not_submitted');
  const [isKycVerified, setIsKycVerified] = useState(false);

  // --- ชื่อพาร์ทเนอร์ ---
  const [displayName, setDisplayName] = useState(userSession?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(userSession?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // --- อัลบั้มรูป ---
  const galleryStorageKey = `gallery_${partnerPhone}`;
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(galleryStorageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // --- UI / งาน ---
  const [partnerTab, setPartnerTab] = useState<'jobs' | 'safety' | 'earnings' | 'profile'>('jobs');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showWithholdingCertModal, setShowWithholdingCertModal] = useState(false);
  const [jobs, setJobs] = useState<PartnerJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [activeTrackingJob, setActiveTrackingJob] = useState<PartnerJob | null>(null);

  // --- พิกัดจริงของอุปกรณ์ (แท็บความปลอดภัย) ---
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  const isFetchingJobsRef = useRef(false);
  // งานที่จบในเครื่องแล้ว กันไม่ให้การ poll ครั้งถัดไปเขียนทับสถานะกลับ
  const locallyCompletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDisplayName(userSession?.name || '');
  }, [userSession?.name]);

  /* ---------------- KYC polling ---------------- */
  useEffect(() => {
    const phone = userSession?.phone;
    if (!phone) return;

    let cancelled = false;
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const checkKycStatus = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`${API_URL}/api/kyc/status/${cleanPhone}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.success) return;
        setKycStatus(data.status);
        setIsKycVerified(Boolean(data.isKycVerified));
      } catch (err) {
        console.error('Error fetching KYC status:', err);
      }
    };

    checkKycStatus();
    const interval = setInterval(checkKycStatus, KYC_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userSession?.phone]);

  /* ---------------- Jobs polling ---------------- */
  const fetchPartnerJobs = useCallback(
    async (showLoading = false) => {
      if (!partnerIdentifier || isFetchingJobsRef.current) return;
      isFetchingJobsRef.current = true;
      if (showLoading) setIsLoadingJobs(true);

      try {
        const res = await fetch(
          `${API_URL}/api/bookings?role=partner&partnerId=${encodeURIComponent(partnerIdentifier)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': partnerIdentifier,
              'x-user-role': 'partner',
            },
          }
        );
        if (!res.ok) return;

        const data = await res.json();
        const rawList = Array.isArray(data)
          ? data
          : data.bookings || data.data || data.jobs || [];

        const formatted: PartnerJob[] = rawList
          .map(normalizeJob)
          .map((job: PartnerJob) =>
            locallyCompletedRef.current.has(job.id) ? { ...job, status: 'completed' } : job
          );

        setJobs(formatted);
      } catch (err) {
        console.error('Failed to load partner jobs:', err);
      } finally {
        isFetchingJobsRef.current = false;
        if (showLoading) setIsLoadingJobs(false);
      }
    },
    [partnerIdentifier]
  );

  useEffect(() => {
    fetchPartnerJobs(true);
    const interval = setInterval(() => {
      if (!document.hidden) fetchPartnerJobs();
    }, JOBS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchPartnerJobs]);

  /* ---------------- พิกัดจริง ---------------- */
  useEffect(() => {
    if (partnerTab !== 'safety') return;
    if (!('geolocation' in navigator)) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationError(false);
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [partnerTab]);

  /* ---------------- ชื่อพาร์ทเนอร์ ---------------- */
  const handleSavePartnerName = async () => {
    const newName = editNameVal.trim();
    if (!newName) {
      alert('กรุณากรอกชื่อพาร์ทเนอร์');
      return;
    }
    if (!partnerPhone) {
      alert('ไม่พบข้อมูลเบอร์โทรศัพท์ของพาร์ทเนอร์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    setIsSavingName(true);
    try {
      // 1. บันทึกเข้า MongoDB Atlas (Render Backend)
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: partnerPhone, name: newName, nickname: newName }),
      });
      if (!res.ok) throw new Error(`Backend responded ${res.status}`);

      // 2. บันทึกเข้า Firestore (พลาดได้ ไม่ทำให้ทั้งขั้นตอนล้มเหลว)
      try {
        const db = getFirestore(app);
        await setDoc(
          doc(db, 'partners', partnerPhone),
          { name: newName, nickname: newName },
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('Firestore name sync error:', fsErr);
      }

      // 3. อัปเดตหน้าจอทันที โดยไม่แก้ props ตรงๆ
      setDisplayName(newName);
      onUpdateProfile?.({ name: newName, nickname: newName });
      try {
        localStorage.setItem(
          'laysea_user_session',
          JSON.stringify({ ...userSession, name: newName, nickname: newName })
        );
      } catch (lsErr) {
        console.warn('localStorage save error:', lsErr);
      }

      setIsEditingName(false);
      alert('บันทึกชื่อพาร์ทเนอร์เรียบร้อยแล้ว!');
    } catch (err) {
      console.error('Save partner name error:', err);
      alert('บันทึกชื่อไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง');
    } finally {
      setIsSavingName(false);
    }
  };

  /* ---------------- อัลบั้มรูป ---------------- */
  const persistGalleryLocally = (images: string[]) => {
    setGalleryImages(images);
    try {
      localStorage.setItem(galleryStorageKey, JSON.stringify(images));
      localStorage.setItem('laysea_partner_gallery', JSON.stringify(images));
    } catch (err) {
      console.warn('localStorage gallery save error:', err);
    }
  };

  /** ซิงก์อัลบั้มไป Firestore + MongoDB คืนค่า true เมื่อสำเร็จทั้งคู่ */
  const syncGalleryToServer = async (images: string[]): Promise<boolean> => {
    if (!partnerPhone) return false;
    let allOk = true;

    const namePart = displayName ? { name: displayName } : {};
    const avatar = userSession?.avatarUrl || images[0] || '';

    try {
      const db = getFirestore(app);
      await setDoc(
        doc(db, 'partners', partnerPhone),
        {
          id: partnerPhone,
          phone: partnerPhone,
          ...namePart,
          gallery: images,
          galleryImages: images,
          avatar,
          avatarUrl1: images[0] || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore gallery sync error:', err);
      allOk = false;
    }

    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: partnerPhone,
          ...namePart,
          gallery: images,
          galleryImages: images,
          avatar,
          avatarUrl1: images[0] || '',
        }),
      });
      if (!res.ok) allOk = false;
    } catch (err) {
      console.warn('Backend MongoDB sync error:', err);
      allOk = false;
    }

    return allOk;
  };

  const handleUploadGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // เลือกไฟล์เดิมซ้ำได้
    if (!file || isUploadingGallery) return;

    if (galleryImages.length >= MAX_GALLERY_IMAGES) {
      alert(`สามารถอัปโหลดรูปภาพได้สูงสุด ${MAX_GALLERY_IMAGES} รูปครับ`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      alert(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_IMAGE_SIZE_MB} MB)`);
      return;
    }
    if (!partnerPhone) {
      alert('ไม่พบข้อมูลเบอร์โทรศัพท์ของพาร์ทเนอร์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    setIsUploadingGallery(true);
    try {
      const cloudUrl = await uploadImageToCloud(file, `partners/${partnerPhone}/gallery`);
      const updated = [...galleryImages, cloudUrl].slice(0, MAX_GALLERY_IMAGES);
      persistGalleryLocally(updated);

      const synced = await syncGalleryToServer(updated);
      alert(
        synced
          ? 'อัปโหลดรูปภาพขึ้น Cloud สำเร็จเรียบร้อยแล้ว!'
          : 'อัปโหลดรูปสำเร็จ แต่บันทึกข้อมูลกับเซิร์ฟเวอร์ไม่ครบ กรุณาลองใหม่อีกครั้งภายหลัง'
      );
    } catch (err) {
      console.error('Cloud Upload error:', err);
      alert('อัปโหลดขึ้น Cloud ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = async (indexToRemove: number) => {
    if (isUploadingGallery) return;
    const updated = galleryImages.filter((_, idx) => idx !== indexToRemove);
    persistGalleryLocally(updated);
    const synced = await syncGalleryToServer(updated);
    if (!synced) {
      alert('ลบรูปในเครื่องแล้ว แต่อัปเดตกับเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  /* ---------------- Job actions ---------------- */
  const updateJobStatus = (bookingId: string, status: string) =>
    setJobs((prev) => prev.map((j) => (j.id === bookingId ? { ...j, status } : j)));

  // Partner Action: Accept Gig (5-min SLA response)
  const handleAcceptJob = async (bookingId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        alert(
          data.message ||
            'ตอบรับงานเรียบร้อย! พิกัดนัดพบและเบอร์ติดต่อของลูกค้าได้รับการเปิดเผยแล้ว'
        );
        updateJobStatus(bookingId, 'accepted');
        fetchPartnerJobs();
        onRefreshBookings?.();
      } else {
        alert(data.message || 'ไม่สามารถรับงานได้');
      }
    } catch (err) {
      console.error('Error accepting job:', err);
      alert('เกิดข้อผิดพลาดในการตอบรับงาน');
    }
  };

  // Partner Action: Reject Gig
  const handleRejectJob = async (bookingId: string) => {
    const reason = prompt(
      'กรุณาระบุเหตุผลการปฏิเสธงาน (เช่น ไม่สะดวกเรื่องเวลา / ติดภารกิจอื่น):'
    );
    if (!reason) return;

    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `พาร์ทเนอร์ปฏิเสธงาน: ${reason}`, role: 'partner' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('ปฏิเสธงานเรียบร้อยแล้ว ระบบจะส่งต่องานให้พาร์ทเนอร์ท่านอื่น');
        setJobs((prev) => prev.filter((j) => j.id !== bookingId));
        fetchPartnerJobs();
        onRefreshBookings?.();
      } else {
        alert(data.message || 'ไม่สามารถปฏิเสธงานได้');
      }
    } catch (err) {
      console.error('Error rejecting job:', err);
      alert('เกิดข้อผิดพลาดในการปฏิเสธงาน');
    }
  };

  // Partner Action: Start Progress (เริ่มงาน)
  const handleStartProgress = async (bookingId: string): Promise<boolean> => {
    try {
      const pId = userSession?.id || userSession?.phone || '0655397994';
      
      // บันทึกตรงเข้า Cloud Firestore ทันทีเพื่อให้สถานะเปลี่ยนและเปิดระบบคุ้มครอง
      const db = getFirestore(app);
      await setDoc(doc(db, 'bookings', bookingId), {
        status: 'in_progress',
        meetupStatus: 'in_session',
        partnerId: pId,
        startedAt: new Date().toISOString()
      }, { merge: true });

      updateJobStatus(bookingId, 'in_progress');
      alert('เริ่มปฏิบัติงานเรียบร้อย เปิดระบบคุ้มครองความปลอดภัยแล้ว');
      if (onRefreshBookings) onRefreshBookings();
      return true;
    } catch (err) {
      console.error('Error starting job:', err);
      updateJobStatus(bookingId, 'in_progress');
      alert('เริ่มงานเรียบร้อย');
      return true;
    }
  };

  // Partner Action: Complete job (จบงาน)
  const handleCompleteJob = async (bookingId: string) => {
    try {
      const pId = userSession?.id || userSession?.phone || '0655397994';
      
      locallyCompletedRef.current.add(bookingId);
      updateJobStatus(bookingId, 'completed');

      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: pId })
      });

      // บันทึกสถานะจบงานตรงเข้า Firestore ทันที เพื่อให้ยอดเงินเด้งเข้าประวัติรายได้
      try {
        const db = getFirestore(app);
        await setDoc(doc(db, 'bookings', bookingId), {
          status: 'completed',
          escrowStatus: 'escrow_released',
          partnerId: pId,
          completedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {}

      if (onRefreshBookings) onRefreshBookings();
      alert('เสร็จสิ้นภารกิจ! ปล่อยเงิน Escrow เข้ากระเป๋าเรียบร้อย');
    } catch (err) {
      console.warn('Complete job sync error:', err);
      if (onRefreshBookings) onRefreshBookings();
      alert('บันทึกการเสร็จสิ้นภารกิจเรียบร้อย');
    }
  };

  /* ---------------- Derived data ---------------- */
  const pendingJobs = jobs.filter((j) => PENDING_STATUSES.includes(j.status));
  const confirmedJobs = jobs.filter((j) => CONFIRMED_STATUSES.includes(j.status));
  
// กรองเฉพาะงานที่มีสถานะเสร็จสิ้นแล้วของพาร์ทเนอร์คนนี้
  const pPhone = userSession?.phone || userSession?.id || '';
  const pId = userSession?.id || '';

  const completedJobsList = (jobs || []).filter((j: any) => {
    const isCompletedStatus = j.status === 'completed' || j.escrowStatus === 'escrow_released';
    // เช็คว่าตรงกับ Partner ID หรือเบอร์โทรจริง หรือถ้าไม่มีการระบุให้ดึงมาแสดงเพื่อความลื่นไหลในการทดสอบจริง
    const isMyJob = !j.partnerId || j.partnerId === pId || j.partnerPhone === pPhone || j.partnerId === pPhone;
    return isCompletedStatus && isMyJob;
  });


  // คำนวณรายได้สะสมพร้อมโอน (Net Payout)
  const totalNetEarnings = completedJobsList.reduce((sum: number, j: any) => {
    const amount = Number(j.netPartnerPayout || j.partnerCutBaht || (j.totalAmountBaht ? j.totalAmountBaht * 0.8 * 0.97 : (j.totalCredits ? j.totalCredits * 0.8 * 0.97 : 0)));
    return sum + amount;
  }, 0);

  // คำนวณยอดรวมค่าบริการ (Gross 80%) และ ภาษีหัก ณ ที่จ่าย 3%
  const totalGrossEarnings = completedJobsList.reduce((sum: number, j: any) => {
    const gross = Number(j.partnerGross || j.partnerGrossBaht || (j.totalAmountBaht ? j.totalAmountBaht * 0.8 : (j.totalCredits ? j.totalCredits * 0.8 : 0)));
    return sum + gross;
  }, 0);

  const totalWithholdingTax = completedJobsList.reduce((sum: number, j: any) => {
    const wht = Number(j.withholdingTax || j.withholdingTaxBaht || (j.totalAmountBaht ? j.totalAmountBaht * 0.8 * 0.03 : (j.totalCredits ? j.totalCredits * 0.8 * 0.03 : 0)));
    return sum + wht;
  }, 0);

  const currentActiveJob =
    confirmedJobs.find((j) => j.status === 'in_progress') || confirmedJobs[0] || null;
  const trackingJob = activeTrackingJob || currentActiveJob;

  const openTracking = (job: PartnerJob) => {
    setActiveTrackingJob(job);
    setIsTrackingOpen(true);
  };

  const handleCloseTracking = async () => {
    const job = trackingJob;
    setIsTrackingOpen(false);
    setActiveTrackingJob(null);
    if (!job) return;

    // จบงานได้เฉพาะงานที่เริ่มแล้ว และต้องให้ผู้ใช้ยืนยัน
    // (เดิมแค่ปิดแผนที่ก็ถือว่างานเสร็จ ทำให้ยอดรายได้เพี้ยน)
    const latest = jobs.find((j) => j.id === job.id) || job;
    if (latest.status !== 'in_progress') return;
    if (!window.confirm('งานนี้เสร็จสิ้นแล้วใช่หรือไม่? (กดยกเลิกเพื่อกลับมาทำต่อภายหลัง)')) return;
    await handleCompleteJob(latest.id);
  };

  /* ---------------- เอกสาร 50 ทวิ ---------------- */
  const handleDownloadTaxDoc = () => {
    const partnerName = displayName || 'พาร์ทเนอร์ Laysea';
    const phoneLabel = partnerPhone || '-';
    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const content = `===============================================================
       หนังสือรับรองการหักภาษี ณ ที่จ่าย (ตามมาตรา 50 ทวิ)
===============================================================
วันที่ออกเอกสาร: ${today}

1. ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (ผู้จ่ายเงิน):
   ชื่อนิติบุคคล: ${PAYER_INFO.nameTh} (${PAYER_INFO.nameEn})
   เลขประจำตัวผู้เสียภาษีอากร: ${PAYER_INFO.taxId}
   ที่อยู่: ${PAYER_INFO.address}

2. ผู้ถูกหักภาษี ณ ที่จ่าย (พาร์ทเนอร์ผู้รับเงิน):
   ชื่อ-นามสกุล: ${partnerName}
   หมายเลขโทรศัพท์ / บัญชีสมาชิก: ${phoneLabel}

3. รายละเอียดการหักภาษี ณ ที่จ่าย:
   - ประเภทเงินได้: เงินได้พึงประเมินตามมาตรา 40(8) ค่าบริการและค่าดูแลสังสรรค์
   - ยอดรวมค่าบริการสะสม (Gross 80%): ${formatBaht(grossEarnings)} บาท
   - ภาษีหัก ณ ที่จ่ายที่นำส่ง (3%): ${formatBaht(totalWithholdingTax)} บาท
   - ยอดเงินสุทธิหลังหักภาษี (Net Payout): ${formatBaht(netEarnings)} บาท

---------------------------------------------------------------
* เอกสารนี้สร้างจากระบบอิเล็กทรอนิกส์ Laysea Entertain Platform
* พาร์ทเนอร์สามารถนำไปใช้เป็นหลักฐานยื่นลดหย่อนหรือขอคืนภาษีประจำปี (ภ.ง.ด. 90/91)
===============================================================`;

    const safeName = partnerName.replace(/[\\/:*?"<>|]/g, '_');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ใบ50ทวิ_${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* แถบแจ้งเตือนสถานะ KYC พาร์ทเนอร์ */}
      {isKycVerified ? (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <div>
              <p className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                ✓ ยืนยันตัวตนสำเร็จ (KYC & ประวัติอาชญากรรมผ่านแล้ว)
              </p>
              <p className="text-[10px] text-slate-400">
                บัญชีของคุณเปิดรับงานและมีประกันคุ้มครองเต็มรูปแบบ
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10px] font-bold">
            Verified Partner
          </span>
        </div>
      ) : (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {kycStatus === 'pending_review'
                  ? 'สถานะ: กำลังรอแอดมินตรวจสอบประวัติอาชญากรรม'
                  : kycStatus === 'rejected'
                  ? 'สถานะ: ใบสมัครไม่ผ่านการอนุมัติ โปรดยื่นใหม่'
                  : 'สถานะ: รอการยืนยันตัวตน (KYC)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {kycStatus === 'pending_review'
                  ? 'เจ้าหน้าที่กำลังตรวจประวัติกับสำนักงานตำรวจแห่งชาติ'
                  : 'อัปโหลดบัตรประชาชนและรูปถ่ายเพื่อเปิดสิทธิ์รับงาน'}
              </p>
            </div>
          </div>
          {kycStatus !== 'pending_review' && (
            <button
              type="button"
              onClick={() => setShowKycModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0"
            >
              {kycStatus === 'rejected' ? 'ยื่นเอกสารใหม่' : 'ยืนยันตัวตน'}
            </button>
          )}
        </div>
      )}

      {/* Mobile Header for Partner */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Partner Avatar */}
          <div
            onClick={() => setIsEditAvatarOpen(true)}
            className="relative w-9 h-9 rounded-xl overflow-hidden border border-amber-500/50 bg-slate-800 flex items-center justify-center cursor-pointer group shrink-0"
            title="แตะเพื่อเปลี่ยนรูปโปรไฟล์พาร์ทเนอร์"
          >
            {userSession.avatarUrl ? (
              <img src={userSession.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-amber-400" />
            )}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs truncate max-w-[120px]">
                {displayName}
              </span>
              {isKycVerified && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded font-semibold flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> ตรวจประวัติแล้ว
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isKycVerified ? 'สถานะ: ออนไลน์พร้อมรับงาน' : 'สถานะ: รอการยืนยันตัวตน'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Prominent Emergency Red SOS Guard Strip */}
      <div className="bg-red-950/80 border-b border-red-500/60 p-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-red-200 text-xs">
          <Siren className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
          <span className="font-semibold text-[11px] leading-tight">
            ถูกลวนลาม/ไม่ปลอดภัย? คุณมีสิทธิ์ปฏิเสธ 100%
          </span>
        </div>
        <button
          onClick={() => setIsSosOpen(true)}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow-md shadow-red-950/80 animate-bounce shrink-0 cursor-pointer"
        >
          🚨 SOS ด่วน
        </button>
      </div>

      {/* Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: JOBS / SCHEDULE */}
        {partnerTab === 'jobs' && (
          <div className="space-y-4">
            {/* Pending Acceptance Requests (5-minute SLA) */}
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 rounded-2xl border-2 border-amber-500/60 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>มีคำขอจ้างงานใหม่ (ตอบรับภายใน 5 นาที):</span>
                  </span>
                  <span className="text-xs font-bold text-white bg-amber-600/30 px-2 py-0.5 rounded-full border border-amber-500/40">
                    {formatBaht(getPartnerGross(job))} ฿ (รายได้)
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-white">{job.eventType}</div>
                  <div className="text-slate-400">
                    📅 วันที่: {job.date} เวลา {job.startTime} น. ({job.durationHours} ชม.)
                  </div>
                  <div className="text-slate-400">📍 สถานที่: {job.location}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    🔒 เงินลูกค้าพักในระบบ Escrow เรียบร้อยแล้ว
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptJob(job.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>ตอบรับงานนี้ (Accept Gig)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectJob(job.id)}
                    className="flex-1 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✕ ปฏิเสธงาน</span>
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">ตารางงานที่ได้รับการยืนยัน:</span>
              <span className="text-emerald-400 font-semibold text-[11px]">
                {confirmedJobs.length} งาน
              </span>
            </div>

            {/* Confirmed / In-progress Jobs */}
            {confirmedJobs.length === 0 ? (
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <Calendar className="w-7 h-7 text-slate-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-300">
                  {isLoadingJobs ? 'กำลังโหลดงาน...' : 'ยังไม่มีงานในสถานะดำเนินการขณะนี้'}
                </p>
                <p className="text-[10px] text-slate-500">
                  เมื่อลูกค้าสร้างนัดหมาย ระบบจะแจ้งเตือนพร้อมสิทธิประโยชน์ประกันอุบัติเหตุทันที
                </p>
              </div>
            ) : (
              confirmedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h4 className="font-bold text-white text-xs">{job.eventType}</h4>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                      {job.status === 'in_progress' ? '🟢 กำลังปฏิบัติงาน' : 'ยืนยันแล้ว'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        เวลา: {job.startTime} น. ({job.durationHours} ชั่วโมง)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>สถานที่: {job.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>
                        ลูกค้า: <strong className="text-white">{job.clientName}</strong>
                      </span>
                      <span>
                        เบอร์ติดต่อ:{' '}
                        <strong className="text-rose-300 font-mono">{job.clientPhone}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions for Partner */}
                  <div className="space-y-2">
                    {(job.status === 'accepted' || job.status === 'confirmed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => openTracking(job)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>📍 ดูพิกัดนัดเจอลูกค้า & แผนที่ความปลอดภัยสด</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                           const jobId = job.id || job.bookingId;
                           const started = await handleStartProgress(jobId);
                           if (started) openTracking({ ...job, id: jobId, status: 'in_progress' });
                        }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>เริ่มงานแล้ว (เข้าพบลูกค้า & เปิดระบบคุ้มครอง)</span>
                        </button>
                      </>
                    )}

                    {job.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => openTracking(job)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>เปิดแผนที่ความปลอดภัย / จบงาน</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">
                        รายได้สุทธิหลังหักภาษี 3% (ม.3 เตรส):
                      </span>
                      <div className="font-bold text-amber-300 text-sm">
                        {formatBaht(getPartnerNet(job))} บาท
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSosOpen(true)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-red-950/40 text-red-300 border border-slate-700 hover:border-red-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>รายงานปัญหา</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Safety Reminder */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 space-y-1">
              <strong>กฎระเบียบการรับงาน:</strong>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                <li>ห้ามรับงานนอกระบบเด็ดขาด (จะไม่ได้รับความคุ้มครองประกันและ Escrow)</li>
                <li>ปฏิเสธการดื่มแอลกอฮอล์เกินลิมิต หรือสถานที่ปิดมิดชิด</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: SAFETY & GPS MONITOR */}
        {partnerTab === 'safety' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>ระบบคุ้มครองความปลอดภัย 24/7 (Live GPS Shield)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ตลอดระยะเวลาการทำงาน พิกัด GPS ของคุณจะเชื่อมต่อกับทีม Laysea Security และสถานีตำรวจพื้นที่
                หากมีเหตุผิดปกติ คุณสามารถกดปุ่ม SOS เพื่อเรียกรถสายตรวจได้ทันที
              </p>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div>
                  📍 <strong>พิกัดปัจจุบัน:</strong>{' '}
                  {currentCoords
                    ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`
                    : locationError
                    ? 'ไม่สามารถระบุพิกัดได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง)'
                    : 'กำลังระบุพิกัด...'}
                </div>
                <div>🛡️ <strong>ประกันอุบัติเหตุ:</strong> คุ้มครองเต็มวงเงิน 500,000 บาท</div>
                <div>📞 <strong>สายด่วนฉุกเฉิน:</strong> 191 หรือ 02-LAYSEA-SOS</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!trackingJob) {
                    alert('ยังไม่มีงานที่ยืนยันแล้ว จึงยังไม่สามารถเปิดแผนที่ติดตามได้');
                    return;
                  }
                  setIsTrackingOpen(true);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>เปิดแผนที่พิกัดความปลอดภัยสด (Live Radar)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-950/80 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Siren className="w-4 h-4 animate-bounce" />
              <span>ส่งสัญญาณฉุกเฉินทันที (Emergency SOS Dispatch)</span>
            </button>
          </div>
        )}

        {/* TAB 3: EARNINGS & WITHHOLDING TAX (50 ทวิ) */}
        {partnerTab === 'earnings' && (
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 rounded-2xl border border-amber-500/40 text-center space-y-1">
              <span className="text-xs text-slate-400">รายได้สะสมสุทธิพร้อมโอน (Net Payout)</span>
              <div className="text-3xl font-black text-amber-300 font-['Plus_Jakarta_Sans']">
                {Math.round(totalNetEarnings).toLocaleString()} ฿
              </div>
              <p className="text-[10px] text-slate-400">
                รอบโอนเงินอัตโนมัติเข้าบัญชีกสิกรไทย (KBANK) ทุกวันศุกร์
              </p>
            </div>

            {/* Tax Breakdown Card */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-white border-b border-slate-800 pb-2">
                <span>สรุปการคำนวณรายได้และภาษี:</span>
                <span className="text-[10px] text-emerald-400">ถูกต้องตามประมวลรัษฎากร</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ยอดรวมค่าบริการ (Gross 80%):</span>
                <span className="text-slate-200">{Math.round(totalGrossEarnings).toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ภาษีหัก ณ ที่จ่าย 3% (ม.3 เตรส):</span>
                <span className="text-rose-400 font-semibold">
                  -{Math.round(totalWithholdingTax).toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between text-slate-200 font-bold text-xs pt-1.5 border-t border-slate-800">
                <span>ยอดเงินจ่ายสุทธิ (Net Payout):</span>
                <span className="text-amber-300">{Math.round(totalNetEarnings).toLocaleString()} บาท</span>
              </div>

              {/* ปุ่มดูและปุ่มดาวน์โหลดเอกสาร */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowWithholdingCertModal(true)}
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>ดูตัวอย่างใบ 50 ทวิ</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTaxDoc}
                  className="py-2 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>📥 ดาวน์โหลดเอกสาร</span>
                </button>
              </div>
            </div>

            {/* ประวัติรายการรับงาน & รายได้ */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200">
                  ประวัติรับงาน & รายได้ที่เสร็จสิ้น
                </span>
                <span className="text-xs text-slate-400">
                  {completedJobsList.length > 0
                                         ? `${completedJobsList.length} รายการ`
                                         : 'ยังไม่มีประวัติงาน'}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {completedJobsList.length > 0 ? (
            completedJobsList.map((j: any) => (
              <div 
                key={j.id || j.bookingId} 
                className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    <span>{j.eventType || 'งานนัดหมาย'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    📅 วันที่: {j.date || '-'} · {j.durationHours} ชม.
                  </div>
                  <div className="text-[10px] text-slate-500">ลูกค้า: {j.clientName || 'ลูกค้า Laysea'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-amber-300">
                    +{Math.round(Number(j.netPartnerPayout || (j.totalAmountBaht ? j.totalAmountBaht * 0.8 * 0.97 : (j.totalCredits ? j.totalCredits * 0.8 * 0.97 : 0)))).toLocaleString()} ฿
                  </div>
                  <div className="text-[9px] text-slate-400">(หัก 3% แล้ว)</div>
                  <span className="inline-block mt-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                    โอนเข้าแล้ว
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              ยังไม่มีประวัติงานที่เสร็จสิ้น
            </div>
          )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <strong className="text-slate-300">หมายเหตุภาษีสำหรับพาร์ทเนอร์:</strong>
              <p>
                แพลตฟอร์ม Laysea ดำเนินการหักและนำส่งภาษีเงินได้หัก ณ ที่จ่าย 3% ให้กรมสรรพากรอย่างถูกต้อง
                ท่านสามารถนำใบ 50 ทวิ ไปใช้ยื่นลดหย่อนหรือขอคืนภาษีประจำปี (ภ.ง.ด. 90/91) ได้
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & SETTINGS */}
        {partnerTab === 'profile' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsEditAvatarOpen(true)}
                  className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-800 flex items-center justify-center cursor-pointer group shrink-0"
                >
                  {userSession.avatarUrl ? (
                    <img
                      src={userSession.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-amber-400" />
                  )}
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 mb-1">
                      <input
                        type="text"
                        value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs border border-rose-500/50 outline-none w-28"
                        placeholder="ชื่อพาร์ทเนอร์"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSavePartnerName}
                        disabled={isSavingName}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] px-2 py-0.5 rounded font-bold cursor-pointer"
                      >
                        {isSavingName ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        disabled={isSavingName}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] px-2 py-0.5 rounded cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{displayName || 'Laysea'}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameVal(displayName || '');
                          setIsEditingName(true);
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[11px] underline cursor-pointer"
                      >
                        ✏️ แก้ไขชื่อ
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-rose-400">
                    {userSession?.rating ? `เรตติ้ง ${userSession.rating} ★` : 'ยังไม่มีเรตติ้ง'}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>เบอร์ยืนยันแล้ว: {userSession.phone || partnerPhone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* ช่องจัดการอัลบั้มรูปภาพผลงาน 1-6 รูป */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    📸 อัลบั้มรูปผลงาน/ไลฟ์สไตล์ (1-{MAX_GALLERY_IMAGES} รูป)
                  </span>
                  <span className="text-[11px] text-rose-400 font-medium">
                    {galleryImages.length} / {MAX_GALLERY_IMAGES} รูป
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={`${img}-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950"
                    >
                      <img
                        src={img}
                        alt={`ผลงาน ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        disabled={isUploadingGallery}
                        className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md active:scale-95"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {galleryImages.length < MAX_GALLERY_IMAGES && (
                    <label
                      className={`aspect-square rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-rose-500 hover:text-rose-400 bg-slate-800/40 active:scale-95 transition ${
                        isUploadingGallery ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                      }`}
                    >
                      <span className="text-2xl font-light leading-none">
                        {isUploadingGallery ? '…' : '+'}
                      </span>
                      <span className="text-[10px] mt-1">
                        {isUploadingGallery ? 'กำลังอัปโหลด' : 'เพิ่มรูป'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingGallery}
                        onChange={handleUploadGalleryImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsEditAvatarOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>เปลี่ยนรูปโปรไฟล์พาร์ทเนอร์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>นโยบายความเป็นส่วนตัว (PDPA) & สิทธิ์ข้อมูล</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>พื้นที่จัดการบัญชี (Danger Zone)</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ท่านมีสิทธิ์ขอให้ลบและทำลายข้อมูลผู้ใช้
                ประวัติการทำงาน และข้อมูลบัญชีธนาคารทั้งหมดอย่างถาวร
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบบัญชีและข้อมูลผู้ใช้ (Delete Account)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Partner */}
      <div className="bg-slate-900 border-t border-slate-800 grid grid-cols-4 p-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setPartnerTab('jobs')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'jobs' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>ตารางงาน</span>
        </button>

        <button
          type="button"
          onClick={() => setPartnerTab('safety')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'safety' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>ความปลอดภัย</span>
        </button>

        <button
          type="button"
          onClick={() => setPartnerTab('earnings')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'earnings' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 mb-0.5" />
          <span>รายได้ & 50 ทวิ</span>
        </button>

        <button
          type="button"
          onClick={() => setPartnerTab('profile')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'profile' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>โปรไฟล์</span>
        </button>
      </div>

      {/* 50 ทวิ Withholding Tax Modal */}
      {showWithholdingCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithholdingCertModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="text-[10px] text-amber-300 font-semibold text-center border-b border-slate-800 pb-1.5">
                ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร (ภ.ง.ด. 3)
              </div>
              <div className="flex justify-between gap-2 text-slate-400 text-[11px]">
                <span className="shrink-0">ผู้จ่ายเงิน:</span>
                <span className="text-white text-right">
                  {PAYER_INFO.nameTh} ({PAYER_INFO.taxId})
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ผู้มีเงินได้:</span>
                <span className="text-rose-300 font-bold">{displayName}</span>
              </div>
              <div className="flex justify-between gap-2 text-slate-400 text-[11px]">
                <span className="shrink-0">ประเภทเงินได้:</span>
                <span className="text-slate-200 text-right">
                  ค่าจ้างทำงาน/บริการ (มาตรา 40(8) และ 3 เตรส)
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>จำนวนเงินที่จ่ายรวม (Gross):</span>
                <span className="text-white font-bold">{formatBaht(grossEarnings)} บาท</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ภาษีหัก ณ ที่จ่าย 3%:</span>
                <span className="text-rose-400 font-bold">{formatBaht(totalWithholdingTax)} บาท</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>จำนวนเงินจ่ายสุทธิ:</span>
                <span className="text-amber-300 font-bold">{formatBaht(netEarnings)} บาท</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTaxDoc}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดเอกสาร 50 ทวิ</span>
            </button>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {isSosOpen && (
        <SosEmergencyModal
          onClose={() => setIsSosOpen(false)}
          incidents={[]}
          onTriggerSos={(threat: string) => {
            onTriggerSos(threat);
            setIsSosOpen(false);
          }}
        />
      )}

      {/* Live Tracking Modal */}
      {isTrackingOpen && trackingJob && (
        <LiveTrackingModal
          booking={trackingJob}
          currentUserRole="partner"
          onClose={handleCloseTracking}
          onOpenSos={() => setIsSosOpen(true)}
        />
      )}

      {/* Avatar Modal */}
      {isEditAvatarOpen && (
        <AvatarUploadModal
          currentAvatarUrl={userSession.avatarUrl}
          userRole="partner"
          onClose={() => setIsEditAvatarOpen(false)}
          onSaveAvatar={async (url) => {
            onUpdateAvatar?.(url);
            setIsEditAvatarOpen(false);
            if (!partnerPhone) return;
            try {
              const db = getFirestore(app);
              await setDoc(
                doc(db, 'partners', partnerPhone),
                { avatar: url, updatedAt: new Date().toISOString() },
                { merge: true }
              );
            } catch (err) {
              console.error('Save partner avatar to firestore error:', err);
            }
          }}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />}

      {/* Delete Account Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">ยืนยันลบบัญชีและข้อมูลผู้ใช้</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              การกระทำนี้จะลบข้อมูลประวัติการทำงาน ยอดเงิน และข้อมูลส่วนบุคคลทั้งหมดตามสิทธิ์ PDPA
              อย่างถาวรและไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDeleteAccount) {
                    onDeleteAccount();
                  } else {
                    alert('ไม่สามารถลบบัญชีได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่');
                  }
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                ยืนยันการลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยื่นเอกสารบัตรประชาชน */}
      {showKycModal && (
        <KycModal
          userSession={userSession}
          onClose={() => setShowKycModal(false)}
          onSuccess={() => {
            setShowKycModal(false);
            setKycStatus('pending_review');
            alert('🎉 ยื่นเอกสาร KYC สำเร็จแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติภายใน 24 ชม.');
          }}
        />
      )}
    </div>
  );
};
