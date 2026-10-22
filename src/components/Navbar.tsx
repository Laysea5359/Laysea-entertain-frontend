import React from 'react';
import { Shield, Sparkles, Coins, PhoneCall, AlertTriangle, UserCheck, HeartHandshake } from 'lucide-react';

interface NavbarProps {
  userCredits: number;
  onOpenWallet: () => void;
  onOpenKyc: () => void;
  onOpenSos: () => void;
  activeTab: 'catalog' | 'ai-manager' | 'safety' | 'bookings';
  setActiveTab: (tab: 'catalog' | 'ai-manager' | 'safety' | 'bookings') => void;
  partnerView: boolean;
  setPartnerView: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userCredits,
  onOpenWallet,
  onOpenKyc,
  onOpenSos,
  activeTab,
  setActiveTab,
  partnerView,
  setPartnerView,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('catalog')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  LAYSEA <span className="text-rose-400 font-normal">ENTERTAIN</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                  PREMIUM
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                บริการเพื่อนเที่ยว & AI ผู้จัดการความปลอดภัยระดับพรีเมียม
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'catalog'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              ค้นหาพาร์ทเนอร์
            </button>
            <button
              onClick={() => setActiveTab('ai-manager')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'ai-manager'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI ผู้จัดการ & ความปลอดภัย</span>
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'safety'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>กฎเหล็ก & มาตรการ</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'bookings'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              รายการนัดหมาย
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle (Client vs Partner) */}
            <button
              onClick={() => setPartnerView(!partnerView)}
              className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                partnerView
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
              title="สลับมุมมองระบบ"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{partnerView ? 'มุมมองพาร์ทเนอร์' : 'มุมมองลูกค้า'}</span>
            </button>

            {/* Wallet / Credit Balance */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 rounded-lg hover:border-amber-400/50 transition-all text-xs text-amber-200"
            >
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-semibold text-white">{userCredits.toLocaleString()}</span>
              <span className="text-[11px] text-amber-300/80">เครดิต</span>
              <span className="text-amber-400 font-bold ml-1 text-sm">+</span>
            </button>

            {/* KYC Onboarding Button */}
            <button
              onClick={onOpenKyc}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
              <span>สมัครพาร์ทเนอร์</span>
            </button>

            {/* Emergency SOS Panic Button */}
            <button
              onClick={onOpenSos}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-900/40 active:scale-95 animate-subtle-bounce"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS ฉุกเฉิน</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-900 text-xs text-slate-300">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-1 ${activeTab === 'catalog' ? 'text-rose-400 font-semibold' : ''}`}
          >
            ค้นหาพาร์ทเนอร์
          </button>
          <button
            onClick={() => setActiveTab('ai-manager')}
            className={`py-1 ${activeTab === 'ai-manager' ? 'text-rose-400 font-semibold' : ''}`}
          >
            AI ผู้จัดการ
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`py-1 ${activeTab === 'safety' ? 'text-rose-400 font-semibold' : ''}`}
          >
            กฎเหล็กความปลอดภัย
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-1 ${activeTab === 'bookings' ? 'text-rose-400 font-semibold' : ''}`}
          >
            นัดหมาย
          </button>
        </div>
      </div>
    </header>
  );
};
