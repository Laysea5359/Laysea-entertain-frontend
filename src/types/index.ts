export type Gender = 'female' | 'male' | 'lgbtq';
export type LgbtqSubtype =
  | 'trans_woman' // ทรานส์วูแมน / สาวสอง
  | 'trans_man'   // ทรานส์แมน
  | 'tomboy'      // ทอม / ทอมเท่
  | 'gay'         // เกย์สายดูแล / หน้าใส
  | 'non_binary'  // นอนไบนารี / เควียร์
  | 'dee'         // ดี้
  | 'bisexual';   // ไบเซ็กชวล

export type UserRole = 'client' | 'partner' | 'admin';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
  avatarUrl?: string;
  credits?: number;
  partnerProfileId?: string;
  kycStatus?: 'verified' | 'pending' | 'unverified';
  gender?: Gender;
  lgbtqSubtype?: LgbtqSubtype;
}

export interface Partner {
  id: string;
  name: string;
  nickname: string;
  gender: Gender;
  lgbtqSubtype?: LgbtqSubtype;
  lgbtqIdentityLabel?: string; // e.g. "ทรานส์วูแมน (Trans Woman)", "ทอมเท่ (Tomboy)"
  specificTraits?: string[]; // e.g. ['สวยหวานหุ่นนางแบบ', 'แต่งตัวเรียบหรู']
  pronouns?: string; // e.g. 'เธอ (She/Her)', 'เขา (He/Him)', 'They/Them'
  stylePresentation?: string; // e.g. 'ลุคคุณหนูหวานสะกดตา', 'บอยคูลสปอร์ตเท่'
  age: number;
  height: number;
  weight: number;
  rating: number;
  reviewsCount: number;
  hourlyRate: number; // in credits/THB
  vdoCallRate: number; // in credits (default 150)
  location: string;
  areas: string[];
  imageUrl: string;
  galleryImages: string[];
  bio: string;
  skills: string[];
  vibeTags: string[];
  personality: string;
  drinkingSkill: 'ไม่ดื่ม' | 'ดื่มเป็นเพื่อน' | 'ชงเก่ง/ปาร์ตี้';
  languages: string[];
  verifiedKyc: boolean;
  criminalCheckPassed: boolean;
  insuranceProtected: boolean;
  isOnline: boolean;
  completedJobs: number;
  availableDays: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isSosAlert?: boolean;
  isViolationWarning?: boolean;
  matchedPartnerIds?: string[];
  recommendedAction?: 'vdo_call' | 'browse' | 'kyc' | 'sos';
}

// Order State Machine Lifecycle
export type OrderStatus =
  | 'created'             // Order initiated, awaiting payment/escrow lock
  | 'matched_pending'     // Payment verified, waiting for partner acceptance (5-min SLA timer)
  | 'accepted'            // Partner accepted gig, contact unmasked, heading to venue
  | 'in_progress'         // On-site with client, live GPS tracking active
  | 'completed'           // Gig finished, client confirmed, escrow released
  | 'reviewed'            // Client submitted rating and review
  | 'cancelled'           // Cancelled with cancellation tier policy applied
  | 'disputed';           // Disputed, frozen escrow in Admin mediation

export type EscrowStatus =
  | 'awaiting_payment'
  | 'escrow_held'
  | 'escrow_released'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientPhoneMasked: string; // Data leak prevention before acceptance
  partnerId: string;
  partnerName: string;
  partnerNickname?: string;
  partnerPhone?: string;
  partnerPhoneMasked?: string;
  partnerImage: string;
  eventType: string;
  location: string;
  locationDetailsMasked?: string; // Masked until accepted
  locationDetailsFull?: string;
  date: string;
  startTime: string;
  durationHours: number;
  totalAmountBaht: number;
  totalCredits: number;

  // Order State Machine
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  disputedAt?: string;

  // Partner Acceptance Timer (5-min SLA)
  acceptExpiresAt?: string;

  // Cancellation & No-Show Record
  cancelledBy?: 'client' | 'partner' | 'admin' | 'system_timeout';
  cancellationReason?: string;
  cancellationFeeClient?: number;
  refundAmountClient?: number;
  partnerCompensation?: number;
  isNoShow?: boolean;

  // Dispute Details
  disputeReason?: string;
  disputeEvidenceUrl?: string;
  disputeStatus?: 'none' | 'pending_admin' | 'mediating' | 'resolved_refund' | 'resolved_payout';
  adminResolutionNotes?: string;

  // Payment & Escrow & Tax Breakdown
  paymentMethod?: 'promptpay_qr' | 'credit_card' | 'credit_balance';
  paymentGatewayTxId?: string;
  paymentWebhookVerified?: boolean;
  platformCommissionRate: number; // 0.20 (20%)
  platformCommissionBaht: number;
  partnerGrossBaht: number;       // 80%
  withholdingTaxRate: number;     // 0.03 (3% หัก ณ ที่จ่าย ม.3 เตรส)
  withholdingTaxBaht: number;
  netPartnerPayoutBaht: number;   // Gross - 3% WHT
  vatAmountBaht?: number;         // 7% VAT on platform commission
  eReceiptNumber?: string;
  withholdingCertNumber?: string; // เลขที่หนังสือรับรอง 50 ทวิ

  // Safety & Live GPS Tracking
  safetyCheckinStatus: 'active' | 'checked_in' | 'sos';
  clientLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  partnerLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  meetupStatus?: 'heading_to_meetup' | 'arrived_at_venue' | 'in_session' | 'completed';
  etaMinutes?: number;
  distanceKm?: number;
  lastGpsPing?: string;

  // Client Review
  rating?: number;
  reviewComment?: string;
}

export interface KycApplication {
  id: string;
  fullName: string;
  nickname: string;
  gender: Gender;
  age: number;
  phone: string;
  lineId: string;
  idCardNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  skills: string[];
  bio: string;
  submittedAt: string;
  consentCriminalCheck: boolean;
  consentInsurancePolicy: boolean;
  status: 'pending_review' | 'interview_scheduled' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface SosIncident {
  id: string;
  partnerName: string;
  location: string;
  latitude: number;
  longitude: number;
  message: string;
  timestamp: string;
  status: 'dispatched' | 'investigating' | 'resolved';
  policeStation?: string;
  suspectClientName?: string;
  clientBanned?: boolean;
  resolutionNotes?: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'booking_fee' | 'vdo_call' | 'top_up' | 'partner_payout' | 'refund';
  amountBaht: number;
  credits: number;
  clientName: string;
  partnerName: string;
  platformCutBaht: number;
  partnerCutBaht: number;
  withholdingTaxBaht?: number;
  status: 'completed' | 'refunded' | 'pending' | 'escrow_held';
  createdAt: string;
  notes: string;
  bookingId?: string;
  eReceiptNumber?: string;
}

export interface CustomerSupportTicket {
  id: string;
  reporterType: 'client' | 'partner';
  reporterName: string;
  category: 'sexual_harassment' | 'refund_request' | 'not_as_pictured' | 'off_platform_warning' | 'other';
  subject: string;
  description: string;
  status: 'open' | 'in_investigation' | 'resolved';
  priority: 'urgent' | 'high' | 'medium';
  createdAt: string;
  resolutionNotes?: string;
  bookingId?: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  type: 'booking_request' | 'booking_accepted' | 'escrow_held' | 'payout' | 'sos' | 'cancellation' | 'dispute';
  bookingId?: string;
  createdAt: string;
  read: boolean;
}
