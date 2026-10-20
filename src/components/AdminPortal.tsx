import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle2,
  Users,
  AlertTriangle,
  Siren,
  Ban,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  Coins,
  DollarSign,
  Filter,
  Eye,
  LogOut,
  LifeBuoy,
  Scale,
  Lock,
} from 'lucide-react';
import { FinancialTransaction, SosIncident, CustomerSupportTicket, KycApplication, Booking, UserSession } from '../types';
import { LiveTrackingModal } from './LiveTrackingModal';
import { INITIAL_PARTNERS } from '../data/partners';

interface AdminPortalProps {
  onLogout: () => void;
  userSession?: UserSession | null;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout, userSession }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'sheets' | 'safety' | 'support'>('overview');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [kycList, setKycList] = useState<KycApplication[]>([]);
  const [disputedBookings, setDisputedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [monitoringJob, setMonitoringJob] = useState<Booking | null>(null);

  const fetchAdminData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/admin/data`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setIncidents(data.incidents || []);
      setTickets(data.tickets || []);
      setKycList(data.kycList || []);
      setDisputedBookings((data.bookings || []).filter((b: Booking) => b.status === 'disputed' || b.escrowStatus === 'disputed'));
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalGross = transactions.reduce((acc, t) => acc + t.amountBaht, 0);
  const totalPlatformCut = transactions.reduce((acc, t) => acc + t.platformCutBaht, 0);
  const totalPartnerPayout = transactions.reduce((acc, t) => acc + t.partnerCutBaht, 0);
  const totalWithholdingTax = transactions.reduce((acc, t) => acc + (t.withholdingTaxBaht || 0), 0);
  const activeSosCount = incidents.filter((i) => i.status !== 'resolved').length;
  const pendingTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;
  const approvedKycCount = kycList.filter((k) => k.status === 'approved').length;
const pendingKycCount = (kycList || []).filter((k) => k.status === 'pending_review').length;
  const activeDisputesCount = disputedBookings.length;
  const backendUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
  const googleSheetFormula = `=IMPORTDATA("${backendUrl}/api/admin/export/sheets.csv")`;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(googleSheetFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2500);
  };

  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  const handleDownloadAdminCsv = () => {
    const headers = "\uFEFFรหัสรายการ,วันที่,ประเภท,ชื่อลูกค้า,ชื่อพาร์ทเนอร์,ยอดรวม (บาท),หัก ณ ที่จ่าย 3%,สถานะ\n";
    const rows = transactions && transactions.length > 0
      ? transactions.map(t => `${t.id || 'TX'},${t.createdAt ? new Date(t.createdAt).toLocaleDateString('th-TH') : 'วันนี้'},${t.type || 'บริการดูแลสังสรรค์'},${t.clientName || 'ลูกค้า'},${t.partnerName || 'พาร์ทเนอร์'},${t.amountBaht || 0},${t.withholdingTaxBaht || 0},${t.status || 'สำเร็จ'}`).join("\n")
      : "TX-001,18/10/2026,บริการดูแลสังสรรค์ (ฟีลแฟน),คุณสมชาย,พิมพ์ชนก,38400,1152,สำเร็จ\nTX-002,18/10/2026,เพื่อนเที่ยว/คาเฟ่,คุณวิชัย,สายฟ้า,12000,360,สำเร็จ";

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ข้อมูลจากแอดมิน_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleResolveIncident = async (incidentId: string, banClient: boolean) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      await fetch(`${apiUrl}/api/admin/incidents/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          banClient,
          notes: banClient
            ? 'แอดมินประสานงานตำรวจ สน.ทองหล่อ เรียบร้อย และระงับบัญชีลูกค้าถาวร'
            : 'แอดมินยืนยันพาร์ทเนอร์ปลอดภัย คลี่คลายเหตุการณ์แล้ว',
        }),
      });
      showNotice(banClient ? 'ระงับบัญชีลูกค้าและปิดเคสเรียบร้อย!' : 'คลี่คลายเคสฉุกเฉินแล้ว!');
      fetchAdminData();
    } catch {
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  };

  const handleTicketAction = async (ticketId: string, action: 'refund' | 'close', refundAmount = 1000) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      await fetch(`${apiUrl}/api/admin/tickets/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          action,
          refundCredits: action === 'refund' ? refundAmount : 0,
          notes: action === 'refund' ? `อนุมัติคืนเครดิต ${refundAmount} เครดิตเข้ากระเป๋าสำเร็จ` : 'ชี้แจงกฎและปิดเรื่อง',
        }),
      });
      showNotice(action === 'refund' ? `คืนเครดิต ${refundAmount} เครดิตให้ลูกค้าสำเร็จ!` : 'บันทึกแก้ไขปัญหาเรียบร้อย!');
      fetchAdminData();
    } catch {
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  };

  const handleResolveDispute = async (bookingId: string, resolution: 'refund_client' | 'payout_partner') => {
    const defaultNotes = resolution === 'refund_client'
      ? 'แอดมินไกล่เกลี่ยพบว่าพาร์ทเนอร์ไม่ตรงปกหรือผิดเงื่อนไข อนุมัติคืนเงินลูกค้าเต็มจำนวน 100%'
      : 'แอดมินตรวจสอบหลักฐานพบว่าพาร์ทเนอร์ให้บริการครบถ้วน อนุมัติปล่อยเงิน Escrow ให้พาร์ทเนอร์';

    const notes = prompt('โปรดระบุบันทึกคำตัดสินข้อพิพาทของแอดมิน:', defaultNotes);
    if (!notes) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/admin/disputes/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, resolution, notes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(resolution === 'refund_client' ? 'ตัดสินคืนเงินลูกค้าเต็มจำนวนเรียบร้อย!' : 'ตัดสินปล่อยเงิน Escrow ให้พาร์ทเนอร์เรียบร้อย!');
        fetchAdminData();
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการตัดสินข้อพิพาท');
    }
  };

  const handleKycAction = async (kycId: string, action: 'approve' | 'reject') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://laysea-entertain-backend-1.onrender.com';
      await fetch(`${apiUrl}/api/admin/kyc/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kycId,
          action,
        }),
      });
      showNotice(action === 'approve' ? 'อนุมัติพาร์ทเนอร์เรียบร้อย (มอบตรา KYC)' : 'ปฏิเสธใบสมัครเรียบร้อย');
      fetchAdminData();
    } catch {
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Admin Mobile Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-white text-xs sm:text-sm">
                Laysea Admin HQ
              </h2>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-semibold uppercase">
                Super Admin
              </span>
              {userSession?.phone && (
                <span className="text-[9px] bg-purple-900/60 text-purple-200 border border-purple-400/40 px-1.5 py-0.2 rounded font-mono font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-purple-300" />
                  <span>{userSession.phone.replace(/(\d{3})[-]?(\d{3})[-]?(\d{4})/, '$1-***-$3')}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              ระบบศูนย์กลางกำกับความปลอดภัย ไกล่เกลี่ยข้อพิพาท & ภาษี 50 ทวิ
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
          title="ออกจากระบบ"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ออก</span>
        </button>
      </div>

      {/* Floating Action Notice */}
      {actionSuccessNotice && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-1.5 animate-pulse shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div className="grid grid-cols-4 p-1.5 bg-slate-950 border-b border-slate-800 text-[11px] font-medium shrink-0">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`py-1.5 rounded-lg transition-all cursor-pointer ${
            activeAdminTab === 'overview'
              ? 'bg-purple-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          สรุปภาพรวม
        </button>
        <button
          onClick={() => setActiveAdminTab('sheets')}
          className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeAdminTab === 'sheets'
              ? 'bg-purple-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
          <span>Google Sheet</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('safety')}
          className={`py-1.5 rounded-lg transition-all relative cursor-pointer ${
            activeAdminTab === 'safety'
              ? 'bg-purple-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>ความปลอดภัย</span>
          {activeSosCount > 0 && (
            <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          )}
        </button>
        <button
          onClick={() => setActiveAdminTab('support')}
          className={`py-1.5 rounded-lg transition-all relative cursor-pointer ${
            activeAdminTab === 'support'
              ? 'bg-purple-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>ไกล่เกลี่ย & KYC</span>
          {activeDisputesCount + pendingTicketsCount + pendingKycCount > 0 && (
            <span className="ml-1 text-[9px] bg-amber-500 text-slate-950 px-1 rounded-full font-bold">
              {activeDisputesCount + pendingTicketsCount + pendingKycCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: OVERVIEW & FINANCIAL SUMMARY */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" /> ยอดเงินหมุนเวียนรวม
                </span>
                <div className="text-lg font-black text-white font-['Plus_Jakarta_Sans']">
                  ฿{totalGross.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-400">ธุรกรรมสำเร็จ {transactions.length} รายการ</span>
              </div>

              <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-500/40 space-y-1">
                <span className="text-[10px] text-purple-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-400" /> ส่วนแบ่งแพลตฟอร์ม GP (20%)
                </span>
                <div className="text-lg font-black text-purple-300 font-['Plus_Jakarta_Sans']">
                  ฿{totalPlatformCut.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">กำไรสุทธิก่อนหัก VAT 7%</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" /> จ่ายพาร์ทเนอร์สุทธิ (Net Payout)
                </span>
                <div className="text-lg font-black text-amber-300 font-['Plus_Jakarta_Sans']">
                  ฿{totalPartnerPayout.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">โอนเข้าบัญชีพาร์ทเนอร์</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-400" /> ภาษีหัก ณ ที่จ่าย 3% (ม.3 เตรส)
                </span>
                <div className="text-lg font-black text-rose-300 font-['Plus_Jakarta_Sans']">
                  ฿{totalWithholdingTax.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">ออกใบ 50 ทวิ นำส่งสรรพากร</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>สถานะระบบ & ความปลอดภัยภาพรวม</span>
              </h3>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-sm font-bold text-rose-400">{INITIAL_PARTNERS.length + approvedKycCount}</div>
                  <div className="text-[9px] text-slate-400">พาร์ทเนอร์</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-sm font-bold text-red-400">{activeSosCount}</div>
                  <div className="text-[9px] text-slate-400">SOS ฉุกเฉิน</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-sm font-bold text-amber-400">{activeDisputesCount}</div>
                  <div className="text-[9px] text-slate-400">ข้อพิพาท</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-sm font-bold text-purple-400">{pendingKycCount}</div>
                  <div className="text-[9px] text-slate-400">KYC รอตรวจ</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>บันทึกธุรกรรมการเงินล่าสุด (Financial Ledger):</span>
                <span className="text-[10px] text-slate-400">{transactions.length} รายการ</span>
              </div>

              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{tx.notes}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.status === 'escrow_held'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {tx.status === 'completed'
                            ? 'สำเร็จ'
                            : tx.status === 'escrow_held'
                            ? 'พักเงิน Escrow'
                            : 'คืนเงินแล้ว'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ลูกค้า: {tx.clientName} | พาร์ทเนอร์: {tx.partnerName} | {tx.createdAt}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-amber-300">
                        {tx.type === 'refund' ? '-' : '+'}฿{tx.amountBaht.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        GP: ฿{tx.platformCutBaht} | Payout: ฿{tx.partnerCutBaht}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE SHEETS LIVE IMPORT */}
        {activeAdminTab === 'sheets' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 rounded-2xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <FileSpreadsheet className="w-5 h-5" />
                <span>เชื่อมต่อ Google Sheets แบบ Real-time</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                คุณสามารถนำสูตรด้านล่างไปวางในเซลล์ <strong>A1</strong> ของ Google Sheet
                เพื่อดึงข้อมูลรายการรับ-จ่าย ส่วนแบ่งแพลตฟอร์ม ภาษีหัก ณ ที่จ่าย 3% และสถานะ Escrow แบบสดๆ ทันที
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <code className="text-xs text-emerald-300 font-mono break-all select-all">
                  {googleSheetFormula}
                </code>
                <button
                  onClick={handleCopyFormula}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedFormula ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">หรือดาวน์โหลดไฟล์ CSV โดยตรง:</span>
                <button
                  type="button"
                  onClick={handleDownloadAdminCsv}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ดาวน์โหลด CSV (UTF-8 BOM)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY & SOS CENTER */}
        {activeAdminTab === 'safety' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span>มอนิเตอร์ความปลอดภัยงานที่กำลังดำเนินอยู่ (Live Jobs):</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-semibold">Live GPS Active</span>
              </div>

              <button
                onClick={() =>
                  setMonitoringJob({
                    id: 'JOB-891234',
                    clientId: 'USR-CLIENT-01',
                    clientName: 'คุณสมชาย นรินทร์',
                    clientPhone: '089-112-2334',
                    clientPhoneMasked: '089-***-2334',
                    partnerId: 'partner-1',
                    partnerName: 'พิมพ์ชนก (น้องพิมพ์)',
                    partnerImage: INITIAL_PARTNERS[0].imageUrl,
                    eventType: 'ไปงานแต่งงาน / ดูแลในวงสังสรรค์',
                    location: 'โรงแรมสยาม เคมปินสกี้ กรุงเทพฯ',
                    date: '2026-10-18',
                    startTime: '18:00',
                    durationHours: 3,
                    totalAmountBaht: 2400,
                    totalCredits: 2400,
                    status: 'accepted',
                    escrowStatus: 'escrow_held',
                    platformCommissionRate: 0.20,
                    platformCommissionBaht: 480,
                    partnerGrossBaht: 1920,
                    withholdingTaxRate: 0.03,
                    withholdingTaxBaht: 57.6,
                    netPartnerPayoutBaht: 1862.4,
                    createdAt: new Date().toISOString(),
                    safetyCheckinStatus: 'active',
                    etaMinutes: 7,
                    distanceKm: 1.2,
                    meetupStatus: 'heading_to_meetup',
                  })
                }
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📍 เปิดมอนิเตอร์พิกัด GPS นัดพบ & ความปลอดภัยสด</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Siren className="w-4 h-4 text-red-500" />
                <span>รายงานเหตุฉุกเฉินและคุกคาม (SOS Incidents):</span>
              </span>
              <span className="text-[10px] text-slate-400">{incidents.length} เหตุการณ์</span>
            </div>

            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    inc.status === 'resolved'
                      ? 'bg-slate-900 border-slate-800 opacity-90'
                      : 'bg-red-950/40 border-red-500/80 shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{inc.partnerName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            inc.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500 text-white animate-pulse'
                          }`}
                        >
                          {inc.status === 'resolved' ? 'คลี่คลายแล้ว' : '🚨 ฉุกเฉิน ACTIVE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {inc.location} · {inc.timestamp}
                      </p>
                    </div>

                    <div className="text-[10px] text-amber-300 font-mono">
                      GPS: {inc.latitude}, {inc.longitude}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-rose-200">
                    <strong>ข้อความแจ้งเหตุ:</strong> "{inc.message}"
                  </div>

                  {inc.resolutionNotes && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <strong>บันทึกแอดมิน:</strong> {inc.resolutionNotes}
                      {inc.clientBanned && (
                        <span className="text-red-400 font-bold ml-1">(ระงับบัญชีผู้ก่อเหตุแล้ว)</span>
                      )}
                    </div>
                  )}

                  {inc.status !== 'resolved' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-500/30">
                      <button
                        onClick={() => handleResolveIncident(inc.id, true)}
                        className="py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>ระงับบัญชีลูกค้า & จบเคส</span>
                      </button>

                      <button
                        onClick={() => handleResolveIncident(inc.id, false)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ยืนยันความปลอดภัย</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DISPUTE MEDIATION & SUPPORT & KYC */}
        {activeAdminTab === 'support' && (
          <div className="space-y-5">
            {/* 1. DISPUTE RESOLUTION CENTER */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-rose-400" />
                <span>ศูนย์ไกล่เกลี่ยข้อพิพาท (Dispute Resolution Center):</span>
              </span>

              {disputedBookings.length === 0 ? (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <span>ไม่มีข้อพิพาทค้างในระบบ Escrow ปัจจุบัน</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputedBookings.map((b) => (
                    <div key={b.id} className="p-4 bg-red-950/30 border border-red-500/40 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">ข้อพิพาทงาน: {b.id}</span>
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-bold">
                          เงิน Escrow ที่ถูกแช่แข็ง: {b.totalCredits} บาท
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div><strong>ลูกค้า:</strong> {b.clientName} ({b.clientPhone})</div>
                        <div><strong>พาร์ทเนอร์:</strong> {b.partnerName}</div>
                        <div><strong>สาเหตุข้อพิพาท:</strong> "{b.disputeReason || 'ลูกค้าแจ้งว่าพาร์ทเนอร์ไม่มาตามนัดหรือมีพฤติกรรมไม่เหมาะสม'}"</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => handleResolveDispute(b.id, 'refund_client')}
                          className="py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>อนุมัติคืนเงิน 100% ให้ลูกค้า</span>
                        </button>

                        <button
                          onClick={() => handleResolveDispute(b.id, 'payout_partner')}
                          className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>อนุมัติปล่อยเงินให้พาร์ทเนอร์</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Customer Support & Refund Tickets */}
            <div className="space-y-2 pt-2 border-t border-slate-900">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                <span>คำร้องขอความช่วยเหลือทั่วไป (Support Tickets):</span>
              </span>

              <div className="space-y-2.5">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{t.subject}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          t.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {t.status === 'resolved' ? 'ดำเนินการแล้ว' : 'รอดำเนินการ'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>ผู้แจ้ง: {t.reporterName} ({t.reporterType === 'client' ? 'ลูกค้า' : 'พาร์ทเนอร์'})</span>
                      <span>{t.createdAt}</span>
                    </div>

                    {t.status !== 'resolved' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        {t.category === 'refund_request' && (
                          <button
                            onClick={() => handleTicketAction(t.id, 'refund', 1000)}
                            className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>อนุมัติคืน 1,000 เครดิต</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleTicketAction(t.id, 'close')}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                        >
                          ปิดเรื่อง
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. KYC Partner Applications Review */}
            <div className="space-y-2 pt-2 border-t border-slate-900">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>ตรวจสอบใบสมัครพาร์ทเนอร์ (KYC & ประวัติอาชญากรรม):</span>
              </span>

              <div className="space-y-2.5">
                {kycList.map((appItem) => (
                  <div
                    key={appItem.id}
                    className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs">{appItem.fullName} ({appItem.nickname})</h4>
                        <span className="text-[10px] text-slate-400">
                          อายุ {appItem.age} ปี · {appItem.phone} · บัตร: {appItem.idCardNumber}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                          appItem.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : appItem.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {appItem.status === 'approved'
                          ? 'อนุมัติแล้ว'
                          : appItem.status === 'rejected'
                          ? 'ปฏิเสธ'
                          : 'รอตรวจประวัติ'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div><strong>ธนาคาร:</strong> {appItem.bankName} เลขที่ {appItem.bankAccountNumber}</div>
                      <div><strong>สกิล:</strong> {appItem.skills && Array.isArray(appItem.skills) ? appItem.skills.join(', ') : 'ทั่วไป / ดูแลเทคแคร์'}</div>
                      <div className="text-emerald-400 text-[10px]">
                        ✓ ยินยอมส่งตรวจสอบประวัติอาชญากรรม สนง.ตำรวจแห่งชาติ
                      </div>

                      {/* ส่วนดูรูปภาพและเอกสารที่แนบมา */}
                      {(appItem.idCardImage || appItem.portraitImage || appItem.fullBodyImage || appItem.bankBookImage) && (
                        <div className="pt-2 mt-2 border-t border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                            📷 เอกสารที่แนบมา (คลิกเพื่อดูภาพขนาดเต็ม):
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {/* 1. บัตร ปชช */}
                            {appItem.idCardImage ? (
                              <a href={appItem.idCardImage} target="_blank" rel="noreferrer" className="group relative block rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video hover:border-rose-500 transition-all">
                                <img src={appItem.idCardImage} alt="บัตร ปชช." className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white py-0.5">บัตร ปชช.</span>
                              </a>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-[9px] text-slate-500 flex items-center justify-center p-1 text-center">ไม่มีรูปบัตร</div>
                            )}

                            {/* 2. หน้าตรง */}
                            {appItem.portraitImage ? (
                              <a href={appItem.portraitImage} target="_blank" rel="noreferrer" className="group relative block rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video hover:border-rose-500 transition-all">
                                <img src={appItem.portraitImage} alt="รูปหน้าตรง" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white py-0.5">รูปหน้าตรง</span>
                              </a>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-[9px] text-slate-500 flex items-center justify-center p-1 text-center">ไม่มีรูปหน้าตรง</div>
                            )}

                            {/* 3. เต็มตัว */}
                            {appItem.fullBodyImage ? (
                              <a href={appItem.fullBodyImage} target="_blank" rel="noreferrer" className="group relative block rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video hover:border-rose-500 transition-all">
                                <img src={appItem.fullBodyImage} alt="รูปเต็มตัว" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white py-0.5">รูปเต็มตัว</span>
                              </a>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-[9px] text-slate-500 flex items-center justify-center p-1 text-center">ไม่มีรูปเต็มตัว</div>
                            )}

                            {/* 4. หน้าสมุดบัญชี */}
                            {appItem.bankBookImage ? (
                              <a href={appItem.bankBookImage} target="_blank" rel="noreferrer" className="group relative block rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video hover:border-rose-500 transition-all">
                                <img src={appItem.bankBookImage} alt="สมุดบัญชี" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white py-0.5">สมุดบัญชี</span>
                              </a>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-[9px] text-slate-500 flex items-center justify-center p-1 text-center">ไม่มีรูปบัญชี</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {appItem.status === 'pending_review' && (
                      <div className="flex gap-2 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => handleKycAction(appItem.id, 'approve')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          อนุมัติเป็นพาร์ทเนอร์
                        </button>
                        <button
                          onClick={() => handleKycAction(appItem.id, 'reject')}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs cursor-pointer"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {monitoringJob && (
        <LiveTrackingModal
          booking={monitoringJob}
          currentUserRole="admin"
          onClose={() => setMonitoringJob(null)}
          onOpenSos={() => setMonitoringJob(null)}
        />
      )}
    </div>
  );
};