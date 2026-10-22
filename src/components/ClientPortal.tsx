import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Coins,
  Users,
  Calendar,
  Wallet,
  Bot,
  LogOut,
  Shield,
  Video,
  AlertTriangle,
  Camera,
  User,
  Settings,
  Trash2,
  Lock,
  FileText,
  Phone,
  CheckCircle2,
  X,
  MapPin,
  HeartHandshake,
} from 'lucide-react';
import { Partner, Booking, UserSession } from '../types';
import { PartnerCatalog } from './PartnerCatalog';
import { AiManagerChat } from './AiManagerChat';
import { BookingsList } from './BookingsList';
import { VdoCallModal } from './VdoCallModal';
import { BookingModal } from './BookingModal';
import { WalletModal } from './WalletModal';
import { SosEmergencyModal } from './SosEmergencyModal';
import { LiveTrackingModal } from './LiveTrackingModal';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';


interface ClientPortalProps {
  userSession: UserSession;
  partners: Partner[];
  userCredits: number;
  bookings: Booking[];
  onLogout: () => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onTopUpCredits: (amount: number, label: string) => void;
  onConfirmBooking: (booking: Booking) => void;
  onTriggerSos: (threat: string) => void;
  onUpdateAvatar?: (url: string) => void;
  onDeleteAccount?: () => void;
  onRefreshBookings?: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  userSession,
  partners,
  userCredits,
  bookings,
  onLogout,
  onDeductCredits,
  onTopUpCredits,
  onConfirmBooking,
  onTriggerSos,
  onUpdateAvatar,
  onDeleteAccount,
  onRefreshBookings,
}) => {
  const [clientTab, setClientTab] = useState<'catalog' | 'ai-manager' | 'bookings' | 'wallet' | 'profile'>('catalog');
  const [selectedVdoPartner, setSelectedVdoPartner] = useState<Partner | null>(null);
  const [selectedBookingPartner, setSelectedBookingPartner] = useState<Partner | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
const [selectedGalleryViewImage, setSelectedGalleryViewImage] = useState<string | null>(null);
  const handleDeleteAccountSubmit = () => {
    if (onDeleteAccount) {
      setShowDeleteConfirmModal(false);
      onDeleteAccount();
    }
  };
// 🌟 State และ Effect สำหรับดึงงานนัดหมายจาก Cloud Firestore แบบ Real-time
  const [liveBookings, setLiveBookings] = useState<Booking[]>(bookings || []);

  useEffect(() => {
    const currentClientId = userSession?.id || userSession?.phone;
    if (!currentClientId) return;

    const cleanPhone = String(userSession?.phone || '').replace(/\D/g, '');

    const q = query(
      collection(db, 'bookings'),
      where('clientId', 'in', [
        currentClientId,
        'USR-CLIENT-01',
        cleanPhone,
        String(userSession?.phone || ''),
        String(userSession?.id || '')
      ].filter(Boolean))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });

        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLiveBookings(list);
      },
      (error) => {
        console.warn('Firestore bookings sync error:', error);
      }
    );

    return () => unsubscribe();
  }, [userSession?.id, userSession?.phone]);

