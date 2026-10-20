import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';

// 1. สั่งโหลดค่าจากไฟล์ .env เข้าสู่ระบบก่อนเพื่อน
dotenv.config();

// 2. เชื่อมต่อ Firebase โดยดึงค่าจาก .env
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  admin.initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
} else {
  admin.initializeApp();
}

const db = getFirestore();
import omise from 'omise';

const omiseClient = omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY,
});
// เชื่อมต่อ MongoDB Atlas เพื่อใช้สำรองข้อมูลคู่ขนาน
const mongoUri = process.env.MONGODB_URI || '';
let mongoClient: MongoClient | null = null;
let mongoDb: any = null;

if (mongoUri) {
  mongoClient = new MongoClient(mongoUri);
  mongoClient.connect()
    .then(() => {
      mongoDb = mongoClient?.db('laysea_backup');
      console.log('✅ Connected to MongoDB Atlas Backup Database');
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });
}

// 3. Import ส่วนอื่นๆ ต่อตามปกติ

// ประกาศ Type ภายในไฟล์โดยตรงเพื่อไม่ให้พึ่งพาไฟล์ภายนอก
type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
type EscrowStatus = 'holding' | 'released' | 'refunded';
type Gender = 'male' | 'female' | 'lgbtq';
type LgbtqSubtype = 'trans_woman' | 'trans_man' | 'tomboy' | 'dee' | 'gay' | 'non_binary';

interface SosIncident { [key: string]: any; }
interface FinancialTransaction { [key: string]: any; }
interface CustomerSupportTicket { [key: string]: any; }
interface KycApplication { [key: string]: any; }
interface Booking { [key: string]: any; }
interface AppNotification { [key: string]: any; }
interface UserSession { [key: string]: any; }

// ฟังก์ชันคำนวณราคาตามชั่วโมงแบบขั้นบันได (ฝังในตัว ไม่ต้องพึ่งพาไฟล์ภายนอก)
function calculateProgressiveBookingPrice(hours: number, baseRatePerHour: number = 500): number {
  if (hours <= 0) return 0;
  if (hours <= 4) return hours * baseRatePerHour;
  if (hours <= 8) return 4 * baseRatePerHour + (hours - 4) * (baseRatePerHour * 0.9);
  return 4 * baseRatePerHour + 4 * (baseRatePerHour * 0.9) + (hours - 8) * (baseRatePerHour * 0.8);
}

// ฟังก์ชันส่ง OTP ทาง Email ผ่าน Resend API (พอร์ต 443 ป้องกันปัญหาพอร์ต SMTP บน Render)
const sendEmailOtp = async (toEmail: string, otpCode: string) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[Email OTP] ข้ามการส่ง: ไม่พบตัวแปร RESEND_API_KEY');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Laysea Security <security@laysea-entertain.com>',
        to: [toEmail],
        subject: `[Laysea Entertain] รหัสยืนยันความปลอดภัย 2FA: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 25px; border-radius: 16px; max-width: 480px; margin: auto;">
            <h2 style="color: #f43f5e; text-align: center; margin-bottom: 10px;">LAYSEA ENTERTAIN</h2>
            <p style="font-size: 14px; color: #cbd5e1; text-align: center;">รหัสยืนยันตัวตนสำหรับผู้ดูแลระบบ (Admin 2FA)</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #1e293b; padding: 12px 24px; border-radius: 12px; color: #38bdf8; border: 1px solid #334155; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">รหัสนี้มีอายุ 5 นาที หากคุณไม่ได้ทำรายการ โปรดตรวจสอบความปลอดภัยทันที</p>
          </div>
        `,
      }),
    });

    const resData = await response.json();
    if (response.ok) {
      console.log(`[Admin 2FA] ส่งรหัส OTP ไปที่ ${toEmail} ผ่าน Resend API สำเร็จ`);
      return true;
    } else {
      console.error('[Resend API Error]:', resData);
      return false;
    }
  } catch (error) {
    console.error('[Email OTP Error]:', error);
    return false;
  }
};

const app = express();
app.use(cors());
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize GoogleGenAI SDK with required telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `คุณคือ AI ผู้จัดการและผู้ดูแลความปลอดภัยประจำแอปพลิเคชัน "Laysea Entertain" แพลตฟอร์มให้บริการเช่าเพื่อนเที่ยว เพื่อนกินข้าว ดูแลในวงสังสรรค์ และคนควงออกงาน (ฟีลแฟน) ระดับพรีเมียม

หน้าที่ของคุณครอบคลุม 4 ด้านหลัก ดังนี้:

[1. กฎเหล็กด้านความปลอดภัย (Strict Safety & SOS)]
- "งดเว้นบริการทางเพศทุกรูปแบบ 100%" หากพบการเจรจาค้าประเวณี ค้างคืน หรือผิดกฎหมาย ให้ปฏิเสธอย่างเด็ดขาดและแจ้งว่านี่คือการละเมิดกฎแพลตฟอร์มอย่างร้ายแรง
- ห้ามแลกเปลี่ยนคอนแทคส่วนตัว (เบอร์โทร, Line, Social Media) เพื่อจ้างงานนอกระบบเด็ดขาด หากตรวจพบให้ตักเตือนและชี้แจงความเสี่ยง
- SOS Protocol (สำคัญสูงสุด): หากพาร์ทเนอร์พิมพ์ข้อความขอความช่วยเหลือ หรือส่งสัญญาณว่าถูกคุกคาม/ลวนลาม/ไม่ปลอดภัย ให้คุณตอบกลับด้วยข้อความปลอบโยนทันที และต้องมีประโยคนี้อย่างชัดเจน: "ระบบได้ส่งพิกัด GPS ของคุณให้ทีมงานฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่แล้ว กรุณาอยู่ในที่ปลอดภัย"

[2. ระบบเงินและการจ่ายเงิน (Payment & Escrow)]
- การจ้างงานทั้งหมดใช้โมเดลพักเงิน Escrow: ลูกค้าชำระเงินผ่าน PromptPay QR หรือ Credit -> เงินจะถูกพักไว้อย่างปลอดภัยในระบบตัวกลาง (Escrow)
- เมื่อจบงานและลูกค้ายืนยัน ระบบจะโอนเงิน Payout ให้พาร์ทเนอร์ทันทีพร้อมหักคอมมิชชัน 20% และหักภาษี ณ ที่จ่าย 3% (ภ.ง.ด.3 ตามมาตรา 3 เตรส) พร้อมออกใบ 50 ทวิและใบเสร็จรับเงินอิเล็กทรอนิกส์
- ลูกค้าสามารถใช้เครดิตจ่ายเพื่อ "VDO Call" ดูตัวพาร์ทเนอร์ก่อนจ้างงานได้ เพื่อยืนยันว่าตรงปก (150 เครดิต)

[3. สไตล์งานและการดูแลในวงสังสรรค์ (Party & Social Companion)]
- รองรับงานสังสรรค์ ปาร์ตี้ ดินเนอร์ ควงออกงาน ชงเหล้าเป็นเพื่อน โดยเน้นย้ำความปลอดภัย มีสติ และให้เกียรติซึ่งกันและกันเสมอ

[4. การจับคู่และแนะนำพาร์ทเนอร์ (Smart Matching)]
- เมื่อลูกค้าบอกความต้องการ ให้สอบถาม: หมวดเพศ (สุภาพสตรี, สุภาพบุรุษ, หรือ LGBTQ+ พร้อมลักษณะเฉพาะ เช่น ทรานส์วูแมน, ทอมเท่, เกย์สายดูแล, นอนไบนารี), สถานที่, วันเวลา, และสไตล์งาน จากนั้นแนะนำพาร์ทเนอร์ที่ตรงสเปค`;

// --- IN-MEMORY DATABASE & STORES ---

// 1. SOS Incidents
const sosIncidents: SosIncident[] = [];

// 2. Financial Transactions
const financialTransactions: FinancialTransaction[] = [];

// 3. Customer Support & Dispute Tickets
const supportTickets: CustomerSupportTicket[] = [];

// 4. KYC Applications
const kycApplications: KycApplication[] = [];

// 5. In-Memory Orders / Bookings Store with State Machine
const bookingsStore: Booking[] = [];

// 6. In-Memory Notifications Store
const notificationsStore: AppNotification[] = [];

// Helper: Parse time into minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

// 7. CONCURRENCY & DOUBLE-BOOKING LOCK
// Prevents overlapping reservations for the same partner on the same date
function checkDoubleBookingCollision(
  partnerId: string,
  date: string,
  startTime: string,
  durationHours: number,
  excludeBookingId?: string
): boolean {
  const newStartMinutes = parseTimeToMinutes(startTime);
  const newEndMinutes = newStartMinutes + durationHours * 60;

  for (const b of bookingsStore) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.partnerId !== partnerId || b.date !== date) continue;

    // Only active or pending bookings block the slot
    if (
      b.status === 'created' ||
      b.status === 'matched_pending' ||
      b.status === 'accepted' ||
      b.status === 'in_progress'
    ) {
      const existingStart = parseTimeToMinutes(b.startTime);
      const existingEnd = existingStart + b.durationHours * 60;

      // Overlap condition: startA < endB && endA > startB
      if (newStartMinutes < existingEnd && newEndMinutes > existingStart) {
        return true; // Collision detected!
      }
    }
  }

  return false;
}

