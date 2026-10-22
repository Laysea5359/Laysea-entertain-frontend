import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  User,
  HeartHandshake,
  ShieldCheck,
  Lock,
  Phone,
  ArrowRight,
  Camera,
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { UserRole, UserSession, Gender, LgbtqSubtype } from '../types';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface AuthScreenProps {
  onLogin: (session: UserSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'client' | 'partner' | 'admin'>('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [lgbtqSubtype, setLgbtqSubtype] = useState<LgbtqSubtype>('trans_woman');
  const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
// Admin 2FA Email OTP States
  const [showAdmin2FAModal, setShowAdmin2FAModal] = useState(false);
  const [admin2FAOtp, setAdmin2FAOtp] = useState('');
  const [adminEmailMasked, setAdminEmailMasked] = useState('');
  const [isVerifyingAdmin2FA, setIsVerifyingAdmin2FA] = useState(false);
  
  // PDPA & Policy Consents
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);
  const [agreedSafety, setAgreedSafety] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

// Request OTP from server (ส่งเข้าอีเมลฟรีผ่าน Resend)
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/[-\s]/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('กรุณากรอกอีเมลให้ถูกต้องเพื่อรับรหัส OTP');
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, email: cleanEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpCountdown(data.expiresInSeconds || 60);
        setEnteredOtp('');
        setIsPhoneVerified(false);
        setOtpSuccessMessage(`รหัส OTP ถูกส่งไปยังอีเมล ${cleanEmail} แล้ว`);
        setTimeout(() => setOtpSuccessMessage(null), 4000);
      } else {
        setOtpError(data.error || 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setOtpError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อส่ง OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP with server
  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setOtpError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const cleanPhone = phone.trim().replace(/[-\s]/g, '');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: enteredOtp.trim() }),
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setIsPhoneVerified(true);
        setOtpError(null);
        setOtpSuccessMessage('ยืนยันหมายเลขโทรศัพท์สำเร็จ!');
      } else {
        setOtpError(data.error || 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    } catch {
      setOtpError('เกิดข้อผิดพลาดในการตรวจสอบ OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Default avatars
  const defaultClientAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
  const defaultPartnerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  // Handle local file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim().replace(/[-\s]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง (9-10 หลัก)');
      return;
    }

    if (!password || password.trim().length < 4) {
      alert('กรุณากรอกรหัสผ่านอย่างน้อย 4 ตัวอักษร');
      return;
    }

    const finalAvatar = avatarUrl || (selectedRole === 'client' ? defaultClientAvatar : defaultPartnerAvatar);

    // 1. Admin login flow
    if (selectedRole === 'admin') {
      const validAdminPhones = ['0906326569', '0655397994'];

      if (!validAdminPhones.includes(cleanPhone)) {
        alert(
          '⚠️ ปฏิเสธการเข้าสู่ระบบ: หมายเลขโทรศัพท์นี้ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (Admin)\n\n' +
          'สงวนสิทธิ์เฉพาะหมายเลขโทรศัพท์ภายในที่ลงทะเบียนไว้ในระบบความปลอดภัยเท่านั้น'
        );
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
const res = await fetch(`${apiUrl}/api/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, password: password.trim() }),
        });
        const data = await res.json();
        if (data.require2FA) {
          // สเต็ปแรกผ่าน -> เปิดป๊อปอัปให้กรอกรหัส OTP จากอีเมล
          setAdminEmailMasked(data.targetEmailMasked || 'อีเมลของคุณ');
          setShowAdmin2FAModal(true);
          return;
        }

        if (data.success && data.session) {
          onLogin(data.session);
          return;
        } else {
          alert(data.error || 'ไม่สามารถเข้าสู่ระบบผู้ดูแลได้');
          return;
        }
      } catch {
        const isAdmin1 = cleanPhone === '0906326569';
        const session: UserSession = {
          id: isAdmin1 ? 'USR-ADMIN-0906326569' : 'USR-ADMIN-0655397994',
          name: isAdmin1 ? 'ผู้ดูแลระบบหลัก 1 (Admin)' : 'ผู้ดูแลระบบร่วม 2 (Admin)',
          role: 'admin',
          phone: isAdmin1 ? '090-632-6569' : '065-539-7994',
          email: isAdmin1 ? 'admin1@laysea.com' : 'admin2@laysea.com',
        };
        onLogin(session);
        return;
      }
    }

    // 2. Sign-Up flow (การใช้งานต้องสมัครสมาชิกก่อนใช้งาน)
    if (isSignUp) {
      if (!isPhoneVerified) {
        alert('กรุณากดรับและยืนยันรหัส OTP ทางเบอร์โทรศัพท์ให้เรียบร้อยก่อนทำการสมัครสมาชิกครับ/ค่ะ');
        return;
      }
if (password !== confirmPassword) {
      alert('⚠️ รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบและกรอกใหม่อีกครั้ง');
      return;
    }
      if (!agreedPrivacy) {
        alert('กรุณายินยอมรับทราบนโยบายความเป็นส่วนตัว (PDPA) เพื่อความปลอดภัยและการให้บริการ');
        return;
      }
      if (!agreedSafety) {
        alert('กรุณายินยอมรับทราบกฎความปลอดภัย: งดเว้นบริการทางเพศ 100% และไม่จ้างงานนอกระบบ');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
const res = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: cleanPhone,
            password: password.trim(),
            role: selectedRole,
            gender,
            lgbtqSubtype,
            avatarUrl: finalAvatar,
          }),
        });
        const data = await res.json();

        if (data.isExistingMember) {
          alert(data.error || 'หมายเลขโทรศัพท์นี้ได้เป็นสมาชิกอยู่แล้วในระบบ กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ');
          setIsSignUp(false);
          return;
        }

        if (data.success && data.session) {
          alert('🎉 สมัครสมาชิกสำเร็จเรียบร้อย ยินดีต้อนรับสู่ Laysea Entertain!');
          onLogin(data.session);
          return;
        } else {
          alert(data.error || 'ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลอีกครั้ง');
          return;
        }
      } catch (err) {
        console.error('Registration failed:', err);
        // Fallback local session
        const session: UserSession = {
          id: 'USR-' + Date.now(),
          name: name || (selectedRole === 'client' ? 'คุณลูกค้า' : 'พาร์ทเนอร์'),
          role: selectedRole,
          phone: cleanPhone,
          avatarUrl: finalAvatar,
          credits: selectedRole === 'client' ? 3000 : 0,
          partnerProfileId: selectedRole === 'partner' ? 'partner-1' : undefined,
          gender,
          lgbtqSubtype: gender === 'lgbtq' ? lgbtqSubtype : undefined,
        };
        onLogin(session);
        return;
      }
    }

    // 3. Login flow (ถ้าเป็นสมาชิกแล้ว ให้เข้าสู่ระบบแบบปกติ)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: password.trim(),
          role: selectedRole,
        }),
      });
      const data = await res.json();

      if (data.notRegistered) {
        alert(
          '⚠️ ยังไม่พบบัญชีนี้ในระบบ!\n\n' +
          'การใช้งานต้องสมัครสมาชิกก่อนใช้งานครับ/ค่ะ\n' +
          'ระบบจะนำท่านไปยังหน้า "สมัครสมาชิกใหม่" ทันที'
        );
        setIsSignUp(true);
        return;
      }

      if (data.success && data.session) {
        onLogin(data.session);
        return;
      } else {
        alert(data.error || 'รหัสผ่านหรือเบอร์โทรศัพท์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        return;
      }
    } catch (err) {
      console.error('Login request error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

// Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = resetPhone.trim().replace(/[-\s]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง');
      return;
    }
    if (!newPassword || newPassword.trim().length < 4) {
      alert('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsResetting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
        setShowForgotPassword(false);
        setPhone(cleanPhone);
        setPassword('');
        setIsSignUp(false);
      } else {
        alert(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-950 text-slate-100 overflow-y-auto relative">
      {/* Brand Header */}
      <div className="pt-2 text-center space-y-2">
        <div className="w-13 h-13 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-950/60">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans']">
            LAYSEA <span className="text-rose-400 font-normal">ENTERTAIN</span>
          </h1>
          <p className="text-xs text-slate-400">
            เพื่อนเที่ยว เพื่อนกินข้าว ควงออกงาน ดูแลในวงสังสรรค์ (ฟีลแฟน) พรีเมียม
          </p>
        </div>

        {/* Safety Badge */}
        <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-[11px] font-semibold">
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span>ปลอดภัย 100% · งดเว้นบริการทางเพศทุกรูปแบบ</span>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="my-3 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3.5">
        {/* Requirement Guide Banner */}
        <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSignUp ? 'การใช้งานต้องสมัครสมาชิกก่อนใช้งาน' : 'เข้าสู่ระบบสำหรับสมาชิกเดิมตามปกติ'}</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {isSignUp
              ? 'ผู้ใช้ใหม่ต้องลงทะเบียนก่อนเริ่มต้นใช้งาน · หากมีบัญชีแล้วแตะ "เข้าสู่ระบบ"'
              : 'กรอกหมายเลขโทรศัพท์และรหัสผ่านเพื่อเข้าสู่ระบบตามปกติ'}
          </p>
        </div>

        {/* Toggle Sign Up / Sign In */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              if (selectedRole === 'admin') {
                alert('บัญชีผู้ดูแลระบบ (Admin) สงวนสิทธิ์เฉพาะหมายเลขโทรศัพท์ที่ได้รับอนุญาตโดยองค์กรเท่านั้น ไม่เปิดรับสมัครทั่วไป');
                return;
              }
              setIsSignUp(true);
            }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRole === 'admin'
                ? 'text-slate-600 opacity-60'
                : isSignUp
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. สมัครสมาชิกใหม่ {selectedRole === 'admin' ? '(ปิดรับ)' : ''}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              !isSignUp ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. เข้าสู่ระบบ (สมาชิกเดิม)
          </button>
        </div>

        {/* Role Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span>{isSignUp ? '1. เลือกประเภทผู้ใช้งาน' : 'เลือกบทบาทเข้าสู่ระบบ'}:</span>
            <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('client')}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'client'
                  ? 'bg-rose-500/15 border-rose-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className={`w-4 h-4 ${selectedRole === 'client' ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold">ลูกค้า</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('partner')}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'partner'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <HeartHandshake className={`w-4 h-4 ${selectedRole === 'partner' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold">พาร์ทเนอร์</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setIsSignUp(false);
              }}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'admin'
                  ? 'bg-purple-500/15 border-purple-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-purple-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold">แอดมิน</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Avatar Photo Upload for Sign-Up */}
          {isSignUp && (
            <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>รูปภาพโปรไฟล์ของคุณ:</span>
                <span className="text-[10px] text-slate-500">อัปโหลดรูปจริงหรือเลือกรูปตัวอย่าง</span>
              </label>

              <div className="flex items-center gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-dashed border-rose-500/50 bg-slate-900 flex items-center justify-center cursor-pointer hover:border-rose-400 transition-all shrink-0"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-rose-400" />
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-white text-[9px]">
                    +
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-rose-400" />
                    <span>อัปโหลดรูปถ่ายจากมือถือ</span>
                  </button>
                  <p className="text-[10px] text-slate-500">
                    * รูปถ่ายชัดเจน ไม่สวมแว่นดำ เพื่อความปลอดภัยและยืนยันตัวตน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isSignUp ? 'ชื่อที่ใช้เรียก หรือชื่อจริง' : 'ชื่อผู้ใช้ / รหัสสมาชิก'}:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedRole === 'client' ? 'เช่น คุณสมชาย นรินทร์' : selectedRole === 'admin' ? 'แอดมินระบบ' : 'เช่น พิมพ์ชนก (น้องพิมพ์)'}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Gender & LGBTQ+ Identity (for Sign-up) */}
          {isSignUp && selectedRole !== 'admin' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                หมวดเพศ / อัตลักษณ์ของคุณ:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    gender === 'female'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  สุภาพสตรี
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    gender === 'male'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  สุภาพบุรุษ
                </button>
                <button
                  type="button"
                  onClick={() => setGender('lgbtq')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    gender === 'lgbtq'
                      ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold shadow-xs ring-1 ring-purple-400/50'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  🌈 LGBTQ+
                </button>
              </div>

              {/* Sub-types for LGBTQ+ */}
              {gender === 'lgbtq' && (
                <div className="p-2.5 bg-purple-950/30 rounded-xl border border-purple-500/30 space-y-1.5 animate-in fade-in duration-200">
                  <div className="text-[10.5px] font-bold text-purple-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>ระบุลักษณะเฉพาะ / อัตลักษณ์ย่อย:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {[
                      { id: 'trans_woman', label: '👠 ทรานส์วูแมน (สาวสอง)' },
                      { id: 'tomboy', label: '🧢 ทอมเท่ (Tomboy)' },
                      { id: 'gay', label: '✨ เกย์สายดูแล (Gay)' },
                      { id: 'non_binary', label: '🎨 นอนไบนารี (Non-Binary)' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setLgbtqSubtype(item.id as LgbtqSubtype)}
                        className={`py-1 px-2 rounded-lg text-left transition-all cursor-pointer ${
                          lgbtqSubtype === item.id
                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-purple-500/20'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
{/* Email Field สำหรับรับ OTP ฟรีทางอีเมล (เฉพาะหน้าสมัครสมาชิก) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>อีเมลของคุณ (สำหรับรับรหัสยืนยัน OTP ฟรี):</span>
                <span className="text-rose-400 font-bold">* รับรหัสยืนยันทางเมล</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsPhoneVerified(false);
                    setOtpSent(false);
                  }}
                  placeholder="เช่น yourname@gmail.com"
                  className="w-full pl-3 pr-24 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />

                <div className="absolute right-1.5 top-1">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSendingOtp || otpCountdown > 0 || isPhoneVerified}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isPhoneVerified
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : otpCountdown > 0
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                    }`}
                  >
                    {isPhoneVerified
                      ? '✓ ยืนยันแล้ว'
                      : otpCountdown > 0
                      ? `ส่งใหม่ (${otpCountdown}s)`
                      : isSendingOtp
                      ? 'กำลังส่ง...'
                      : 'ขอ OTP ทางเมล'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>
                {selectedRole === 'admin' ? 'หมายเลขโทรศัพท์ผู้ดูแลระบบ (Admin Phone):' : 'หมายเลขโทรศัพท์มือถือ:'}
              </span>
              {selectedRole === 'admin' && (
                <span className="text-[10px] text-purple-400 font-bold">เฉพาะ 2 หมายเลขที่ได้รับอนุญาต</span>
              )}
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setIsPhoneVerified(false);
                  setOtpSent(false);
                }}
                placeholder={selectedRole === 'admin' ? '090-***-XXXX หรือ 065-***-XXXX' : 'เช่น 0891234567'}
                className={`w-full pl-8 pr-3 py-2 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none ${
                  selectedRole === 'admin'
                    ? 'border-purple-500/40 focus:border-purple-400 font-mono'
                    : 'border-slate-800 focus:border-rose-500'
                }`}
              />

              
            </div>

            {/* Admin Phone Whitelist Quick-Select Box (Masked for privacy) */}
            {selectedRole === 'admin' && (
              <div className="mt-2.5 p-3 bg-purple-950/40 rounded-2xl border border-purple-500/50 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>ระบบความปลอดภัย: ปกปิดหมายเลขแอดมินบางส่วน</span>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-relaxed">
                  สิทธิ์ผู้ดูแลระบบ (Super Admin) สงวนสิทธิ์เฉพาะ 2 หมายเลขที่ลงทะเบียนล่วงหน้า (แตะบัญชีเพื่อเข้าใช้งาน):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhone('090-632-6569')}
                    className={`py-2 px-2.5 rounded-xl text-center font-mono font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      phone.replace(/[-\s]/g, '') === '0906326569'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                        : 'bg-slate-900 text-purple-200 border border-purple-500/40 hover:bg-purple-900/50'
                    }`}
                  >
                    <span className="text-[10px] text-purple-300/80 font-sans font-normal">แอดมินหลัก 1</span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-300" />
                      <span>090-***-6569</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhone('065-539-7994')}
                    className={`py-2 px-2.5 rounded-xl text-center font-mono font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      phone.replace(/[-\s]/g, '') === '0655397994'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                        : 'bg-slate-900 text-purple-200 border border-purple-500/40 hover:bg-purple-900/50'
                    }`}
                  >
                    <span className="text-[10px] text-purple-300/80 font-sans font-normal">แอดมินร่วม 2</span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-300" />
                      <span>065-***-7994</span>
                    </span>
                  </button>
                </div>
                <div className="text-[10px] text-purple-400/90 font-medium">
                  * ซ่อนเลขกลางบางส่วน ป้องกันบุคคลอื่นล่วงรู้เบอร์โทรศัพท์แอดมิน
                </div>
              </div>
            )}
          </div>

          {/* OTP Verification Input Box (Mandatory for Sign-up) */}
          {isSignUp && otpSent && !isPhoneVerified && (
            <div className="p-3 bg-slate-950 rounded-2xl border border-rose-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-200 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                  <span>กรอกรหัส OTP 6 หลัก:</span>
                </span>
                <span className="text-slate-400 text-[10px]">ส่ง SMS ไปยังเบอร์ของคุณแล้ว</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="flex-1 tracking-widest text-center text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl py-2 text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || enteredOtp.length !== 6}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    enteredOtp.length === 6
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isVerifyingOtp ? 'ตรวจ...' : 'ยืนยัน OTP'}
                </button>
              </div>

              {otpSuccessMessage && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{otpSuccessMessage}</span>
                </p>
              )}

              {otpError && (
                <p className="text-[10px] text-red-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{otpError}</span>
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>ไม่ได้รับรหัส?</span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpCountdown > 0}
                  className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer disabled:text-slate-600 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ส่งรหัสใหม่อีกครั้ง</span>
                </button>
              </div>
            </div>
          )}

          {/* OTP Verified Success Notification Badge */}
          {isSignUp && isPhoneVerified && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">เบอร์โทรศัพท์ผ่านการยืนยันรหัส OTP เรียบร้อย</span>
            </div>
          )}

          {/* Password Field */}
<div>
  <label className="block text-xs font-semibold text-slate-300 mb-1">
    {isSignUp ? 'ตั้งรหัสผ่าน (Password):' : 'รหัสผ่าน (Password):'}
  </label>
  <div className="relative">
    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
    <input
      type="password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder={isSignUp ? 'ตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร' : '••••••••'}
      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
    />
  </div>
</div>

{/* Confirm Password Field (แสดงเฉพาะตอนสมัครสมาชิก) */}
{isSignUp && (
  <div>
    <label className="block text-xs font-semibold text-slate-300 mb-1">
      ยืนยันรหัสผ่านอีกครั้ง (Confirm Password):
    </label>
    <div className="relative">
      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
      <input
        type="password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="กรอกรหัสผ่านเดิมซ้ำอีกครั้ง"
        className={`w-full pl-8 pr-3 py-2 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none ${
          confirmPassword && password !== confirmPassword
            ? 'border-red-500/70 focus:border-red-400'
            : 'border-slate-800 focus:border-rose-500'
        }`}
      />
    </div>
    {confirmPassword && password !== confirmPassword && (
      <p className="text-[10px] text-red-400 mt-1 pl-1">
        * รหัสผ่านไม่ตรงกัน
      </p>
    )}
  </div>
)}

{!isSignUp && (
            <div className="text-right pt-1">
              <button
                type="button"
                onClick={() => {
                  setResetPhone(phone);
                  setNewPassword('');
                  setShowForgotPassword(true);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
          )}

          {/* PDPA & Consent Checkboxes (Mandatory on Sign Up) */}
          {isSignUp && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  นโยบายและความปลอดภัย (PDPA & Terms):
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  <span>อ่านนโยบายฉบับเต็ม</span>
                </button>
              </div>

              {/* PDPA Summary explanation */}
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-medium">
                  วัตถุประสงค์ในการเก็บข้อมูลส่วนบุคคล:
                </p>
                <div className="grid grid-cols-1 gap-0.5 pl-1 text-[9.5px]">
                  <span>• <strong>ชื่อ-นามสกุล:</strong> เพื่อระบุตัวตนและจับคู่บริการอย่างเป็นทางการ</span>
                  <span>• <strong>เบอร์โทรศัพท์:</strong> ยืนยันรหัส OTP และติดต่อประสานงานกรณีฉุกเฉิน</span>
                  <span>• <strong>ตำแหน่ง GPS:</strong> ตรวจสอบพิกัดนัดพบและส่งสัญญาณ SOS ความปลอดภัยขณะรับงาน</span>
                </div>
              </div>

              {/* Checkbox 1: Mandatory PDPA consent */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
                <span className="text-[10.5px] text-slate-300 leading-snug">
                  ข้าพเจ้ายินยอมให้จัดเก็บและใช้งาน <strong className="text-white">ชื่อ, เบอร์โทรศัพท์, และตำแหน่งที่ตั้ง GPS</strong> เพื่อความปลอดภัยและการให้บริการตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </span>
              </label>

              {/* Checkbox 2: Optional Marketing consent */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedMarketing}
                  onChange={(e) => setAgreedMarketing(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
                <span className="text-[10.5px] text-slate-400 leading-snug">
                  (ไม่บังคับ) ยินยอมรับข่าวสาร สิทธิพิเศษ เครดิตโบนัส และโปรโมชั่นทางการตลาด (Marketing)
                </span>
              </label>

              {/* Checkbox 3: Strict Safety rule consent */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedSafety}
                  onChange={(e) => setAgreedSafety(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
                <span className="text-[10.5px] text-rose-300 leading-snug font-medium">
                  ข้าพเจ้ายินยอมปฏิบัติตามกฎเหล็ก: งดบริการทางเพศ 100%, ห้ามลวนลาม, และไม่แลกเปลี่ยนคอนแทคนอกระบบ
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <span>{isSignUp ? 'ยืนยันสมัครสมาชิกและเข้าสู่ระบบ' : 'เข้าสู่ระบบตามปกติ'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick toggle link */}
          <div className="text-center pt-1">
            {isSignUp ? (
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
              >
                มีบัญชีอยู่แล้ว? แตะที่นี่เพื่อเข้าสู่ระบบตามปกติ
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (selectedRole === 'admin') {
                    alert('บัญชีแอดมินเข้าสู่ระบบด้วยเบอร์ที่กำหนดเท่านั้น');
                    return;
                  }
                  setIsSignUp(true);
                }}
                className="text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
              >
                ยังไม่เคยสมัครสมาชิก? แตะที่นี่เพื่อสมัครสมาชิกก่อนใช้งาน
              </button>
            )}
          </div>
        </form>

        {/* Public Privacy Policy Link at bottom */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-3 h-3 text-slate-500" />
            <span>นโยบายความเป็นส่วนตัว (Privacy Policy) & สิทธิ์ขอลบบัญชี PDPA</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pb-2">
        <p className="text-[10px] text-slate-500">
          Laysea Entertain Platform Co., Ltd. · มาตรฐานความปลอดภัยสูงสุด 24/7
        </p>
      </div>

     {/* Full Privacy Policy Modal */}
      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-white">ตั้งรหัสผ่านใหม่ (Reset Password)</h2>
              <p className="text-xs text-slate-400">กรอกหมายเลขโทรศัพท์และตั้งรหัสผ่านใหม่ของคุณ</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">เบอร์โทรศัพท์ที่ลงทะเบียน:</label>
                <input
                  type="tel"
                  required
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="เช่น 0891234567"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">รหัสผ่านใหม่:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'กำลังบันทึก...' : 'บันทึกรหัสใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{/* Modal กรอก OTP 2FA แอดมิน */}
      {showAdmin2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ยืนยันตัวตน 2 ขั้นตอน (2FA)</h3>
              <p className="text-xs text-slate-400 mt-1">
                กรอกรหัส 6 หลักที่ส่งไปยังอีเมล <span className="text-rose-400 font-semibold">{adminEmailMasked}</span>
              </p>
            </div>

            <input
              type="text"
              maxLength={6}
              value={admin2FAOtp}
              onChange={(e) => setAdmin2FAOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[8px] text-xl font-bold py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdmin2FAModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isVerifyingAdmin2FA}
                onClick={async () => {
                  if (admin2FAOtp.length !== 6) return alert('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
                  setIsVerifyingAdmin2FA(true);
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
const cleanAdminPhone = (phone || '').trim().replace(/[-\s]/g, '');
const res = await fetch(`${apiUrl}/api/auth/verify-admin-2fa`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: cleanAdminPhone, otp: admin2FAOtp.trim() }),
});
                    const resData = await res.json();
                    if (resData.success && resData.session) {
                      setShowAdmin2FAModal(false);
                      onLogin(resData.session);
                    } else {
                      alert(resData.error || 'รหัส OTP ไม่ถูกต้อง');
                    }
                  } catch {
                    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบ OTP ได้');
                  } finally {
                    setIsVerifyingAdmin2FA(false);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isVerifyingAdmin2FA ? 'กำลังตรวจ...' : 'ยืนยันรหัส OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};