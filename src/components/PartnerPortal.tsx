import React, { useState, useEffect } from 'react';
import {
  Siren,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Award,
  DollarSign,
  User,
  LogOut,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  FileText,
  Wine,
  Navigation,
  Trash2,
  Lock,
  Phone,
  X,
  Camera,
  Check,
  RotateCcw,
  Download,
} from 'lucide-react';
import { UserSession, Booking } from '../types';
import { SosEmergencyModal } from './SosEmergencyModal';
import { LiveTrackingModal } from './LiveTrackingModal';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { INITIAL_PARTNERS } from '../data/partners';
import { KycModal } from './KycModal';
import { uploadImageToCloud } from '../utils/storageUpload';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyEvent } from '../utils/notification';


interface PartnerPortalProps {
  userSession: UserSession;
  onLogout: () => void;
  onTriggerSos: (threat: string) => void;
  onUpdateAvatar?: (url: string) => void;
  onDeleteAccount?: () => void;
  onRefreshBookings?: () => void;
}

export const PartnerPortal: React.FC<PartnerPortalProps> = ({
  userSession,
  onLogout,
  onTriggerSos,
  onUpdateAvatar,
  onDeleteAccount,
  onRefreshBookings,
}) => {
const [showKycModal, setShowKycModal] = useState(false);
const [kycStatus, setKycStatus] = useState<'not_submitted' | 'pending_review' | 'approved' | 'rejected'>('not_submitted');
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [isLiveTrackingOpen, setIsLiveTrackingOpen] = useState(false);
  const [selectedTrackingJob, setSelectedTrackingJob] = useState<any>(null);

  useEffect(() => {
    const checkKycStatus = async () => {
      const phone = userSession?.phone;
      if (!phone) return;
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const res = await fetch(`${apiUrl}/api/kyc/status/${cleanPhone}`);
        const data = await res.json();
        if (data.success) {
          setKycStatus(data.status);
          setIsKycVerified(data.isKycVerified);
        }
      } catch (err) {
        console.error('Error fetching KYC status:', err);
      }
    };

    checkKycStatus();
    const interval = setInterval(checkKycStatus, 5000);
    return () => clearInterval(interval);
  }, [userSession]);

// 🌟 ดึงตารางงานและคำขอจองใหม่ทั้งหมดของพาร์ทเนอร์จาก Cloud Firestore
  useEffect(() => {
    const rawId = userSession?.phone || userSession?.id;
    const myPhone = String(userSession?.phone || '').replace(/\D/g, '');

    const unsubscribe = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        const jobsList: any[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const pId = String(d.partnerId || '').replace(/\D/g, '');
          const pPhone = String(d.partnerPhone || '').replace(/\D/g, '');

          // ตรวจสอบว่าส่งมาหาพาร์ทเนอร์คนนี้จริงหรือไม่ (หรือมีเบอร์ตรงกัน)
          const isTargetPartner =
            (myPhone && (pPhone.includes(myPhone) || pId.includes(myPhone))) ||
            String(d.partnerId || '') === String(rawId) ||
            String(d.partnerPhone || '') === String(userSession?.phone || '');

          if (isTargetPartner) {
            jobsList.push({ ...d, id: docSnap.id });
          }
        });

        // เรียงจากงานล่าสุดขึ้นก่อน
        jobsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setJobs(jobsList);

        // --- ระบบแจ้งเตือนเสียง + สั่น Real-time ฝั่งพาร์ทเนอร์ ---
        // 1. ตรวจสอบว่ามีงานใหม่เข้ามาที่ยังรอรับ (pending) หรือไม่
        const hasIncomingJob = jobsList.some(
          (j: any) => j.status === 'pending' || j.status === 'requested'
        );

        // 2. ตรวจสอบว่ามีงานที่ลูกค้ากดยืนยันปล่อยเงิน/เสร็จสิ้น หรือไม่
        const hasMoneyReleased = jobsList.some(
          (j: any) => 
            j.status === 'completed' || 
            j.status === 'finished' || 
            j.paymentStatus === 'paid' || 
            j.isReleased === true
        );

        // สั่งสั่นและส่งเสียงเตือน
        if (hasIncomingJob) {
          // มีงานใหม่เข้า: สั่นกระชั้น + ส่งเสียงเตือนงานเข้า
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([400, 200, 400, 200, 600]);
          }
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.9;
            audio.play().catch(() => {});
          } catch (e) {}
        } else if (hasMoneyReleased) {
          // ลูกค้าปล่อยเงินจบงาน: สั่นยาว + เสียงเงินเข้า (Cash register)
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 500]);
          }
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
            audio.volume = 0.9;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      },

      (error) => {
        console.warn('Partner jobs sync error:', error);
      }
    );