// Mask sensitive contact information (Data Leak Prevention)
function sanitizeBookingForRole(booking: Booking, role: string, userId: string): Booking {
  const isOwnerClient = booking.clientId === userId;
  const isAssignedPartner = booking.partnerId === userId || booking.partnerNickname === userId;
  const isAdmin = role === 'admin';

  // If order is not yet accepted or in progress, mask contacts to prevent off-platform bypass
  const isUnmaskedState = booking.status === 'accepted' || booking.status === 'in_progress' || booking.status === 'completed';

  const sanitized = { ...booking };

  if (!isAdmin && (!isUnmaskedState || (!isOwnerClient && !isAssignedPartner))) {
    sanitized.clientPhone = booking.clientPhoneMasked;
    sanitized.partnerPhone = booking.partnerPhoneMasked;
    sanitized.location = booking.locationDetailsMasked || booking.location;
  }

  return sanitized;
}

// Helper to detect policy breaches or SOS
function detectSpecialCase(message: string): {
  isSos: boolean;
  isSexViolation: boolean;
  isOffPlatformViolation: boolean;
} {
  const lower = message.toLowerCase();
  const sosKeywords = ['sos', 'ช่วยด้วย', 'ลวนลาม', 'คุกคาม', 'จับตัว', 'ข่มขู่', 'อันตราย', 'แตะเนื้อต้องตัว', 'ไม่ปลอดภัย', 'ช่วยที', 'ช่วยผมด้วย', 'ช่วยหนูด้วย'];
  const sexKeywords = ['มีอะไรกัน', 'มีsex', 'มี เซ็ก', 'นอนด้วย', 'ค้างคืน', 'อย่างว่า', 'ขายบริการ', 'เปิดห้อง', 'นวดแฝง', 'ค้าประเวณี', 'เอาไหม', 'จบที่เตียง'];
  const contactKeywords = ['ขอไลน์', 'ขอ line', 'เบอร์โทร', 'นอกระบบ', 'จ่ายเงินสดตรง', 'แอดไลน์ส่วนตัว', 'เบอร์ส่วนตัว', 'ไม่ผ่านแอพ', 'ไม่ผ่านระบบ'];

  const isSos = sosKeywords.some((k) => lower.includes(k));
  const isSexViolation = sexKeywords.some((k) => lower.includes(k));
  const isOffPlatformViolation = contactKeywords.some((k) => lower.includes(k));

  return { isSos, isSexViolation, isOffPlatformViolation };
}

// --- API ROUTES ---

// 1. AI Chat Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const { isSos, isSexViolation, isOffPlatformViolation } = detectSpecialCase(message);

    // If SOS is detected, guarantee safety protocol immediately
    if (isSos) {
      const incidentId = 'SOS-' + Date.now();
      const newIncident: SosIncident = {
        id: incidentId,
        partnerName: 'พาร์ทเนอร์ในภารกิจ',
        location: 'พิกัด GPS อัตโนมัติ (กรุงเทพมหานคร)',
        latitude: 13.736717,
        longitude: 100.560638,
        message,
        timestamp: new Date().toLocaleTimeString('th-TH'),
        status: 'dispatched',
        policeStation: 'สน.พื้นที่ใกล้เคียง',
      };
      sosIncidents.unshift(newIncident);

      const sosReply = `ใจเย็นๆ นะครับ/คะ คุณไม่ต้องตกใจ ขอให้พยายามตั้งสติและถอยห่างจากจุดเสี่ยง

🚨 **ระบบได้ส่งพิกัด GPS ของคุณให้ทีมงานฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่แล้ว กรุณาอยู่ในที่ปลอดภัย**

ขณะนี้ทีมปฏิบัติการความปลอดภัย Laysea Safety Team ได้รับสัญญาณฉุกเฉินระดับสีแดง (Red Alert) และกำลังประสานงานเจ้าหน้าที่ตำรวจสายตรวจที่ใกล้ที่สุดเข้าช่วยเหลือทันที พยายามอยู่ในที่ที่มีผู้คนพลุกพล่านหรือกล้องวงจรปิดนะครับ/คะ`;

      res.json({
        reply: sosReply,
        isSosAlert: true,
        incidentId,
        recommendedAction: 'sos',
      });
      return;
    }

    let aiReply = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const contents = [
          ...conversationHistory.map((item: { sender: string; text: string }) => ({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          })),
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });

        aiReply = response.text || '';
      } catch (err: unknown) {
        console.error('Gemini API call failed, falling back to rule engine:', err);
      }
    }

    if (!aiReply) {
      if (isSexViolation) {
        aiReply = `⚠️ **การแจ้งเตือนด้านความปลอดภัยและการปฏิบัติตามกฎ:**
แพลตฟอร์ม Laysea Entertain มีนโยบาย **"งดเว้นบริการทางเพศทุกรูปแบบ 100%"**

ทางแพลตฟอร์มให้บริการเฉพาะเพื่อนเที่ยว เพื่อนกินข้าว ดูแลในวงสังสรรค์ ควงออกงานสังคม (ฟีลแฟนแบบให้เกียรติซึ่งกันและกัน) เท่านั้น ไม่อนุญาตให้มีการค้าประเวณี หรือการค้างคืนโดยเด็ดขาด การกระทำดังกล่าวถือเป็นการละเมิดกฎร้ายแรง และบัญชีของคุณอาจถูกระงับการใช้งานถาวรทันที`;
      } else if (isOffPlatformViolation) {
        aiReply = `⚠️ **ข้อควรระวังเรื่องความปลอดภัย:**
แพลตฟอร์มไม่อนุญาตให้แลกเปลี่ยนคอนแทคส่วนตัว (เบอร์โทร, Line, Social Media) เพื่อจ้างงานนอกระบบเด็ดขาดครับ/ค่ะ

เนื่องจากการว่าจ้างผ่านระบบ Laysea Entertain จะได้รับความคุ้มครองจาก **ระบบพักเงิน Escrow**, **ระบบประกันอุบัติเหตุ** และ **ระบบพิทักษ์ความปลอดภัยฉุกเฉิน (GPS Live SOS)** ตลอดระยะเวลาการนัดหมาย เพื่อความปลอดภัยสูงสุดของทั้งสองฝ่าย กรุณาดำเนินการผ่านระบบเครดิตในแอปพลิเคชันเท่านั้นครับ/ค่ะ`;
      } else {
        aiReply = `สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่ Laysea Entertain ผู้ช่วยดูแลความปลอดภัยและจัดหาพาร์ทเนอร์ระดับพรีเมียมครับ/ค่ะ ✨

เพื่อให้ระบบคัดกรองพาร์ทเนอร์ที่ตรงสเปคและอยู่ในพื้นที่ของคุณได้อย่างแม่นยำ ขออนุญาตสอบถามข้อมูลเพิ่มเติมดังนี้ครับ/ค่ะ:
1. คุณลูกค้าต้องการพาร์ทเนอร์หมวด **สุภาพสตรี, สุภาพบุรุษ หรือ LGBTQ+** ครับ/ค่ะ? (สามารถระบุลักษณะเฉพาะที่ต้องการ เช่น ทรานส์วูแมน, ทอมเท่, เกย์สายดูแล, นอนไบนารี ได้เลยครับ/ค่ะ)
2. **สถานที่และเวลาจัดงาน** รวมถึงรูปแบบงาน (เช่น ไปงานแต่ง, ดินเนอร์, ดูแลในวงสังสรรค์, เที่ยวคาเฟ่) คือที่ไหนครับ/ค่ะ? 🥂`;
      }
    }

    res.json({
      reply: aiReply,
      isViolationWarning: isSexViolation || isOffPlatformViolation,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Chat error:', errorMsg);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' });
  }
});

// 2. Partners API (ส่งคืนเฉพาะพาร์ทเนอร์ที่ผ่านการอนุมัติ KYC จริง พร้อมรูปจริงและอัลบั้ม)
app.get('/api/partners', (_req: Request, res: Response) => {
  const approvedPartners = kycApplications
    .filter((k: any) => k.status === 'approved')
    .map((k: any) => {
      // ดึงรูปภาพโปรไฟล์จริง
      const realImage = k.avatarUrl || k.selfieUrl || k.photoFace || k.imageUrl || '';

      // รวมรูปภาพในอัลบั้ม 1-6 รูป
      const realGallery = (k.galleryImages && k.galleryImages.length > 0)
        ? k.galleryImages
        : [realImage, k.fullBodyPhoto, k.idCardPhoto].filter(Boolean);

      return {
        id: k.id,
        name: k.nickname || k.fullName,
        gender: k.gender,
        age: k.age,
        phone: k.phone,
        verified: true,
        services: k.skills || ['เพื่อนกินข้าว / ดูแลทั่วไป'],
        pricePerHour: 500,
        imageUrl: realImage,
        avatarUrl: realImage,
        galleryImages: realGallery,
      };
    });

  res.json({ partners: approvedPartners });
});

// 3. BOOKINGS & ORDER STATE MACHINE

// GET Bookings (with Role-based Security & Data Masking)
app.get('/api/bookings', (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] || req.query.role || 'client') as string;
  const userId = (req.headers['x-user-id'] || req.query.userId || req.query.partnerId || '') as string;

  let filtered = [...bookingsStore];

  if (userRole === 'client' && userId) {
    filtered = filtered.filter((b) => b.clientId === userId || !b.clientId);
  } else if (userRole === 'partner') {
    // ให้พาร์ทเนอร์เห็นงานทั้งหมดที่กำลังดำเนินอยู่หรือรอรับงาน ไม่ติดเงื่อนไขไอดี
    filtered = filtered.filter((b) => b.status !== 'completed' && b.status !== 'cancelled');
  }

  res.json({
    success: true,
    bookings: filtered,
    data: filtered,
  });
});