// State และฟังก์ชันสำหรับแก้ไขชื่อที่ใช้เรียก (Display Name)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(userSession?.name || '');

  const handleSaveDisplayName = () => {
    if (!editNameVal.trim()) return alert('กรุณาระบุชื่อที่ใช้เรียก');
    if (userSession) {
      userSession.name = editNameVal.trim();
      localStorage.setItem('laysea_user_session', JSON.stringify(userSession));
    }
    setIsEditingName(false);
    alert('อัปเดตชื่อที่ใช้เรียกเรียบร้อยแล้ว!');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile Header for Client */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Avatar Icon with Camera badge */}
          <div
            onClick={() => setIsEditAvatarOpen(true)}
            className="relative w-9 h-9 rounded-xl overflow-hidden border border-rose-500/50 bg-slate-800 flex items-center justify-center cursor-pointer group shrink-0"
            title="แตะเพื่อเปลี่ยนรูปโปรไฟล์ลูกค้า"
          >
            {userSession.avatarUrl ? (
              <img src={userSession.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-3 h-3 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-xs">
              <Camera className="w-2 h-2" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs truncate max-w-[120px]">
                {userSession.name}
              </span>
              <span className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1 py-0.2 rounded font-medium">
                ลูกค้า
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Laysea Entertain Premium
            </p>
          </div>
        </div>

        {/* Right side: Wallet + Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWalletOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-200"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold text-white">{userCredits.toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 font-semibold">+</span>
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Micro Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1 text-rose-300">
          <Shield className="w-3 h-3 text-rose-400" /> งดบริการทางเพศ 100% · VDO Call ตรงปก
        </span>
        <button
          onClick={() => setIsSosOpen(true)}
          className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
        >
          แจ้งเหตุฉุกเฉิน SOS
        </button>
      </div>

      {/* Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {clientTab === 'catalog' && (
          <PartnerCatalog
            partners={partners}
            onSelectVdoCall={(p) => setSelectedVdoPartner(p)}
            onSelectBook={(p) => setSelectedBookingPartner(p)}
            onOpenAiMatching={() => setClientTab('ai-manager')}
          />
        )}

        {clientTab === 'ai-manager' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-rose-300">
                AI ผู้จัดการ & จัดหาสเปคพาร์ทเนอร์
              </span>
              <p className="text-[11px] text-slate-400">
                บอกรูปแบบงาน สเปคที่ชอบ หรือสอบถามวิธีดูตัวผ่าน VDO Call
              </p>
            </div>
            <AiManagerChat
              onOpenVdoCallModal={() => {
                if (partners.length > 0) setSelectedVdoPartner(partners[0]);
              }}
              onBrowsePartners={() => setClientTab('catalog')}
              onOpenSosModal={() => setIsSosOpen(true)}
            />
          </div>
        )}

        {clientTab === 'bookings' && (
          <BookingsList
            bookings={liveBookings}
            onOpenSos={() => setIsSosOpen(true)}
            onBrowsePartners={() => setClientTab('catalog')}
            onOpenLiveTracking={(b) => setTrackingBooking(b)}
            onRefreshBookings={onRefreshBookings}
          />
        )}

        {clientTab === 'wallet' && (
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 rounded-2xl border border-amber-500/40 text-center space-y-2">
              <span className="text-xs text-slate-400">เครดิตคงเหลือในกระเป๋า</span>
              <div className="text-3xl font-black text-amber-300 font-['Plus_Jakarta_Sans']">
                {userCredits.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">
                1 เครดิต = 1 บาท (ไม่มีวันหมดอายุ)
              </p>
              <button
                onClick={() => setIsWalletOpen(true)}
                className="mt-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/30 cursor-pointer"
              >
                + เติมเครดิตทันที
              </button>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h3 className="font-bold text-white">สิทธิพิเศษของการใช้เครดิต:</h3>
              <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                <li>ใช้ VDO Call ดูตัวจริงเพียง 150 เครดิต (ยืนยันตรงปก)</li>
                <li>ชำระเงินปลอดภัย มีประกันอุบัติเหตุคุ้มครองทุกการนัดหมาย</li>
                <li>ขอคืนเครดิตได้หากพาร์ทเนอร์ไม่มาตามเวลานัดหมาย</li>
              </ul>
            </div>
          </div>
        )}

        {/* Profile & Account Settings Tab */}
        {clientTab === 'profile' && (
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsEditAvatarOpen(true)}
                  className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-rose-500/60 bg-slate-800 flex items-center justify-center cursor-pointer group shrink-0"
                >
                  {userSession.avatarUrl ? (
                    <img src={userSession.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                        placeholder="ระบุชื่อที่ต้องการ..."
                      />
                      <button
                        type="button"
                        onClick={handleSaveDisplayName}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-[10px] cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white">{userSession?.name || 'ลูกค้า Laysea'}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameVal(userSession?.name || '');
                          setIsEditingName(true);
                        }}
                        className="text-slate-400 hover:text-amber-400 text-xs p-0.5 cursor-pointer"
                        title="แก้ไขชื่อที่ใช้เรียก"
                      >
                        ✏️
                      </button>
                      <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      สมาชิกพรีเมียม
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>{userSession.phone}</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded ml-1">
                      OTP Verified ✓
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditAvatarOpen(true)}
                    className="mt-1.5 text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" /> เปลี่ยนรูปโปรไฟล์
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & Legal Settings */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white">ความเป็นส่วนตัวและข้อมูลส่วนบุคคล (PDPA)</h3>
              </div>

              <div className="text-[11px] text-slate-400 space-y-2">
                <p>
                  ข้อมูลของคุณได้รับการคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) มีการเข้ารหัสและใช้เพื่อความปลอดภัยในการนัดหมายเท่านั้น
                </p>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-rose-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>เปิดอ่านนโยบายความเป็นส่วนตัว (Privacy Policy) ฉบับเต็ม</span>
                </button>
              </div>
            </div>

            {/* Safety & SOS Quick Trigger */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">ศูนย์ความปลอดภัย & ตรวจสอบประวัติ</h3>
                </div>
                <span className="text-[10px] text-emerald-400">คุ้มครองตลอด 24 ชม.</span>
              </div>
              <p className="text-[11px] text-slate-400">
                พาร์ทเนอร์ทุกคนผ่านการตรวจสอบประวัติอาชญากรรมและมีประกันอุบัติเหตุคุ้มครองทุกภารกิจ
              </p>
              <button
                onClick={() => setIsSosOpen(true)}
                className="w-full py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/40 rounded-xl text-xs text-red-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>จำลองการแจ้งเหตุฉุกเฉิน / SOS Protocol</span>
              </button>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="p-4 bg-red-950/20 rounded-2xl border border-red-500/30 space-y-2.5">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold text-red-300">โซนจัดการบัญชี (Danger Zone)</h3>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-snug">
                หากคุณต้องการยกเลิกการใช้งาน คุณสามารถขอลบบัญชีและทำลายข้อมูลผู้ใช้ทั้งหมด (ชื่อ, เบอร์โทร, พิกัด GPS, ประวัติการใช้งาน) ออกจากระบบอย่างถาวรตามกฎหมาย PDPA
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบบัญชีและข้อมูลผู้ใช้</span>
              </button>
            </div>
          </div>
        )}

      {/* Bottom Mobile Navigation Bar for Client */}
      <div className="grid grid-cols-5 p-2 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-[10px] text-slate-400 shrink-0">
        <button
          onClick={() => setClientTab('catalog')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors cursor-pointer ${
            clientTab === 'catalog' ? 'text-rose-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>พาร์ทเนอร์</span>
        </button>

        <button
          onClick={() => setClientTab('ai-manager')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors cursor-pointer ${
            clientTab === 'ai-manager' ? 'text-rose-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI ผู้จัดการ</span>
        </button>

        <button
          onClick={() => setClientTab('bookings')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors cursor-pointer ${
            clientTab === 'bookings' ? 'text-rose-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>นัดหมาย ({bookings.length})</span>
        </button>

        <button
          onClick={() => setClientTab('wallet')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors cursor-pointer ${
            clientTab === 'wallet' ? 'text-rose-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>กระเป๋าเงิน</span>
        </button>

        <button
          onClick={() => setClientTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors cursor-pointer ${
            clientTab === 'profile' ? 'text-rose-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>โปรไฟล์</span>
        </button>
      </div>

      {/* Modals */}
      {selectedVdoPartner && (
        <VdoCallModal
          partner={selectedVdoPartner}
          userCredits={userCredits}
          onClose={() => setSelectedVdoPartner(null)}
          onDeductCredits={onDeductCredits}
          onProceedToBook={(p) => {
            setSelectedVdoPartner(null);
            setSelectedBookingPartner(p);
          }}
        />
      )}

      {selectedBookingPartner && (
        <BookingModal
          partner={selectedBookingPartner}
          userCredits={userCredits}
          userSession={userSession}
          onClose={() => setSelectedBookingPartner(null)}
          onConfirmBooking={onConfirmBooking}
          onDeductCredits={onDeductCredits}
          onOpenWallet={() => setIsWalletOpen(true)}
        />
      )}

      {isWalletOpen && (
        <WalletModal
          userCredits={userCredits}
          onClose={() => setIsWalletOpen(false)}
          onTopUp={onTopUpCredits}
        />
      )}

      {isSosOpen && (
        <SosEmergencyModal
          onClose={() => setIsSosOpen(false)}
          incidents={[]}
          onTriggerSos={onTriggerSos}
        />
      )}

      {trackingBooking && (
        <LiveTrackingModal
          booking={trackingBooking}
          currentUserRole="client"
          onClose={() => setTrackingBooking(null)}
          onOpenSos={() => {
            setTrackingBooking(null);
            setIsSosOpen(true);
          }}
        />
      )}

      {isEditAvatarOpen && (
        <AvatarUploadModal
          currentAvatarUrl={userSession.avatarUrl}
          userRole="client"
          onClose={() => setIsEditAvatarOpen(false)}
          onSaveAvatar={(url) => {
            if (onUpdateAvatar) onUpdateAvatar(url);
          }}
        />
      )}

      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">ยืนยันการลบบัญชีและข้อมูลผู้ใช้</h3>
              </div>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-[11px] text-red-200 space-y-1">
              <p className="font-bold">⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้!</p>
              <p className="text-slate-300">
                ระบบจะลบข้อมูลชื่อ-นามสกุล, เบอร์โทรศัพท์, ประวัติการจอง, พิกัด GPS, และยอดเครดิตทั้งหมดออกจากฐานข้อมูลอย่างถาวรตามสิทธิ PDPA (Right to Erasure)
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountSubmit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-950/50 cursor-pointer"
              >
                ยืนยันลบบัญชีถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