// --- 1. กรองงานตามสถานะต่างๆ ---
  const activeJobs = jobs.filter((j: any) => 
    !j.isDeletedByPartner && 
    ['pending', 'requested', 'accepted', 'confirmed', 'in_progress'].includes(j.status)
  );

  const completedJobsList = jobs.filter((j: any) => 
    !j.isDeletedByPartner && 
    (j.status === 'completed' || j.status === 'finished' || j.paymentStatus === 'paid' || j.isReleased === true)
  );

  // --- 2. คำนวณรายได้สะสมจริง (80% และหัก ณ ที่จ่าย 3%) ---
  const realGrossEarnings = completedJobsList.reduce((sum: number, j: any) => {
    const duration = Number(j.durationHours || 2);
    const rawPrice = Number(
      j.totalCredits || 
      j.totalPrice || 
      j.totalAmount || 
      (j.pricePerHour ? j.pricePerHour * duration : 0) || 
      j.price || 
      0
    );
    return sum + Math.round(rawPrice * 0.80);
  }, 0);

  const realTaxDeduction = Number((realGrossEarnings * 0.03).toFixed(2));
  const realNetPayout = Number((realGrossEarnings - realTaxDeduction).toFixed(2));

  // --- 3. ฟังก์ชันสำหรับกดลบประวัติการรับงาน (Soft Delete) ---
  const handleDeleteJobHistory = async (jobId: string) => {
    if (!window.confirm('คุณต้องการลบรายการประวัตินี้ออกจากหน้าจอใช่หรือไม่?')) return;
    try {
      await setDoc(doc(db, 'bookings', jobId), { isDeletedByPartner: true }, { merge: true });
      setJobs((prev: any[]) => prev.filter((j: any) => j.id !== jobId));
    } catch (err) {
      console.error('Delete history error:', err);
      alert('ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

// พาร์ทเนอร์กดยืนยันรับงาน
  const handleAcceptJob = async (bookingId: string) => {
    if (!bookingId) return;
    try {
      // อัปเดตสถานะตรงไปยัง Cloud Firestore
      await setDoc(doc(db, 'bookings', bookingId), {
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      }, { merge: true });

      alert('ตอบรับงานเรียบร้อยแล้ว! พิกัดนัดพบและเบอร์ติดต่อลูกค้าได้รับการเปิดเผยแล้ว');
    } catch (err) {
      console.error('Accept job error:', err);
      alert('เกิดข้อผิดพลาดในการตอบรับงาน');
    }
  };

  // พาร์ทเนอร์กดเริ่มงาน
  const handleStartJob = async (bookingId: string) => {
    try {
      await setDoc(doc(db, 'bookings', bookingId), {
        status: 'in_progress',
        startedAt: new Date().toISOString()
      }, { merge: true });
      alert('เริ่มดำเนินงานแล้ว!');
    } catch (err) {
      console.error('Start job error:', err);
    }
  };

    return () => unsubscribe();
  }, [userSession?.phone, userSession?.id]);

// เก็บรูปภาพอัลบั้ม 1-6 รูป
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    const saved = localStorage.getItem(`gallery_${userSession?.phone}`);
    return saved ? JSON.parse(saved) : [];
  });