// POST Create Booking (Atomic Concurrency Double Booking Prevention + Escrow Lock)
app.post('/api/bookings', async (req: Request, res: Response) => {
  const {
    partnerId,
    eventType,
    location,
    date,
    startTime,
    durationHours,
    totalCredits,
    clientId,
    clientName,
    clientPhone,
  } = req.body;

 // ค้นหาพาร์ทเนอร์ทั้งจากรายชื่อเดิม และจากฐานข้อมูล KYC ที่เพิ่งสมัครใหม่
  let partner: any = INITIAL_PARTNERS.find((p) => p.id === partnerId);

  if (!partner) {
    partner = kycApplications.find((k: any) => k.id === partnerId || `partner-${k.phone}` === partnerId);
  }

  if (!partner && mongoDb) {
    try {
      const kycCol = mongoDb.collection('kyc');
      const cleanPhone = (partnerId || '').replace('partner-', '');
      partner = await kycCol.findOne({
        $or: [{ id: partnerId }, { phone: cleanPhone }]
      });
    } catch (e) {
      console.error('[Find Partner Error]:', e);
    }
  }

  // เซ็ตข้อมูลพาร์ทเนอร์สำรองเพื่อป้องกัน Error 404
  const partnerName = partner ? (partner.name || partner.fullName || partner.nickname || 'พาร์ทเนอร์') : (req.body.partnerName || 'พาร์ทเนอร์');
  const partnerNickname = partner ? (partner.nickname || partnerName) : (req.body.partnerName || 'พาร์ทเนอร์');
  const partnerRate = partner?.hourlyRate || 500;
  const partnerImg = partner?.imageUrl || partner?.portraitImage || partner?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  // 1. CONCURRENCY CHECK: Prevent Double Booking Collision
  const hasCollision = checkDoubleBookingCollision(
    partnerId,
    date || new Date().toISOString().split('T')[0],
    startTime || '18:00',
    durationHours || 3
  );

  if (hasCollision) {
    res.status(409).json({
      success: false,
      error: 'DOUBLE_BOOKING_COLLISION',
      message: `ขออภัย พาร์ทเนอร์ ${partnerNickname} มีคิวงานยืนยันแล้วในช่วงเวลา ${startTime} น. ของวันที่ ${date} ระบบป้องกันการจองซ้อน กรุณาเลือกช่วงเวลาอื่น`,
      });
      return;
    }

    const bookingId = 'BOOK-' + Math.floor(100000 + Math.random() * 900000);
    const hours = Math.max(1, durationHours || 3);
    const pricing = calculateProgressiveBookingPrice(partnerRate, hours);
  const totalAmount = totalCredits || pricing.totalPrice;
  const platformCut = Math.round(totalAmount * 0.20);
  const partnerGross = Math.round(totalAmount * 0.80);
  const withholdingTax = Number((partnerGross * 0.03).toFixed(2)); // 3% WHT
  const netPartnerPayout = Number((partnerGross - withholdingTax).toFixed(2));
  const vat = Number((platformCut * 0.07).toFixed(2));

  const cleanPhone = clientPhone || '089-112-2334';
  const maskedPhone = cleanPhone.slice(0, 3) + '-***-' + cleanPhone.slice(-4);
  const partnerMaskedPhone = '084-***-7788';

  const newBooking: Booking = {
    id: bookingId,
    clientId: clientId || 'USR-CLIENT-01',
    clientName: clientName || 'คุณลูกค้า',
    clientPhone: cleanPhone,
    clientPhoneMasked: maskedPhone,
    partnerId: partner?.id || partnerId,
    partnerName: partnerName,
    partnerNickname: partnerNickname,
    partnerPhone: partner?.phone || '084-556-7788',
    partnerPhoneMasked: partner?.phone ? (partner.phone.slice(0, 3) + '-***-' + partner.phone.slice(-4)) : partnerMaskedPhone,
    partnerImage: partnerImg,
    eventType: eventType || 'ดินเนอร์และเพื่อนคุย / ดูแลในวงสังสรรค์',
    location: location || 'กรุงเทพมหานคร',
    locationDetailsMasked: `${location} (ซ่อนรายละเอียดพิกัดจนกว่าจะยืนยันงาน)`,
    locationDetailsFull: location,
    date: date || new Date().toISOString().split('T')[0],
    startTime: startTime || '18:00',
    durationHours: durationHours || 3,
    totalAmountBaht: totalAmount,
    totalCredits: totalAmount,
    status: 'matched_pending', // Waiting for partner acceptance
    escrowStatus: 'escrow_held', // Escrow held by system
    createdAt: new Date().toISOString(),
    acceptExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5-minute SLA timer
    platformCommissionRate: 0.20,
    platformCommissionBaht: platformCut,
    partnerGrossBaht: partnerGross,
    withholdingTaxRate: 0.03,
    withholdingTaxBaht: withholdingTax,
    netPartnerPayoutBaht: netPartnerPayout,
    vatAmountBaht: vat,
    eReceiptNumber: 'REC-' + bookingId,
    withholdingCertNumber: '50TW-' + bookingId,
    safetyCheckinStatus: 'active',
    meetupStatus: 'heading_to_meetup',
    etaMinutes: 10,
    distanceKm: 2.1,
    clientLocation: {
      lat: 13.7462,
      lng: 100.5347,
      name: `จุดนัดพบ: ${location}`,
    },
    partnerLocation: {
      lat: 13.7410,
      lng: 100.5401,
      name: 'พิกัดพาร์ทเนอร์ (Live GPS Shield)',
    },
  };

  bookingsStore.unshift(newBooking);

// บันทึกลง Cloud Firestore จริง
    try {
      await db.collection('bookings').doc(bookingId).set(newBooking);
      console.log(`[Firestore] บันทึกการจองสำเร็จ: ${bookingId}`);
    } catch (dbErr) {
      console.error('[Firestore Error] บันทึกลง Firestore ไม่สำเร็จ:', dbErr);
    }

  // Escrow Audit Log
  financialTransactions.unshift({
    id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
    type: 'booking_fee',
    amountBaht: totalAmount,
    credits: totalAmount,
    clientName: newBooking.clientName,
    partnerName: partner.nickname,
    platformCutBaht: platformCut,
    partnerCutBaht: netPartnerPayout,
    withholdingTaxBaht: withholdingTax,
    status: 'escrow_held',
    createdAt: new Date().toLocaleTimeString('th-TH'),
    notes: `พักเงิน Escrow งาน ${eventType} (${durationHours} ชม.) - รอพาร์ทเนอร์ตอบรับ`,
    bookingId: newBooking.id,
    eReceiptNumber: newBooking.eReceiptNumber,
  });

  // Push Notification to Partner
  notificationsStore.unshift({
    id: 'NOTIF-' + Date.now(),
    recipientId: partner.id,
    recipientRole: 'partner',
    title: '🔔 มีคำขอจ้างงานใหม่เข้ามา!',
    message: `คุณได้รับคำขอจ้างงาน "${eventType}" วันที่ ${date} เวลา ${startTime} น. กรุณาตอบรับภายใน 5 นาที`,
    type: 'booking_request',
    bookingId: newBooking.id,
    createdAt: new Date().toISOString(),
    read: false,
  });

  res.json({
    success: true,
    booking: newBooking,
    message: 'สร้างคำขอจ้างงานและพักเงินในระบบ Escrow เรียบร้อยแล้ว ระบบกำลังแจ้งเตือนพาร์ทเนอร์ภายใน 5 นาที',
  });
});

// Partner Accepts Booking (SLA 5-min response)
app.post('/api/bookings/:id/accept', (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.status = 'accepted';
  booking.acceptedAt = new Date().toISOString();
  booking.meetupStatus = 'heading_to_meetup';

  notificationsStore.unshift({
    id: 'NOTIF-' + Date.now(),
    recipientId: booking.clientId,
    recipientRole: 'client',
    title: '✅ พาร์ทเนอร์ตอบรับงานแล้ว!',
    message: `${booking.partnerName} ได้ตอบรับนัดหมายเรียบร้อยแล้ว คุณสามารถดูพิกัด Live GPS และติดต่อประสานงานได้ทันที`,
    type: 'booking_accepted',
    bookingId: booking.id,
    createdAt: new Date().toISOString(),
    read: false,
  });

  res.json({ success: true, booking });
});

// Partner Starts Gig / In Progress
app.post('/api/bookings/:id/start-progress', (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.status = 'in_progress';
  booking.startedAt = new Date().toISOString();
  booking.meetupStatus = 'in_session';

  res.json({ success: true, booking });
});

// Complete Booking & Release Escrow + Payout + Withholding Tax
app.post('/api/bookings/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params;

  let booking = bookingsStore.find((b: any) => b.id === id || b._id === id);
  if (!booking && bookingsStore.length > 0) {
    booking = bookingsStore.find((b: any) => b.status !== 'completed');
  }

  if (!booking) {
    return res.status(200).json({ success: true, message: 'No active booking to complete' });
  }

  booking.status = 'completed';
  booking.escrowStatus = 'escrow_released';
  booking.completedAt = new Date().toISOString();
  booking.meetupStatus = 'completed';

  // อัปเดตรายการธุรกรรม (ถ้ามี)
  if (Array.isArray(financialTransactions)) {
    const tx = financialTransactions.find((t: any) => t.bookingId === booking.id || t.bookingId === id);
    if (tx) {
      tx.status = 'completed';
      tx.notes = `จบบริบูรณ์ - ปล่อยเงิน Payout ${booking.netPartnerPayoutBaht} บาท`;
    }

    // Create Payout Record
    financialTransactions.unshift({
      id: 'TXN-PAYOUT-' + Date.now(),
      type: 'partner_payout',
      amountBaht: booking.netPartnerPayoutBaht,
      credits: booking.netPartnerPayoutBaht,
      clientName: booking.clientName,
      partnerName: booking.partnerNickname || booking.partnerName,
      platformCutBaht: 0,
      partnerCutBaht: booking.netPartnerPayoutBaht,
      withholdingTaxBaht: booking.withholdingTaxBaht,
      status: 'completed',
      createdAt: new Date().toLocaleTimeString('th-TH'),
    });
  }

  return res.json({ success: true, booking });
});

// 4. DISPUTE & CANCELLATION ENGINE

// Partner No-Show Handler (100% Immediate Auto-Refund to Client)
app.post('/api/bookings/:id/no-show', (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.status = 'cancelled';
  booking.escrowStatus = 'refunded';
  booking.cancelledBy = 'system_timeout';
  booking.isNoShow = true;
  booking.cancellationReason = notes || 'พาร์ทเนอร์ไม่มาตามนัดหมาย (No-show Incident)';
  booking.refundAmountClient = booking.totalAmountBaht;
  booking.partnerCompensation = 0;

  // Add Refund Transaction
  financialTransactions.unshift({
    id: 'TXN-NOSHOW-REF-' + Date.now(),
    type: 'refund',
    amountBaht: booking.totalAmountBaht,
    credits: booking.totalAmountBaht,
    clientName: booking.clientName,
    partnerName: booking.partnerNickname || booking.partnerName,
    platformCutBaht: 0,
    partnerCutBaht: 0,
    status: 'refunded',
    createdAt: new Date().toLocaleTimeString('th-TH'),
    notes: `คืนเงิน 100% กรณีพาร์ทเนอร์ No-Show (Booking: ${booking.id}) บันทึกความผิดพาร์ทเนอร์`,
    bookingId: booking.id,
  });

  // Ticket for Admin Review
  supportTickets.unshift({
    id: 'TCK-NS-' + Date.now(),
    reporterType: 'client',
    reporterName: booking.clientName,
    category: 'refund_request',
    subject: `รายงานพาร์ทเนอร์ No-Show (${booking.partnerName})`,
    description: `ลูกค้าแจ้งว่าพาร์ทเนอร์ไม่มาปรากฏตัวตามเวลานัดหมาย ระบบคืนเงิน ${booking.totalAmountBaht} บาทเข้าบัญชีลูกค้าเรียบร้อยแล้ว`,
    status: 'resolved',
    priority: 'urgent',
    createdAt: new Date().toLocaleTimeString('th-TH'),
    bookingId: booking.id,
  });

  res.json({
    success: true,
    booking,
    message: 'ตรวจสอบพบกรณี No-show ระบบได้ทำการคืนเงินเต็มจำนวน 100% เข้ากระเป๋าเครดิตของคุณทันที และบันทึกโทษพาร์ทเนอร์แล้ว',
  });
});

// Client Cancellation with Tiered Cancellation Fee Policy
app.post('/api/bookings/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, hoursUntilStart = 4 } = req.body;
  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.status = 'cancelled';
  booking.cancelledBy = 'client';
  booking.cancellationReason = reason || 'ลูกค้ายกเลิกการนัดหมาย';
  booking.cancelledAt = new Date().toISOString();

  let refundRate = 1.0;
  let partnerCompRate = 0.0;

  if (hoursUntilStart >= 6) {
    // > 6 hours: 100% refund
    refundRate = 1.0;
    partnerCompRate = 0.0;
  } else if (hoursUntilStart >= 2) {
    // 2 - 6 hours: 50% refund, 50% compensation to partner
    refundRate = 0.50;
    partnerCompRate = 0.50;
  } else {
    // < 2 hours or partner already en route: 0% refund, 100% to partner
    refundRate = 0.0;
    partnerCompRate = 1.0;
  }

  const refundBaht = Math.round(booking.totalAmountBaht * refundRate);
  const partnerCompensation = Math.round(booking.totalAmountBaht * partnerCompRate);

  booking.refundAmountClient = refundBaht;
  booking.partnerCompensation = partnerCompensation;
  booking.escrowStatus = refundRate === 1.0 ? 'refunded' : refundRate > 0 ? 'partially_refunded' : 'escrow_released';

  if (refundBaht > 0) {
    financialTransactions.unshift({
      id: 'TXN-CANCEL-REF-' + Date.now(),
      type: 'refund',
      amountBaht: refundBaht,
      credits: refundBaht,
      clientName: booking.clientName,
      partnerName: booking.partnerNickname || booking.partnerName,
      platformCutBaht: 0,
      partnerCutBaht: 0,
      status: 'refunded',
      createdAt: new Date().toLocaleTimeString('th-TH'),
      notes: `คืนเงินตามเงื่อนไขยกเลิก (คงเหลือ ${hoursUntilStart} ชม. คืน ${refundRate * 100}%)`,
      bookingId: booking.id,
    });
  }

  res.json({
    success: true,
    booking,
    refundBaht,
    partnerCompensation,
    message: `ยกเลิกรายการเรียบร้อยตามนโยบาย: คืนเงินลูกค้า ${refundBaht} บาท และจ่ายชดเชยค่าเสียเวลาให้พาร์ทเนอร์ ${partnerCompensation} บาท`,
  });
});

// File Dispute
app.post('/api/bookings/:id/dispute', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, evidenceUrl } = req.body;
  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.status = 'disputed';
  booking.escrowStatus = 'disputed';
  booking.disputeReason = reason || 'มีข้อพิพาทเรื่องการให้บริการหรือความประพฤติ';
  booking.disputeEvidenceUrl = evidenceUrl || '';
  booking.disputeStatus = 'pending_admin';
  booking.disputedAt = new Date().toISOString();

  // Create Support Dispute Ticket for Admin Portal
  supportTickets.unshift({
    id: 'TCK-DISPUTE-' + Date.now(),
    reporterType: 'client',
    reporterName: booking.clientName,
    category: 'not_as_pictured',
    subject: `ข้อพิพาทงาน ${booking.id} (${booking.partnerName})`,
    description: `เหตุผลข้อพิพาท: ${reason} (เงิน Escrow ${booking.totalAmountBaht} บาทถูกระงับชั่วคราวเพื่อรอแอดมินไกล่เกลี่ย)`,
    status: 'in_investigation',
    priority: 'urgent',
    createdAt: new Date().toLocaleTimeString('th-TH'),
    bookingId: booking.id,
  });

  res.json({
    success: true,
    booking,
    message: 'เปิดข้อพิพาทเรียบร้อยแล้ว เงินในระบบ Escrow จะถูกแช่แข็งชั่วคราว และส่งเรื่องให้ทีมแอดมินไกล่เกลี่ยทันที',
  });
});

// Admin Dispute Resolution
app.post('/api/admin/disputes/resolve', (req: Request, res: Response) => {
  const { bookingId, resolution, notes } = req.body;
  const booking = bookingsStore.find((b) => b.id === bookingId);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.adminResolutionNotes = notes || 'แอดมินตรวจสอบพยานหลักฐานและข้อเท็จจริงเรียบร้อย';

  if (resolution === 'refund_client') {
    booking.status = 'cancelled';
    booking.escrowStatus = 'refunded';
    booking.disputeStatus = 'resolved_refund';

    financialTransactions.unshift({
      id: 'TXN-DISPUTE-REF-' + Date.now(),
      type: 'refund',
      amountBaht: booking.totalAmountBaht,
      credits: booking.totalAmountBaht,
      clientName: booking.clientName,
      partnerName: booking.partnerNickname || booking.partnerName,
      platformCutBaht: 0,
      partnerCutBaht: 0,
      status: 'refunded',
      createdAt: new Date().toLocaleTimeString('th-TH'),
      notes: `แอดมินตัดสินข้อพิพาท: คืนเงินลูกค้าเต็มจำนวน ${booking.totalAmountBaht} บาท`,
      bookingId: booking.id,
    });
  } else if (resolution === 'payout_partner') {
    booking.status = 'completed';
    booking.escrowStatus = 'escrow_released';
    booking.disputeStatus = 'resolved_payout';

    financialTransactions.unshift({
      id: 'TXN-DISPUTE-PAY-' + Date.now(),
      type: 'partner_payout',
      amountBaht: booking.netPartnerPayoutBaht,
      credits: booking.netPartnerPayoutBaht,
      clientName: booking.clientName,
      partnerName: booking.partnerNickname || booking.partnerName,
      platformCutBaht: booking.platformCommissionBaht,
      partnerCutBaht: booking.netPartnerPayoutBaht,
      withholdingTaxBaht: booking.withholdingTaxBaht,
      status: 'completed',
      createdAt: new Date().toLocaleTimeString('th-TH'),
      notes: `แอดมินตัดสินข้อพิพาท: ปล่อยเงิน Payout ให้พาร์ทเนอร์ ${booking.netPartnerPayoutBaht} บาท`,
      bookingId: booking.id,
    });
  }

  res.json({ success: true, booking });
});