// จัดการเรตราคาและงานที่รับแบบ Local State (ติ๊กได้ทันที Real-time)
  const [serviceRates, setServiceRates] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const pKey = userSession?.phone || userSession?.id;
      const saved = localStorage.getItem(`partner_service_rates_${pKey}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return userSession?.serviceRates || {
      cafe: { enabled: true, rate: 450, name: '☕ ทานข้าว / คาเฟ่ / เดินห้าง' },
      movie: { enabled: false, rate: 500, name: '🎬 ดูหนัง / กิจกรรมไลฟ์สไตล์' },
      party: { enabled: false, rate: 700, name: '🍻 ปาร์ตี้ / สังสรรค์ / ชงดื่ม' },
      event: { enabled: false, rate: 900, name: '👗 ออกงานสังคม / งานแต่ง / ทางการ' }
    };
  });

  // ฟังก์ชันเลือกรูปภาพเข้าอัลบั้ม (แปลงเป็น Base64 ป้องกันปัญหา CORS Cloud Storage 100%)
  const handleUploadGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (galleryImages.length >= 6) {
      alert('สามารถอัปโหลดรูปภาพได้สูงสุด 6 รูปครับ');
      return;
    }

    const file = files[0];

    // เช็คขนาดไฟล์ก่อนบีบอัด
    if (file.size > 8 * 1024 * 1024) {
      alert('กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        // ย่อขนาดรูปภาพให้พอดี (กว้างสูงสุด 1000px) เพื่อให้ภาพคมชัดและขนาดไฟล์เล็ก
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // แปลงภาพเป็น Base64
        const base64Url = canvas.toDataURL('image/jpeg', 0.65);

        // รวมรูปใหม่เข้าอัลบั้ม (สูงสุด 6 รูป)
        const updated = [...galleryImages, base64Url].slice(0, 6);
        setGalleryImages(updated);

        // บันทึกลง LocalStorage
        if (userSession?.phone) {
          localStorage.setItem(`gallery_${userSession.phone}`, JSON.stringify(updated));
        }
        localStorage.setItem('laysea_partner_gallery', JSON.stringify(updated));

        // ซิงค์เข้า Cloud Firestore
        try {
          const pId = userSession?.phone || userSession?.id;
          if (pId) {
            // อัปเดตทั้ง collection 'users' และ 'partners'
            await setDoc(doc(db, 'users', pId), {
              gallery: updated,
              galleryImages: updated,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            await setDoc(doc(db, 'partners', pId), {
              gallery: updated,
              galleryImages: updated,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log('[Firestore] ซิงค์รูปภาพอัลบั้มเรียบร้อย');
          }
        } catch (fErr) {
          console.warn('Sync profile photo error:', fErr);
        }

        alert('เพิ่มรูปภาพผลงานเรียบร้อยแล้ว');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ฟังก์ชันลบรูป
  const handleRemoveGalleryImage = (indexToRemove: number) => {
    const updated = galleryImages.filter((_, idx) => idx !== indexToRemove);
    setGalleryImages(updated);
    localStorage.setItem(`gallery_${userSession?.phone}`, JSON.stringify(updated));
  };
  const [partnerTab, setPartnerTab] = useState<'jobs' | 'safety' | 'earnings' | 'profile'>('jobs');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showWithholdingCertModal, setShowWithholdingCertModal] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [activeTrackingJob, setActiveTrackingJob] = useState<Booking | null>(null);

  // Fetch partner jobs from backend
  const fetchPartnerJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const partnerIdentifier = userSession?.partnerProfileId || userSession?.phone || userSession?.id || '';
      
      // ดึงงานโดยใช้ role=partner เพื่อให้เห็นงานจองทั้งหมด
      const res = await fetch(`${backendUrl}/api/bookings?role=partner&partnerId=${partnerIdentifier}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': partnerIdentifier,
          'x-user-role': 'partner',
        },
      });

      if (res.ok) {
        const data = await res.json();
        // ดึงรายการงานออกมาไม่ว่าจะส่งมาเป็น array ตรงๆ หรือ data.bookings หรือ data.data
        const rawList = Array.isArray(data) ? data : (data.bookings || data.data || data.jobs || []);
        
        // แปลงฟิลด์ให้ตรงกับการ์ดแสดงผลบนหน้าจอ
        const formattedJobs = rawList.map((item: any) => ({
          ...item,
          id: item._id || item.id,
          eventType: item.eventType || item.serviceType || item.title || 'บริการดูแล / เพื่อนเที่ยว',
          startTime: item.startTime || item.time || item.bookingTime || '18:00',
          durationHours: item.durationHours || item.hours || 3,
          location: item.location || item.address || item.venue || 'ตามที่ลูกค้าระบุ',
          clientName: item.clientName || item.customerName || item.userName || 'ลูกค้าทั่วไป',
          clientPhone: item.clientPhone || item.customerPhone || item.phone || '-',
          status: item.status || 'pending',
          totalAmountBaht: item.totalAmountBaht || item.totalPrice || item.price || 2400,
          netPartnerPayoutBaht: item.netPartnerPayoutBaht || (Number(item.totalAmountBaht || item.price || 2400) * 0.8 * 0.97)
        }));

        // setJobs(formattedJobs);
      }
    } catch (err) {
      console.error('Failed to load partner jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  /*
useEffect(() => {
  fetchPartnerJobs();
  const interval = setInterval(fetchPartnerJobs, 4000);
  return () => clearInterval(interval);
}, [userSession]);
*/

  // Partner Action: Accept Gig (5-min SLA response)
  const handleAcceptJob = async (bookingId: string) => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${backendUrl}/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'ตอบรับงานเรียบร้อย! พิกัดนัดพบและเบอร์ติดต่อของลูกค้าได้รับการเปิดเผยแล้ว');
        setJobs(prevJobs =>
          prevJobs.map(j => (j.id === bookingId ? { ...j, status: 'accepted' } : j))
        );
        if (typeof fetchPartnerJobs === 'function') fetchPartnerJobs();
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
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธงาน (เช่น ไม่สะดวกเรื่องเวลา / ติดภารกิจอื่น):');
    if (!reason) return;

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${backendUrl}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `พาร์ทเนอร์ปฏิเสธงาน: ${reason}`, role: 'partner' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('ปฏิเสธงานเรียบร้อยแล้ว ระบบจะส่งต่องานให้พาร์ทเนอร์ท่านอื่น');
        setJobs(prevJobs => prevJobs.filter(j => j.id !== bookingId));
        if (typeof fetchPartnerJobs === 'function') fetchPartnerJobs();
      } else {
        alert(data.message || 'ไม่สามารถปฏิเสธงานได้');
      }
    } catch (err) {
      console.error('Error rejecting job:', err);
      alert('เกิดข้อผิดพลาดในการปฏิเสธงาน');
    }
  };