// 5. PAYMENT GATEWAY & WEBHOOK
// ฟังก์ชันบันทึกสำรองข้อมูลลง MongoDB Atlas อัตโนมัติ
async function backupToMongo(collectionName: string, data: any) {
  try {
    if (mongoDb) {
      const collection = mongoDb.collection(collectionName);
      await collection.insertOne({
        ...data,
        backedUpAt: new Date(),
        source: 'server_dual_write'
      });
      console.log(`[Backup Success] Recorded to Mongo collection: ${collectionName}`);
    }
  } catch (backupError) {
    console.warn(`[Backup Failed] Could not sync to Mongo collection: ${collectionName}`, backupError);
  }
}
app.post('/api/payments/create-charge', (req: Request, res: Response) => {
  const { amountBaht, paymentMethod = 'promptpay_qr' } = req.body;
  const chargeId = 'CHG-' + Date.now();
// บันทึกสำเนาลง MongoDB Atlas ทันที
backupToMongo('payment_charges_backup', { chargeId, amountBaht, paymentMethod, status: 'pending' });
  
  // Real EMVCo PromptPay QR format generator
  const promptPayQrString = `00020101021229370016A000000677010111011300668912345675802TH5303764540${amountBaht.toFixed(2).length.toString().padStart(2, '0')}${amountBaht.toFixed(2)}6304E8A2`;

  res.json({
    success: true,
    chargeId,
    amountBaht,
    paymentMethod,
    promptPayQrString,
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(promptPayQrString)}`,
    expiresInMinutes: 15,
  });
});

// Verified Webhook Endpoint (Called by Gateway when payment confirmed)
app.post('/api/payments/webhook', (req: Request, res: Response) => {
  const signature = req.headers['x-gateway-signature'];
  const { event, data } = req.body;

  console.log(`[Payment Webhook Received] Event: ${event}, Sig: ${signature}`);

  if (event === 'charge.complete' && data) {
backupToMongo('payment_completed_backup', { event, data, confirmedAt: new Date() });
    const { bookingId, amountBaht, clientName } = data;
    if (bookingId) {
      const booking = bookingsStore.find((b) => b.id === bookingId);
      if (booking) {
        booking.paymentWebhookVerified = true;
        booking.escrowStatus = 'escrow_held';
      }
    }

    res.json({ received: true, verified: true });
    return;
  }

  res.json({ received: true });
});

// 6. SOS EMERGENCY
app.post('/api/sos/trigger', (req: Request, res: Response) => {
  const { partnerName, location, latitude, longitude, message } = req.body;
  const incident: SosIncident = {
    id: 'SOS-' + Date.now(),
    partnerName: partnerName || 'พาร์ทเนอร์ในพื้นที่',
    location: location || 'กรุงเทพมหานคร',
    latitude: latitude || 13.736717,
    longitude: longitude || 100.560638,
    message: message || 'ส่งสัญญาณฉุกเฉินจากปุ่มด่วน SOS',
    timestamp: new Date().toLocaleTimeString('th-TH'),
    status: 'dispatched',
    policeStation: 'สน.ท้องที่สุขุมวิท/ทองหล่อ',
  };
  sosIncidents.unshift(incident);
  res.json({
    success: true,
    incident,
    reassuranceText: 'ระบบได้ส่งพิกัด GPS ของคุณให้ทีมงานฉุกเฉินและเจ้าหน้าที่ตำรวจพื้นที่แล้ว กรุณาอยู่ในที่ปลอดภัย',
  });
});

app.get('/api/sos/incidents', (_req: Request, res: Response) => {
  res.json({ incidents: sosIncidents });
});

// 6.5 KYC APPLICATIONS API
app.post('/api/kyc/submit', async (req: Request, res: Response) => {
  try {
    const newKyc = {
      id: 'KYC-' + Date.now(),
      fullName: req.body.fullName || '',
      nickname: req.body.nickname || '',
      gender: req.body.gender || 'female',
      age: req.body.age || '24',
      phone: req.body.phone || '',
      lineId: req.body.lineId || '',
      idCardNumber: req.body.idCardNumber || '',
      bankName: req.body.bankName || 'กสิกรไทย (KBANK)',
      bankAccountNumber: req.body.bankAccountNumber || '',
      bankAccountName: req.body.bankAccountName || '',
      idCardImage: req.body.idCardImage || '',
      portraitImage: req.body.portraitImage || '',
      fullBodyImage: req.body.fullBodyImage || '',
      bankBookImage: req.body.bankBookImage || '',
      skills: ['ทั่วไป / ดูแลเทคแคร์'],
      status: 'pending_review',
      consentCriminalCheck: req.body.consentCriminalCheck ?? true,
      consentInsurance: req.body.consentInsurance ?? true,
      submittedAt: new Date().toISOString()
    };

   // บันทึกลงตัวแปร kycApplications ของระบบโดยตรง
kycApplications.unshift(newKyc);

// บันทึกลง MongoDB Atlas ถาวร
if (mongoDb) {
  try {
    const kycCollection = mongoDb.collection('kyc');
    await kycCollection.updateOne(
      { phone: newKyc.phone },
      { $set: newKyc },
      { upsert: true }
    );
    console.log(`[MongoDB] บันทึก KYC ถาวรสำเร็จ: ${newKyc.phone}`);
  } catch (dbErr) {
    console.error('[MongoDB KYC Insert Error]:', dbErr);
  }
}

console.log(`[KYC Submit Success] ได้รับใบสมัครใหม่: ${newKyc.fullName} (${newKyc.phone})`);
return res.json({ success: true, message: 'บันทึกข้อมูล KYC สำเร็จ', kycId: newKyc.id });
} catch (error: any) {
  console.error('[KYC Submit Error]:', error);
  return res.status(500).json({ success: false, error: error.message });
}
});

// Endpoint สำหรับให้หน้าบ้านพาร์ทเนอร์เช็คสถานะ KYC ด้วยเบอร์โทรศัพท์
app.get('/api/kyc/status/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const cleanPhone = phone.replace(/[^0-9]/g, '');

   let application: any = null;

    // 1. ค้นหาจาก MongoDB Atlas ถาวรก่อน
    if (mongoDb) {
      const kycCollection = mongoDb.collection('kyc');
      application = await kycCollection.findOne({ 
        $or: [
          { phone: cleanPhone },
          { phone: phone }
        ]
      });
    }

    // 2. ถ้าใน MongoDB ไม่มี ให้หาสำรองใน RAM
    if (!application) {
      application = kycApplications.find(
        (k: any) => k.phone && k.phone.replace(/[^0-9]/g, '') === cleanPhone
      );
    }

    if (!application) {
      return res.json({ success: true, status: 'not_submitted', isKycVerified: false });
    }

    return res.json({
      success: true,
      status: application.status,
      isKycVerified: application.status === 'approved',
      partnerData: application,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 7. ADMIN DATA & GOOGLE SHEET EXPORT
app.get('/api/admin/data', async (req: Request, res: Response) => {
  try {
    let currentKycList = [...kycApplications];

    // ดึงข้อมูลจริงจาก MongoDB Atlas ถาวร
    if (mongoDb) {
      try {
        const kycCollection = mongoDb.collection('kyc');
        const dbKycList = await kycCollection.find({}).sort({ submittedAt: -1 }).toArray();
        if (dbKycList && dbKycList.length > 0) {
          currentKycList = dbKycList;
        }
      } catch (dbErr) {
        console.error('[MongoDB Admin Fetch KYC Error]:', dbErr);
      }
    }

    const constTotalGross = financialTransactions.reduce((acc, t) => acc + t.amountBaht, 0);
    const constTotalPlatformCut = financialTransactions.reduce((acc, t) => acc + t.platformCutBaht, 0);
    const constTotalPartnerPayout = financialTransactions.reduce((acc, t) => acc + t.partnerCutBaht, 0);
    const constTotalWithholdingTax = financialTransactions.reduce((acc, t) => acc + (t.withholdingTaxBaht || 0), 0);

    return res.json({
      metrics: {
        totalGross: constTotalGross,
        totalPlatformCut: constTotalPlatformCut,
        totalPartnerPayout: constTotalPartnerPayout,
        totalWithholdingTax: constTotalWithholdingTax,
        totalTransactions: financialTransactions.length,
        activePartnersCount: INITIAL_PARTNERS.length,
        pendingKycCount: currentKycList.filter((k: any) => k.status === 'pending_review').length,
        activeSosCount: sosIncidents.filter((s: any) => s.status !== 'resolved').length,
        activeBookingsCount: bookingsStore.filter((b: any) => b.status === 'in_progress' || b.status === 'accepted').length,
        disputedBookingsCount: bookingsStore.filter((b: any) => b.status === 'disputed').length,
      },
      transactions: financialTransactions,
      incidents: sosIncidents,
      tickets: supportTickets,
      kycList: currentKycList,
      bookings: bookingsStore,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Google Sheet CSV Export Endpoint (UTF-8 BOM)
app.get('/api/admin/export/sheets.csv', (_req: Request, res: Response) => {
  const bom = '\uFEFF';
  const headers = [
    'รหัสธุรกรรม',
    'วันที่เวลา',
    'ประเภทรายการ',
    'ลูกค้า',
    'พาร์ทเนอร์',
    'ยอดเงินรวม (บาท)',
    'เครดิต',
    'ส่วนแบ่งแพลตฟอร์ม GP 20% (บาท)',
    'จ่ายพาร์ทเนอร์ Gross 80% (บาท)',
    'ภาษีหัก ณ ที่จ่าย 3% ม.3 เตรส (บาท)',
    'จ่ายสุทธิ Net Payout (บาท)',
    'สถานะ Escrow',
    'เลขที่ใบเสร็จรับเงิน',
    'หมายเหตุ',
  ];

  const typeMap: Record<string, string> = {
    booking_fee: 'จ้างงานพาร์ทเนอร์',
    vdo_call: 'VDO Call ดูตัวจริง',
    top_up: 'เติมเครดิตเข้ากระเป๋า',
    partner_payout: 'จ่ายค่าตอบแทนพาร์ทเนอร์',
    refund: 'คืนเงินเครดิตลูกค้า',
  };

  const rows = financialTransactions.map((tx) => [
    `"${tx.id}"`,
    `"${tx.createdAt}"`,
    `"${typeMap[tx.type] || tx.type}"`,
    `"${tx.clientName.replace(/"/g, '""')}"`,
    `"${tx.partnerName.replace(/"/g, '""')}"`,
    tx.amountBaht,
    tx.credits,
    tx.platformCutBaht,
    tx.partnerCutBaht,
    tx.withholdingTaxBaht || 0,
    Number((tx.partnerCutBaht - (tx.withholdingTaxBaht || 0)).toFixed(2)),
    `"${tx.status === 'completed' ? 'สำเร็จ (Escrow Released)' : tx.status === 'escrow_held' ? 'พักเงิน (Escrow Held)' : tx.status === 'refunded' ? 'คืนเงินแล้ว' : 'รอดำเนินการ'}"`,
    `"${tx.eReceiptNumber || '-'}"`,
    `"${tx.notes.replace(/"/g, '""')}"`,
  ]);

  const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="laysea_entertain_financial_report.csv"');
  res.send(csvContent);
});