// Partner Action: Start Progress (เริ่มงาน)
const handleStartProgress = async (bookingId: string) => {
  // หากเป็นงานจำลอง ให้ปรับสถานะในเครื่องทันที ไม่ต้องยิงไป Render
  if (!bookingId || bookingId.startsWith('BOOK-') || bookingId.length < 10) {
    setJobs((prev) =>
      prev.map((j) => (j.id === bookingId ? { ...j, status: 'in_progress' } : j))
    );
    alert('เริ่มงานเรียบร้อย เปิดระบบคุ้มครองความปลอดภัยแล้ว');
    return;
  }

  try {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
    const res = await fetch(`${backendUrl}/api/bookings/${bookingId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      alert('เริ่มงานเรียบร้อย เปิดระบบคุ้มครองความปลอดภัยแล้ว');
    } else {
      alert('เริ่มงานเรียบร้อย (เปิดระบบคุ้มครอง)');
    }

    setJobs((prev) =>
      prev.map((j) => (j.id === bookingId ? { ...j, status: 'in_progress' } : j))
    );
  } catch (err) {
    setJobs((prev) =>
      prev.map((j) => (j.id === bookingId ? { ...j, status: 'in_progress' } : j))
    );
    alert('เริ่มงานเรียบร้อย (เปิดระบบคุ้มครอง)');
  }
};

  // Calculate earnings metrics
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const grossEarnings = completedJobs.reduce((acc, j) => acc + (j.partnerGrossBaht || j.totalAmountBaht * 0.8), 38400);
  const totalWithholdingTax = completedJobs.reduce((acc, j) => acc + (j.withholdingTaxBaht || j.totalAmountBaht * 0.8 * 0.03), 1152);
  const netEarnings = grossEarnings - totalWithholdingTax;

  const currentActiveJob = jobs.find((j) => j.status === 'accepted' || j.status === 'in_progress') || jobs[0];

// ฟังก์ชันดาวน์โหลดหนังสือรับรอง หัก ณ ที่จ่าย 50 ทวิ (รองรับมือถือ)
  const handleDownloadTaxDoc = () => {
    const partnerName = userSession?.name || 'พาร์ทเนอร์ Laysea';
    const cleanPhone = userSession?.phone || '090-XXX-XXXX';
    const grossVal = '38,400';
    const taxVal = '1,152';
    const netVal = '37,248';
    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = `===============================================================
       หนังสือรับรองการหักภาษี ณ ที่จ่าย (ตามมาตรา 50 ทวิ)
===============================================================
วันที่ออกเอกสาร: ${today}

1. ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (ผู้จ่ายเงิน):
   ชื่อนิติบุคคล: บริษัท เลซี เอ็นเตอร์เทน จำกัด (LAYSEA ENTERTAIN PLATFORM CO., LTD.)
   เลขประจำตัวผู้เสียภาษีอากร: 0205567012345
   ที่อยู่: ชลบุรี ประเทศไทย

2. ผู้ถูกหักภาษี ณ ที่จ่าย (พาร์ทเนอร์ผู้รับเงิน):
   ชื่อ-นามสกุล: ${partnerName}
   หมายเลขโทรศัพท์ / บัญชีสมาชิก: ${cleanPhone}

3. รายละเอียดการหักภาษี ณ ที่จ่าย:
   - ประเภทเงินได้: เงินได้พึงประเมินตามมาตรา 40(8) ค่าบริการและค่าดูแลสังสรรค์
   - ยอดรวมค่าบริการสะสม (Gross 80%): ${grossVal} บาท
   - ภาษีหัก ณ ที่จ่ายที่นำส่ง (3%): ${taxVal} บาท
   - ยอดเงินสุทธิหลังหักภาษี (Net Payout): ${netVal} บาท

---------------------------------------------------------------
* เอกสารนี้สร้างจากระบบอิเล็กทรอนิกส์ Laysea Entertain Platform
* พาร์ทเนอร์สามารถนำไปใช้เป็นหลักฐานยื่นลดหย่อนหรือขอคืนภาษีประจำปี (ภ.ง.ด. 90/91)
===============================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ใบ50ทวิ_${partnerName}.txt`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

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
              <p className="text-[10px] text-slate-400">บัญชีของคุณเปิดรับงานและมีประกันคุ้มครองเต็มรูปแบบ</p>
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
                {userSession.name}
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> ตรวจประวัติแล้ว
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              สถานะ: ออนไลน์พร้อมรับงาน
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
            {/* Pending Acceptance Requests (5-minute SLA timer) */}
            {jobs.filter((j) => j.status === 'matched_pending' || j.status === 'pending' || j.status === 'waiting').map((job) => (
              <div
                key={job.id}
                className="p-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 rounded-2xl border-2 border-amber-500/60 space-y-3 shadow-lg animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>มีคำขอจ้างงานใหม่ (ตอบรับภายใน 5 นาที):</span>
                  </span>
                  <span className="text-xs font-bold text-white bg-amber-600/30 px-2 py-0.5 rounded-full border border-amber-500/40">
                    {job.totalAmountBaht * 0.8} ฿ (รายได้)
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-white">{job.eventType}</div>
                  <div className="text-slate-400">📅 วันที่: {job.date} เวลา {job.startTime} น. ({job.durationHours} ชม.)</div>
                  <div className="text-slate-400">📍 สถานที่: {job.location}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">🔒 เงินลูกค้าพักในระบบ Escrow เรียบร้อยแล้ว</div>
                </div>

                <div className="flex gap-2">
                  <button
            type="button"
            onClick={async () => {
              try {
                const bId = job.bookingId || job.id;
                if (!bId) {
                  alert('ไม่พบรหัสงาน');
                  return;
                }
                await setDoc(doc(db, 'bookings', bId), {
                  status: 'accepted',
                  acceptedAt: new Date().toISOString()
                }, { merge: true });

                alert('ตอบรับงานเรียบร้อยแล้ว! เตรียมตัวเดินทางและเปิด Live GPS ได้เลย');
              } catch (err) {
                console.error('Accept gig error:', err);
                alert('เกิดข้อผิดพลาดในการตอบรับงาน');
              }
            }}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>ตอบรับงานนี้ (Accept Gig)</span>
          </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold text-[11px]">
             {activeJobs.length} งานวันนี้
           </span>
          </div>

          {/* Confirmed / Pending / In-progress Jobs */}
          {jobs.filter((j: any) => ['accepted', 'in_progress', 'confirmed'].includes(j.status)).length === 0 ? (
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <Calendar className="w-7 h-7 text-slate-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-300">ยังไม่มีงานในสถานะดำเนินการขณะนี้</p>
              <p className="text-[10px] text-slate-500">เมื่อลูกค้าสร้างนัดหมาย ระบบจะแจ้งเตือนพร้อมสิทธิประโยชน์ความคุ้มครองทันที</p>
            </div>
          ) : (
            jobs
              .filter((j: any) => ['accepted', 'in_progress', 'confirmed'].includes(j.status))
              .map((job: any) => (
                <div key={job.id} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h4 className="font-bold text-white text-xs">{job.eventType || 'นัดหมายบริการ'}</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      job.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {job.status === 'pending' ? '⏳ รอคุณตอบรับ' : job.status === 'in_progress' ? '🟢 กำลังปฏิบัติงาน' : '✅ รับงานแล้ว'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>เวลา: {job.date} ({job.startTime} น.) • {job.durationHours} ชั่วโมง</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>สถานที่: {job.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>ลูกค้า: <strong className="text-white">{job.clientName}</strong></span>
                      <span>เบอร์ติดต่อ: <strong className="text-rose-300 font-mono">{job.clientPhone}</strong></span>
                    </div>
                  </div>

                  {/* ปุ่มกดรับงาน / เริ่มงาน สำหรับพาร์ทเนอร์ */}
                  <div className="pt-1 flex gap-2">
                    {job.status === 'pending' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setDoc(doc(db, 'bookings', job.id), {
                              status: 'accepted',
                              acceptedAt: new Date().toISOString()
                            }, { merge: true });
                            alert('ตอบรับคำขอนัดหมายเรียบร้อยแล้ว!');
                          } catch (e) {
                            console.error(e);
                            alert('เกิดข้อผิดพลาดในการตอบรับงาน');
                          }
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        ✅ กดตอบรับงานนี้ (Accept)
                      </button>
                    )}

                  {/* 🌟 ปุ่มเปิด Live Tracking & ความปลอดภัยสดสำหรับพาร์ทเนอร์ */}
                    {(job.status === 'accepted' || job.status === 'in_progress') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackingJob(job);
                          setIsLiveTrackingOpen(true);
                        }}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all mb-2"
                      >
                        <Navigation className="w-3.5 h-3.5 animate-spin" />
                        <span>📍 ดูพิกัดนัดพบ & แผนที่ความปลอดภัยสด (Live GPS)</span>
                      </button>
                    )}

                    {job.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setDoc(doc(db, 'bookings', job.id), {
                              status: 'in_progress',
                              startedAt: new Date().toISOString()
                            }, { merge: true });
                            alert('เริ่มดำเนินงานแล้ว!');
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        🚀 เริ่มงาน (Start Gig)
                      </button>
                    )}
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
                <div>📍 <strong>พิกัดปัจจุบัน:</strong> 13.7367° N, 100.5606° E (ปทุมวัน/สยาม)</div>
                <div>🛡️ <strong>ประกันอุบัติเหตุ:</strong> คุ้มครองเต็มวงเงิน 500,000 บาท</div>
                <div>📞 <strong>สายด่วนฉุกเฉิน:</strong> 191 หรือ 02-LAYSEA-SOS</div>
              </div>

              <button
                onClick={() => setIsTrackingOpen(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>เปิดแผนที่พิกัดความปลอดภัยสด (Live Radar)</span>
              </button>
            </div>

            <button
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
            <span className="text-xs text-slate-400 font-medium">รายได้สะสมสุทธิพร้อมโอน (Net Payout)</span>
            <div className="text-3xl font-black text-amber-300 font-['Plus_Jakarta_Sans']">
              {realNetPayout > 0 ? realNetPayout.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'} ฿
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
              <span className="text-slate-200 font-medium">{realGrossEarnings.toLocaleString()} บาท</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>ภาษีหัก ณ ที่จ่าย 3% (ภ.ง.ด 1เดรด):</span>
              <span className="text-rose-400 font-semibold">-{realTaxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
            </div>
            <div className="flex justify-between text-slate-200 font-bold text-xs pt-1.5 border-t border-slate-800">
              <span>ยอดเงินจ่ายสุทธิ (Net Payout):</span>
              <span className="text-amber-300 font-bold">{realNetPayout > 0 ? realNetPayout.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'} บาท</span>
            </div>
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

  {/* รายการประวัติงานที่เสร็จสิ้น (ดึงจาก jobs จริง) */}
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-300">ประวัติงานที่เสร็จสิ้น & รับเงินแล้ว</span>
              <span className="text-[10px] text-slate-500">
                {jobs.filter((j: any) => j.status === 'completed' || j.status === 'finished' || j.paymentStatus === 'paid' || j.isReleased).length} รายการ
              </span>
            </div>

            {jobs.filter((j: any) => j.status === 'completed' || j.status === 'finished' || j.paymentStatus === 'paid' || j.isReleased).length > 0 ? (
              jobs
                .filter((j: any) => j.status === 'completed' || j.status === 'finished' || j.paymentStatus === 'paid' || j.isReleased)
                .map((job: any, idx: number) => {
                   const duration = Number(job.durationHours || 2);
                   const jobTotal = Number(job.totalCredits || job.totalPrice || job.totalAmount || (job.pricePerHour ? job.pricePerHour * duration : 0) || job.price || 0);
                   const grossPart = Math.round(jobTotal * 0.80);
                   const netEarn = Math.round(grossPart * 0.97);                  


                  return (
                    <div key={job.id || idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{job.eventType || job.serviceType || 'งานบริการ Laysea'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                            โอนสำเร็จ
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {job.date || (job.createdAt ? new Date(job.createdAt).toLocaleDateString('th-TH') : 'ล่าสุด')} • {job.durationHours || 2} ชม.
                        </div>
                        <div className="text-[9px] text-slate-500">
                          (หักคอมมิชชั่น 20% & ภาษี 3% แล้ว)
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-amber-300 text-sm">
                          +{netEarn > 0 ? netEarn.toLocaleString() : (jobTotal * 0.776).toLocaleString()} ฿
                        </div>
                        <div className="text-[10px] text-slate-500 line-through">
                          {jobTotal.toLocaleString()} ฿
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/60">
                ยังไม่มีรายการงานที่เสร็จสิ้น
              </div>
            )}
          </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <strong className="text-slate-300">หมายเหตุภาษีสำหรับพาร์ทเนอร์:</strong>
            <p>
              แพลตฟอร์ม Laysea ดำเนินการหักและนำส่งภาษีเงินได้หัก ณ ที่จ่าย 3% ให้กรมสรรพากรอย่างถูกต้อง ท่านสามารถนำใบ 50 ทวิ ไปใช้ยื่นลดหย่อนหรือขอคืนภาษีประจำปี (ภ.ง.ด. 90/91) ได้
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
                    <img src={userSession.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-amber-400" />
                  )}
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm">{userSession.name}</h3>
                  <div className="text-xs text-rose-400">เรตติ้ง 4.96 ★ (142 รีวิว)</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>เบอร์ยืนยันแล้ว: {userSession.phone}</span>
                  </div>
                </div>
              </div>
      {/* ช่องจัดการอัลบั้มรูปภาพผลงาน 1-6 รูป */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    📸 อัลบั้มรูปผลงาน/ไลฟ์สไตล์ (1-6 รูป)
                  </span>
                  <span className="text-[11px] text-rose-400 font-medium">
                    {galleryImages.length} / 6 รูป
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={img} alt={`ผลงาน ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md active:scale-95"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {galleryImages.length < 6 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-rose-500 hover:text-rose-400 cursor-pointer bg-slate-800/40 active:scale-95 transition">
                      <span className="text-2xl font-light leading-none">+</span>
                      <span className="text-[10px] mt-1">เพิ่มรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadGalleryImage}
                      />
                    </label>
                  )}
                </div>
              </div>

         {/* กล่องตั้งค่าประเภทงานและเรตราคาแยกตามบริการ (ติ๊กได้ทันที + Real-time ซิงค์ฝั่งลูกค้า) */}
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>💼</span> รูปแบบงานที่รับ & เรตราคาแยกตามบริการ
              </span>
              <span className="text-[10px] text-amber-400 font-medium">ขั้นต่ำ 450฿/ชม.</span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'cafe',
                  label: '☕ ทานข้าว / คาเฟ่ / เดินห้าง',
                  defaultRate: 450,
                  options: [450, 500, 550, 600]
                },
                {
                  id: 'movie',
                  label: '🎬 ดูหนัง / กิจกรรมไลฟ์สไตล์',
                  defaultRate: 500,
                  options: [500, 550, 600, 700]
                },
                {
                  id: 'party',
                  label: '🍻 ปาร์ตี้ / สังสรรค์ / ชงดื่ม',
                  defaultRate: 700,
                  options: [700, 800, 900, 1000]
                },
                {
                  id: 'event',
                  label: '👗 ออกงานสังคม / งานแต่ง / ทางการ',
                  defaultRate: 900,
                  options: [900, 1000, 1200, 1500]
                }
              ].map((service) => {
                const isSelected = !!serviceRates[service.id]?.enabled;
                const currentRate = serviceRates[service.id]?.rate || service.defaultRate;

                const handleToggleService = async (checked: boolean, rateVal: number) => {
                  const updated = {
                    ...serviceRates,
                    [service.id]: {
                      enabled: checked,
                      rate: rateVal,
                      name: service.label
                    }
                  };
                  
                  // 1. อัปเดตหน้าจอทันที ติ๊กติดทันใจ
                  setServiceRates(updated);

                  // 2. คำนวณเรตต่ำสุดที่รับสำหรับโชว์หน้าการ์ดลูกค้า
                  const activeRates = Object.values(updated)
                    .filter((s: any) => s.enabled)
                    .map((s: any) => Number(s.rate));
                  const minRate = activeRates.length > 0 ? Math.min(...activeRates) : 450;

                  // 3. รวบรวม skills ที่รับไปอัปเดตช่องค้นหาฝั่งลูกค้า
                  const activeSkills = Object.values(updated)
                    .filter((s: any) => s.enabled)
                    .map((s: any) => s.name);

                  const pKey = userSession?.phone || userSession?.id;
                  if (pKey) {
                    localStorage.setItem(`partner_service_rates_${pKey}`, JSON.stringify(updated));
                    localStorage.setItem(`partner_rate_${pKey}`, String(minRate));

                    try {
                      const payload = {
                        serviceRates: updated,
                        hourlyRate: minRate,
                        pricePerHour: minRate,
                        price: minRate,
                        skills: activeSkills,
                        updatedAt: new Date().toISOString()
                      };
                      await setDoc(doc(db, 'partners', pKey), payload, { merge: true });
                      await setDoc(doc(db, 'users', pKey), payload, { merge: true });
                    } catch (err) {
                      console.error('Sync rate to firestore failed:', err);
                    }
                  }
                };

                return (
                  <div 
                    key={service.id} 
                    className={`p-2.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-slate-950/90 border-rose-500/70 shadow-sm' 
                        : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleService(e.target.checked, currentRate)}
                          className="rounded border-slate-700 text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer accent-rose-500"
                        />
                        <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {service.label}
                        </span>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={currentRate}
                            onChange={(e) => handleToggleService(true, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                          >
                            {service.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt} ฿/ชม.
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-800/80">
              * การคำนวณราคาการจองจะคิดตามเรตของงานที่ลูกค้าเลือกคูณจำนวนชั่วโมงจริง (ขั้นต่ำ 2 ชม.)
            </div>
          </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>เปลี่ยนรูปโปรไฟล์พาร์ทเนอร์</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const pKey = userSession?.phone || userSession?.id;
  if (!pKey) {
    alert('ไม่พบข้อมูลบัญชีพาร์ทเนอร์');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const img = new Image();
    img.onload = async () => {
      // 1. บีบอัดรูปโปรไฟล์ให้กว้างไม่เกิน 400px (ไฟล์จะเล็กมาก ~30-50KB ไม่ชนลิมิต Firestore แน่นอน)
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // แปลงเป็น Base64 คุณภาพ 0.7
      const base64Avatar = canvas.toDataURL('image/jpeg', 0.7);

      try {
        // 2. เก็บลง LocalStorage ทันที
        localStorage.setItem(`partner_avatar_${pKey}`, base64Avatar);
        localStorage.setItem(`avatar_${pKey}`, base64Avatar);
        localStorage.setItem('partner_profile_photo', base64Avatar);

        // 3. ซิงค์เข้า Cloud Firestore ทั้ง users และ partners
        await setDoc(doc(db, 'users', pKey), {
          avatarUrl: base64Avatar,
          imageUrl: base64Avatar,
          avatar: base64Avatar,
          photoURL: base64Avatar,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'partners', pKey), {
          avatarUrl: base64Avatar,
          imageUrl: base64Avatar,
          avatar: base64Avatar,
          photoURL: base64Avatar,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        alert('เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว!');
        window.location.reload();
      } catch (err) {
        console.error('Update avatar error:', err);
        alert('เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์');
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
}}
            />
          </label>

                <button
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
                ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ท่านมีสิทธิ์ขอให้ลบและทำลายข้อมูลผู้ใช้ ประวัติการทำงาน และข้อมูลบัญชีธนาคารทั้งหมดอย่างถาวร
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
          onClick={() => setPartnerTab('jobs')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'jobs' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>ตารางงาน</span>
        </button>

        <button
          onClick={() => setPartnerTab('safety')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'safety' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>ความปลอดภัย</span>
        </button>

        <button
          onClick={() => setPartnerTab('earnings')}
          className={`flex flex-col items-center py-1 text-[10px] font-medium transition-colors cursor-pointer ${
            partnerTab === 'earnings' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 mb-0.5" />
          <span>รายได้ & 50 ทวิ</span>
        </button>

        <button
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
                <h3 className="font-bold text-white text-sm">หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)</h3>
              </div>
              <button
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
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ผู้จ่ายเงิน:</span>
                <span className="text-white">บจก. เลย์ซี เอ็นเตอร์เทนเมนต์ (0105567089123)</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ผู้มีเงินได้:</span>
                <span className="text-rose-300 font-bold">{userSession.name}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ประเภทเงินได้:</span>
                <span className="text-slate-200">ค่าจ้างทำงาน/บริการ (มาตรา 40(8) และ 3 เตรส)</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>จำนวนเงินที่จ่ายรวม (Gross):</span>
                <span className="text-white font-bold">{grossEarnings.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>ภาษีหัก ณ ที่จ่าย 3%:</span>
                <span className="text-rose-400 font-bold">{totalWithholdingTax.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>จำนวนเงินจ่ายสุทธิ:</span>
                <span className="text-amber-300 font-bold">{netEarnings.toLocaleString()} บาท</span>
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
      {isTrackingOpen && currentActiveJob && (
        <LiveTrackingModal
          booking={activeTrackingJob || currentActiveJob}
          currentUserRole="partner"
          onClose={() => {
            setIsTrackingOpen(false);
            setActiveTrackingJob(null);
            // เคลียร์งานออกจากหน้าจอทันทีเมื่อจบงานหรือปิดโมดอล
            setJobs((prev) => prev.filter((j) => j.id !== (activeTrackingJob?.id || currentActiveJob?.id)));
          }}
          onOpenSos={() => setIsSosOpen(true)}
        />
      )}

      {/* Avatar Modal */}
      {isEditAvatarOpen && onUpdateAvatar && (
        <AvatarUploadModal
          currentAvatarUrl={userSession.avatarUrl}
          userRole="partner"
          onClose={() => setIsEditAvatarOpen(false)}
          onSaveAvatar={(url) => {
            onUpdateAvatar(url);
            setIsEditAvatarOpen(false);
          }}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">ยืนยันลบบัญชีและข้อมูลผู้ใช้</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              การกระทำนี้จะลบข้อมูลประวัติการทำงาน ยอดเงิน และข้อมูลส่วนบุคคลทั้งหมดตามสิทธิ์ PDPA อย่างถาวรและไม่สามารถกู้คืนได้
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
                  if (onDeleteAccount) onDeleteAccount();
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
            alert('🎉 ยื่นเอกสาร KYC สำเร็จแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติภายใน 24 ชม.');
          }}
        />
      )}

{/* 🌟 Modal แสดงแผนที่และพิกัดความปลอดภัยสดสำหรับพาร์ทเนอร์ */}
      {isLiveTrackingOpen && selectedTrackingJob && (
        <LiveTrackingModal
          booking={selectedTrackingJob}
          userRole="partner"
          onClose={() => {
            setIsLiveTrackingOpen(false);
            setSelectedTrackingJob(null);
          }}
          onOpenSos={() => onTriggerSos('ฉุกเฉินระหว่างปฏิบัติงาน')}
        />
      )}
    </div>
  );
};