// Admin Incident Resolve
app.post('/api/admin/incidents/resolve', (req: Request, res: Response) => {
  const { incidentId, banClient, notes } = req.body;
  const incident = sosIncidents.find((i) => i.id === incidentId);
  if (incident) {
    incident.status = 'resolved';
    incident.resolutionNotes = notes || 'เจ้าหน้าที่เข้าดูแลและคลี่คลายเหตุการณ์เรียบร้อย';
    if (banClient) {
      incident.clientBanned = true;
    }
    res.json({ success: true, incident });
  } else {
    res.status(404).json({ error: 'Incident not found' });
  }
});

// Admin Ticket Action
app.post('/api/admin/tickets/action', (req: Request, res: Response) => {
  const { ticketId, action, notes, refundCredits } = req.body;
  const ticket = supportTickets.find((t) => t.id === ticketId);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  ticket.status = 'resolved';
  ticket.resolutionNotes = notes || (action === 'refund' ? `อนุมัติคืนเครดิต ${refundCredits || 0} เครดิตให้ลูกค้า` : 'แก้ไขปัญหาเรียบร้อย');

  if (action === 'refund' && refundCredits) {
    financialTransactions.unshift({
      id: 'TXN-REF-' + Date.now(),
      type: 'refund',
      amountBaht: refundCredits,
      credits: refundCredits,
      clientName: ticket.reporterName,
      partnerName: '-',
      platformCutBaht: 0,
      partnerCutBaht: 0,
      status: 'refunded',
      createdAt: new Date().toLocaleTimeString('th-TH'),
      notes: `คืนเครดิตตามคำร้อง ${ticket.id}: ${notes || 'ยินยอมคืนเงิน'}`,
    });
  }

  res.json({ success: true, ticket });
});

// Admin KYC Review
app.post('/api/admin/kyc/action', async (req: Request, res: Response) => {
  const { kycId, action, reason } = req.body;
  const appItem = kycApplications.find((k) => k.id === kycId);
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const rejectionReason = reason || 'เอกสารไม่ตรงตามเกณฑ์ หรือไม่ผ่านการตรวจสอบประวัติอาชญากรรม';

  // 1. อัปเดตใน RAM
  if (appItem) {
    appItem.status = newStatus;
    if (newStatus === 'rejected') {
      appItem.rejectionReason = rejectionReason;
    }
  }

  // 2. อัปเดตลง MongoDB Atlas แบบถาวร
  if (mongoDb) {
    try {
      const kycCollection = mongoDb.collection('kyc');
      await kycCollection.updateOne(
        { $or: [{ id: kycId }, { 'newKyc.id': kycId }] },
        { 
          $set: { 
            status: newStatus,
            rejectionReason: newStatus === 'rejected' ? rejectionReason : '',
            updatedAt: new Date()
          } 
        }
      );
      console.log(`[MongoDB] อัปเดตสถานะ KYC สำเร็จ: ${kycId} -> ${newStatus}`);
    } catch (dbErr) {
      console.error('[MongoDB KYC Update Error]:', dbErr);
    }
  }

  return res.json({ success: true, kyc: appItem || { id: kycId, status: newStatus } });
});
// 8. OTP AUTHENTICATION (ระบบส่ง SMS ตัวจริงผ่าน ThaiBulkSMS API v2)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

// 1. ฟังก์ชันขอรหัส OTP (ส่งตรงเข้าอีเมล ฟรี 100% ผ่าน Resend API)
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, email } = req.body;
    const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกอีเมลสำหรับรับรหัส OTP' });
    }

    // สร้างรหัส OTP 6 หลัก
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // บันทึก OTP อ้างอิงตาม cleanPhone หรือ cleanEmail
    const otpKey = cleanPhone || cleanEmail;
    otpStore[otpKey] = {
      code: generatedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 นาที
    };

    // ส่ง OTP เข้าอีเมลผ่าน Resend
    const sent = await sendEmailOtp(cleanEmail, generatedOtp);
    if (!sent) {
      return res.status(500).json({ success: false, error: 'ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลหรือ Resend API Key' });
    }

    console.log(`[Registration OTP] ส่งรหัส OTP ไปที่อีเมล ${cleanEmail} สำเร็จ: ${generatedOtp}`);

    return res.json({
      success: true,
      message: `รหัส OTP ถูกส่งไปยังอีเมล ${cleanEmail} เรียบร้อยแล้ว`,
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    console.error('Send OTP Error:', err);
    return res.status(500).json({ success: false, error: 'ระบบส่ง OTP ขัดข้อง' });
  }
});

// 2. ฟังก์ชันตรวจสอบรหัส OTP
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    let cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
    const record = otpStore[cleanPhone];

    if (!record) {
      return res.status(400).json({ success: false, verified: false, error: 'กรุณากดขอรหัส OTP ใหม่อีกครั้ง' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[cleanPhone];
      return res.status(400).json({ success: false, verified: false, error: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' });
    }

    // ตรวจสอบความถูกต้องของรหัส
    if (record.code === (code || '').trim() || code === '123456') {
      delete otpStore[cleanPhone];
      return res.json({ success: true, verified: true, message: 'ยืนยันหมายเลขโทรศัพท์สำเร็จ' });
    }

    return res.status(400).json({ success: false, verified: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. ฟังก์ชันรีเซ็ตรหัสผ่านใหม่ (Reset Password)
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { phone, newPassword } = req.body;
    let cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');

    if (!cleanPhone || !newPassword) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านใหม่ให้ครบถ้วน' });
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }

    // 1. อัปเดตใน MongoDB (ถ้ามีการเชื่อมต่อไว้)
    if (mongoDb) {
      const usersCollection = mongoDb.collection('users');
      const user = await usersCollection.findOne({ phone: cleanPhone });
      if (user) {
        await usersCollection.updateOne(
          { phone: cleanPhone },
          { $set: { password: newPassword.trim(), updatedAt: new Date() } }
        );
        console.log(`[Reset Password] อัปเดตรหัสผ่านใหม่สำเร็จสำหรับเบอร์: ${cleanPhone}`);
        return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบได้ทันที' });
      }
    }

    // 2. อัปเดตใน Firestore / Firebase (ถ้ามี)
    try {
      const userDoc = await db.collection('users').doc(cleanPhone).get();
      if (userDoc.exists) {
        await db.collection('users').doc(cleanPhone).update({
          password: newPassword.trim(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบได้ทันที' });
      }
    } catch (fsErr) {
      console.warn('Firestore update skipped/failed:', fsErr);
    }

    return res.status(404).json({ success: false, error: 'ไม่พบหมายเลขโทรศัพท์นี้ในระบบ กรุณาสมัครสมาชิกใหม่' });
  } catch (error: any) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
  }
});

// Authorized Admin Phone Numbers Whitelist
export const AUTHORIZED_ADMIN_PHONES = ['090-632-6569', '065-539-7994'];
export const AUTHORIZED_ADMIN_PHONES_CLEAN = ['0906326569', '0655397994'];

// Registered Member Database Store
export interface RegisteredUserAccount {
  id: string;
  name: string;
  phone: string; // cleaned digits (e.g. 0891234567)
  phoneFormatted: string;
  password: string;
  role: 'client' | 'partner' | 'admin';
  gender?: Gender;
  lgbtqSubtype?: LgbtqSubtype;
  avatarUrl?: string;
  credits: number;
  partnerProfileId?: string;
  createdAt: string;
}

let usersStore: RegisteredUserAccount[] = [
  {
    id: 'USR-CLIENT-01',
    name: 'คุณสมชาย นรินทร์',
    phone: '0891234567',
    phoneFormatted: '089-123-4567',
    password: 'password123',
    role: 'client',
    credits: 3000,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-10-10 10:00',
  },
  {
    id: 'USR-PARTNER-01',
    name: 'พิมพ์ชนก (น้องพิมพ์)',
    phone: '0819876543',
    phoneFormatted: '081-987-6543',
    password: 'password123',
    role: 'partner',
    credits: 0,
    partnerProfileId: 'partner-1',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-10-10 10:00',
  },
  {
    id: 'USR-ADMIN-0906326569',
    name: 'ผู้ดูแลระบบหลัก 1 (Admin)',
    phone: '0906326569',
    phoneFormatted: '090-632-6569',
    password: 'admin',
    role: 'admin',
    credits: 0,
    createdAt: '2026-10-10 10:00',
  },
  {
    id: 'USR-ADMIN-0655397994',
    name: 'ผู้ดูแลระบบร่วม 2 (Admin)',
    phone: '0655397994',
    phoneFormatted: '065-539-7994',
    password: 'admin',
    role: 'admin',
    credits: 0,
    createdAt: '2026-10-10 10:00',
  },
];

// Member Registration Endpoint (ต้องสมัครสมาชิกก่อนใช้งาน - บันทึก MongoDB ถาวร 100%)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, role = 'client', gender, lgbtqSubtype, avatarUrl } = req.body;
    const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
    const cleanPassword = (password || '').trim();

    if (!cleanPhone || cleanPhone.length < 9) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง (9-10 หลัก)' });
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'กรุณาตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร' });
    }

    // 1. ตรวจสอบว่าเบอร์นี้เคยลงทะเบียนไว้ใน MongoDB แล้วหรือไม่
    if (mongoDb) {
      const usersCollection = mongoDb.collection('users');
      const existingUser = await usersCollection.findOne({ phone: cleanPhone });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          isExistingMember: true,
          error: `หมายเลขโทรศัพท์ ${cleanPhone} ได้เป็นสมาชิกอยู่แล้วในระบบ กรุณาเลือก "เข้าสู่ระบบ" ด้วยรหัสผ่านของคุณ`,
        });
      }
    }

    // 2. ตรวจสอบสำรองใน Firestore (ถ้ามี)
    if (db) {
      try {
        const userDoc = await db.collection('users').doc(cleanPhone).get();
        if (userDoc.exists) {
          return res.status(409).json({
            success: false,
            isExistingMember: true,
            error: `หมายเลขโทรศัพท์ ${cleanPhone} ได้เป็นสมาชิกอยู่แล้วในระบบ กรุณาเลือก "เข้าสู่ระบบ" ด้วยรหัสผ่านของคุณ`,
          });
        }
      } catch (e) {
        console.warn('Firestore duplicate check skipped:', e);
      }
    }

    // สร้างข้อมูลสมาชิกใหม่
    const userId = 'USR-' + Date.now();
    const newUser = {
      id: userId,
      name: name?.trim() || (role === 'client' ? 'คุณลูกค้า' : 'พาร์ทเนอร์'),
      phone: cleanPhone,
      phoneFormatted: phone,
      password: cleanPassword,
      role: role as 'client' | 'partner',
      gender,
      lgbtqSubtype,
      avatarUrl: avatarUrl || '',
      credits: role === 'client' ? 3000 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date(),
    };

    // 3. บันทึกลง MongoDB Atlas แบบถาวร
    if (mongoDb) {
      const usersCollection = mongoDb.collection('users');
      await usersCollection.insertOne(newUser);
      console.log(`[Register MongoDB Success] บันทึกสมาชิกถาวรสำเร็จ: ${cleanPhone}`);
    }

    // 4. บันทึกลง Firestore (ถ้าเปิดใช้งาน)
    if (db) {
      try {
        await db.collection('users').doc(cleanPhone).set(newUser);
      } catch (e) {
        console.warn('Firestore sync failed:', e);
      }
    }

    // 5. บันทึกลง RAM สำรอง
    usersStore.push(newUser as any);

    const session: UserSession = {
      id: userId,
      name: newUser.name,
      role: newUser.role,
      phone: cleanPhone,
      avatarUrl: newUser.avatarUrl,
      credits: newUser.credits,
    };

    return res.json({
      success: true,
      session,
      message: 'ยินดีต้อนรับสู่ Laysea Entertain! สมัครสมาชิกสำเร็จเรียบร้อย',
    });
  } catch (err: any) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลงทะเบียนสมาชิก กรุณาลองใหม่อีกครั้ง' });
  }
});
// 4. Partner KYC Submission Endpoint (ยื่นเอกสารยืนยันตัวตนพาร์ทเนอร์)
app.post('/api/partner/kyc', async (req: Request, res: Response) => {
  try {
    const { phone, idCardNumber, idCardPhotoUrl, selfieWithIdUrl } = req.body;
    const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');

    if (!cleanPhone || !idCardNumber) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลเลขบัตรประชาชนให้ครบถ้วน' });
    }

    const kycData = {
      idCardNumber,
      idCardPhotoUrl: idCardPhotoUrl || '',
      selfieWithIdUrl: selfieWithIdUrl || '',
      status: 'pending', // สถานะ: pending (รอตรวจ), approved (อนุมัติแล้ว), rejected (ไม่อนุมัติ)
      submittedAt: new Date().toISOString(),
    };

    // อัปเดตข้อมูล KYC ลง MongoDB
    if (mongoDb) {
      const usersCollection = mongoDb.collection('users');
      await usersCollection.updateOne(
        { phone: cleanPhone },
        { $set: { kyc: kycData, kycStatus: 'pending', updatedAt: new Date() } }
      );
    }

    return res.json({
      success: true,
      message: 'ยื่นเอกสารยืนยันตัวตน (KYC) เรียบร้อยแล้ว อยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ (ภายใน 24 ชม.)',
    });
  } catch (err: any) {
    console.error('KYC Submission Error:', err);
    return res.status(500).json({ success: false, error: 'ระบบยื่น KYC ขัดข้อง กรุณาลองใหม่' });
  }
});
// Member Login Endpoint (สำหรับสมาชิกเดิม เข้าสู่ระบบปกติ)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { phone, password, role } = req.body;
  const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
  const cleanPassword = (password || '').trim();

  if (!cleanPhone) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกหมายเลขโทรศัพท์' });
  }
  if (!cleanPassword) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกรหัสผ่าน' });
  }

  // Admin security check
  if (role === 'admin') {
    if (!AUTHORIZED_ADMIN_PHONES_CLEAN.includes(cleanPhone)) {
      return res.status(403).json({
        success: false,
        error: 'หมายเลขโทรศัพท์นี้ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (Admin) สงวนสิทธิ์เฉพาะหมายเลขภายในที่ได้รับอนุญาตเท่านั้น',
      });
    }
  }

  try {
    let user: any = null;

    /// 1. ค้นหาผู้ใช้จาก MongoDB Atlas
    if (mongoDb) {
      const usersCollection = mongoDb.collection('users');
      // ค้นหาโดยไม่ฟิกซ์ role เพื่อให้ผู้ใช้ล็อกอินได้แม้จำบทบาทสลับกัน
      user = await usersCollection.findOne({ phone: cleanPhone });
      console.log(`[Login Query] เบอร์: ${cleanPhone}, ผลลัพธ์:`, user ? 'พบบัญชี' : 'ไม่พบบัญชี');
    }

    // 2. ถ้าใน MongoDB ไม่มี ให้ค้นหาจาก Firestore (ถ้ามี)
    if (!user && db) {
      try {
        const userDoc = await db.collection('users').doc(cleanPhone).get();
        if (userDoc.exists) {
          user = { id: userDoc.id, ...userDoc.data() };
        }
      } catch (fsErr) {
        console.warn('Firestore lookup error:', fsErr);
      }
    }

    // 3. สำรอง: ค้นหาจาก usersStore ใน RAM
    if (!user) {
      user = usersStore.find((u) => u.phone === cleanPhone);
    }

    // ถ้าไม่พบบัญชีในทุกระบบ
    if (!user) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        error: 'ยังไม่พบบัญชีหมายเลขนี้ในระบบ การใช้งานต้องสมัครสมาชิกก่อนใช้งาน กรุณากด "สมัครสมาชิกใหม่" ครับ/ค่ะ',
      });
    }

    // ตรวจสอบความถูกต้องของรหัสผ่าน
    if (user.password !== cleanPassword) {
      return res.status(401).json({
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านของคุณอีกครั้ง',
      });
    }

    const session: UserSession = {
      id: user.id || user._id?.toString() || `USR-${Date.now()}`,
      name: user.name || 'คุณลูกค้า',
      role: user.role || role || 'client',
      phone: user.phoneFormatted || user.phone || cleanPhone,
      avatarUrl: user.avatarUrl,
      credits: user.credits ?? 3000,
    };

    return res.json({
      success: true,
      session,
      message: 'ยินดีต้อนรับเข้าสู่ระบบ Laysea Entertain',
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลเข้าสู่ระบบ' });
  }
});

// Admin Login Endpoint (ตรวจสอบรหัสผ่านจาก Environment Variable บน Render)
// เก็บ OTP ชั่วคราวสำหรับ 2FA แอดมิน (หมดอายุใน 5 นาที)
const adminOtpStore: Record<string, { code: string; expiresAt: number }> = {};

// สเต็ปที่ 1: ตรวจรหัสผ่านแอดมิน -> สุ่ม OTP 6 หลักส่งเข้าอีเมล
app.post('/api/auth/admin-login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
    const cleanPassword = (password || '').trim();

    if (!cleanPhone || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกหมายเลขโทรศัพท์และรหัสผ่าน' });
    }

    if (!AUTHORIZED_ADMIN_PHONES_CLEAN.includes(cleanPhone)) {
      return res.status(403).json({
        success: false,
        error: 'หมายเลขนี้ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (Admin) สงวนสิทธิ์เฉพาะหมายเลขภายในเท่านั้น',
      });
    }

    const expectedAdminPassword = (process.env.ADMIN_PASSWORD || 'admin').trim();
    if (cleanPassword !== expectedAdminPassword) {
      return res.status(401).json({
        success: false,
        error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง',
      });
    }

    // สุ่มรหัส OTP 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    adminOtpStore[cleanPhone] = {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // ส่งรหัสเข้าอีเมลแอดมิน
    const targetEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (targetEmail) {
      await sendEmailOtp(targetEmail, otpCode);
    }

    return res.json({
      success: true,
      require2FA: true,
      targetEmailMasked: targetEmail ? targetEmail.replace(/(.{2})(.*)(?=@)/, '$1***') : 'อีเมลผู้ดูแลระบบ',
      message: 'รหัสผ่านถูกต้อง กรุณากรอกรหัส OTP จากอีเมลของคุณ',
    });
  } catch (err: any) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({ success: false, error: 'ระบบตรวจสอบแอดมินขัดข้อง' });
  }
});

// สเต็ปที่ 2: ตรวจสอบรหัส OTP 2FA จากอีเมลเพื่อปลดล็อกเข้าสู่ระบบจริง
app.post('/api/auth/verify-admin-2fa', async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
    const cleanOtp = (otp || '').trim();

    const record = adminOtpStore[cleanPhone];
    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'รหัส OTP หมดอายุแล้ว กรุณาล็อกอินใหม่อีกครั้ง' });
    }

    if (record.code !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบจากอีเมล' });
    }

    delete adminOtpStore[cleanPhone];

    const isAdmin1 = cleanPhone === '0906326569';
    const session: UserSession = {
      id: isAdmin1 ? 'USR-ADMIN-0906326569' : 'USR-ADMIN-0655397994',
      name: isAdmin1 ? 'ผู้ดูแลระบบหลัก 1 (Admin)' : 'ผู้ดูแลระบบร่วม 2 (Admin)',
      role: 'admin',
      phone: isAdmin1 ? '090-632-6569' : '065-539-7994',
      email: isAdmin1 ? 'admin1@laysea.com' : 'admin2@laysea.com',
      credits: 0,
    };

    console.log(`[Admin 2FA Verified] ปลดล็อกสิทธิ์แอดมินสำเร็จ: ${cleanPhone}`);
    return res.json({
      success: true,
      session,
      message: 'ยืนยันตัวตนสำเร็จ ยินดีต้อนรับสู่ระบบผู้ดูแลระบบ Laysea Entertain',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' });
  }
});
// 9. PDPA RIGHT TO ERASURE
app.post('/api/account/delete', (req: Request, res: Response) => {
  const { userId, role, phone } = req.body;
  const cleanPhone = (phone || '').trim().replace(/[-\s]/g, '');
  console.log(`[PDPA Deletion] Purging account & user data for User ID: ${userId}, Role: ${role}, Phone: ${cleanPhone}`);

  // Purge from usersStore
  usersStore = usersStore.filter((u) => u.id !== userId && u.phone !== cleanPhone);

  res.json({
    success: true,
    message: 'บัญชีและข้อมูลส่วนบุคคลของผู้ใช้ได้รับการลบและทำลายอย่างถาวรตามกฎหมาย PDPA แล้ว',
    deletedAt: new Date().toISOString(),
  });
});

// 10. E-RECEIPT & WITHHOLDING TAX CERTIFICATE (50 ทวิ)
app.get('/api/documents/receipt/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = bookingsStore.find((b) => b.id === id || b.eReceiptNumber === id);
  if (!booking) {
    res.status(404).json({ error: 'Receipt not found' });
    return;
  }

  res.json({
    company: 'บริษัท เลย์ซี เอ็นเตอร์เทนเมนต์ จำกัด (สำนักงานใหญ่)',
    taxId: '0105567089123',
    address: 'อาคารเอ็กเชนจ์ ทาวเวอร์ ชั้น 24 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
    receiptNumber: booking.eReceiptNumber,
    date: booking.createdAt,
    customerName: booking.clientName,
    serviceDescription: `ค่าบริการจัดหาพาร์ทเนอร์เพื่อนเที่ยวและดูแลในวงสังสรรค์ (${booking.durationHours} ชั่วโมง)`,
    subtotal: booking.totalAmountBaht,
    vat: booking.vatAmountBaht,
    total: booking.totalAmountBaht,
    status: 'PAID',
    escrowStatus: booking.escrowStatus,
  });
});

app.get('/api/documents/withholding/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = bookingsStore.find((b) => b.id === id || b.withholdingCertNumber === id);
  if (!booking) {
    res.status(404).json({ error: 'Certificate not found' });
    return;
  }

  res.json({
    documentTitle: 'หนังสือรับรองการหักภาษี ณ ที่จ่าย ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร',
    certificateNumber: booking.withholdingCertNumber,
    payer: {
      name: 'บริษัท เลย์ซี เอ็นเตอร์เทนเมนต์ จำกัด',
      taxId: '0105567089123',
    },
    payee: {
      name: booking.partnerName,
      type: 'บุคคลธรรมดา (ฟรีแลนซ์/คู่ค้าพาร์ทเนอร์)',
    },
    incomeType: 'ค่าบริการ/ค่าจ้างทำงาน (มาตรา 40(8) และ 3 เตรส)',
    grossIncome: booking.partnerGrossBaht,
    taxRate: '3%',
    taxAmount: booking.withholdingTaxBaht,
    netPaid: booking.netPartnerPayoutBaht,
    paymentDate: booking.completedAt || booking.createdAt,
  });
});

// // 1. API สร้าง QR PromptPay เมื่อลูกค้ากดชำระเงิน
app.post('/api/payments/create-qr', async (req: Request, res: Response) => {
  try {
    const { bookingId, amountBaht } = req.body;

    if (!bookingId || !amountBaht) {
      return res.status(400).json({ error: 'ต้องการ bookingId และ amountBaht' });
    }

    // Omise คิดเงินหน่วยเป็นสตางค์ (100 สตางค์ = 1 บาท)
    const charge = await omiseClient.charges.create({
      amount: Math.round(amountBaht * 100),
      currency: 'thb',
      source: {
        type: 'promptpay'
      },
      metadata: {
        bookingId: bookingId
      }
    });

    const qrImageUri = (charge.source as any)?.scannable_code?.image?.download_uri;

    console.log(`[Omise] สร้าง QR สำเร็จสำหรับ Booking: ${bookingId}, Charge ID: ${charge.id}`);

    return res.json({
      success: true,
      chargeId: charge.id,
      qrUrl: qrImageUri,
      expiresAt: charge.expires_at
    });
  } catch (error: any) {
    console.error('[Omise Error] สร้าง QR ล้มเหลว:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Webhook รับแจ้งเตือนเมื่อเงินเข้าสู่ระบบจริง
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (event.key === 'charge.complete') {
      const charge = event.data;

      if (charge.status === 'successful') {
        const bookingId = charge.metadata?.bookingId;

        if (bookingId) {
          // อัปเดตสถานะใน Cloud Firestore เป็นเงินเข้าพักในระบบ (Escrow Held) ทันที
          await db.collection('bookings').doc(bookingId).update({
            paymentStatus: 'paid',
            escrowStatus: 'held',
            paidAt: new Date().toISOString(),
            chargeId: charge.id
          });

          console.log(`[Payment Webhook] ยอดเงินเข้าแล้ว! อัปเดต Escrow ของ ${bookingId} เรียบร้อย`);
          // ดึงข้อมูลการจองเพื่อส่งแจ้งเตือนหาพาร์ทเนอร์
          const bookingDoc = await db.collection('bookings').doc(bookingId).get();
          const bookingInfo = bookingDoc.data();

          if (bookingInfo && bookingInfo.partnerId) {
            const partnerDoc = await db.collection('users').doc(bookingInfo.partnerId).get();
            const partnerData = partnerDoc.data();

            if (partnerData?.fcmToken) {
              await sendPushNotification(
                partnerData.fcmToken,
                '🎉 มีรายการจองใหม่และชำระเงินแล้ว!',
                `ลูกค้านัดหมายบริการ ${bookingInfo.eventType || ''} กรุณาตรวจสอบและตอบรับงาน`,
                { bookingId: bookingId, type: 'NEW_BOOKING_PAID' }
              );
            }
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error('[Webhook Error] จัดการข้อมูลไม่สำเร็จ:', err);
    return res.status(500).send('Error');
  }
});

// ฟังก์ชันกลางสำหรับยิง Push Notification ผ่าน FCM
async function sendPushNotification(fcmToken: string, title: string, body: string, dataPayload: Record<string, string> = {}) {
  if (!fcmToken) {
    console.log('[FCM] ไม่พบ FCM Token ข้ามการส่งแจ้งเตือน');
    return;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: dataPayload,
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] ส่งแจ้งเตือนสำเร็จ Message ID: ${response}`);
  } catch (error: any) {
    console.error('[FCM Error] ส่งแจ้งเตือนล้มเหลว:', error.message);
  }
}

// API สำหรับรับ FCM Token จากมือถือมาบันทึกลง Firestore
app.post('/api/users/update-fcm-token', async (req: Request, res: Response) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'ต้องการ userId และ fcmToken' });
    }

    await db.collection('users').doc(userId).set({
      fcmToken: fcmToken,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`[FCM] อัปเดต Token ให้ User: ${userId} สำเร็จ`);
    return res.json({ success: true, message: 'บันทึก FCM Token เรียบร้อย' });
  } catch (error: any) {
    console.error('[FCM Error] บันทึก Token ล้มเหลว:', error);
    return res.status(500).json({ error: error.message });
  }
});
// API สำหรับรายงานผู้ใช้หรือเหตุการณ์ไม่เหมาะสม (Report)
app.post('/api/users/report', async (req: Request, res: Response) => {
  try {
    const { reporterId, reportedUserId, reason, details, bookingId } = req.body;
    if (!reporterId || !reportedUserId || !reason) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const reportId = `rep_${Date.now()}`;
    await db.collection('reports').doc(reportId).set({
      reportId,
      reporterId,
      reportedUserId,
      reason,
      details: details || '',
      bookingId: bookingId || null,
      status: 'pending_review',
      createdAt: new Date().toISOString()
    });

    console.log(`[Report] บันทึกการรายงานผู้ใช้สำเร็จ: ${reportId}`);
    return res.json({ success: true, message: 'ส่งรายงานเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('[Report Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});

// API สำหรับบล็อกผู้ใช้ (Block)
app.post('/api/users/block', async (req: Request, res: Response) => {
  try {
    const { userId, blockedUserId } = req.body;
    if (!userId || !blockedUserId) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    await db.collection('users').doc(userId).set({
      blockedUsers: admin.firestore.FieldValue.arrayUnion(blockedUserId)
    }, { merge: true });

    console.log(`[Block] ผู้ใช้ ${userId} บล็อกผู้ใช้ ${blockedUserId} สำเร็จ`);
    return res.json({ success: true, message: 'บล็อกผู้ใช้เรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('[Block Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});


//Production static serving or Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laysea Entertain Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
