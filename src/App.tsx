/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PhoneContainer } from './components/PhoneContainer';
import { AuthScreen } from './components/AuthScreen';
import { ClientPortal } from './components/ClientPortal';
import { PartnerPortal } from './components/PartnerPortal';
import { AdminPortal } from './components/AdminPortal';
import { UserSession, Partner, Booking } from './types';
import { INITIAL_PARTNERS } from './data/partners';

export default function App() {
  // Authentication session (null means user must log in or sign up first)
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Client data states
  const [userCredits, setUserCredits] = useState<number>(3000);
  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const saved = localStorage.getItem('registered_partners');
      const localPartners = saved ? JSON.parse(saved) : [];
      return [...localPartners, ...INITIAL_PARTNERS];
    } catch (e) {
      return INITIAL_PARTNERS;
    }
  });
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch initial partners and user bookings from server
  const fetchBookings = async () => {
    if (!userSession) return;
    try {
      const res = await fetch(`https://laysea-entertain-backend-1.onrender.com/api/bookings?role=${userSession.role}&userId=${userSession.id}`, {
        headers: {
          'x-user-id': userSession.id,
          'x-user-role': userSession.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bookings) {
          setBookings(data.bookings);
        }
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    // Poll real-time updates every 5 seconds
    const interval = setInterval(() => {
      if (userSession) {
        fetchBookings();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [userSession]);

  // Credit deduction handler
  const handleDeductCredits = (amount: number, _reason: string): boolean => {
    if (userCredits < amount) {
      alert(`เครดิตของคุณไม่เพียงพอ (ต้องการ ${amount} เครดิต) กรุณาเติมเครดิตก่อนครับ/ค่ะ`);
      return false;
    }
    setUserCredits((prev) => prev - amount);
    return true;
  };

  // Credit top-up handler
  const handleTopUpCredits = (amount: number, _label: string) => {
    setUserCredits((prev) => prev + amount);
  };

  // Booking confirmation handler
  const handleConfirmBooking = (newBooking: Booking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

// Booking delete handler
  const handleDeleteBooking = (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  // SOS trigger handler
  const handleTriggerSos = async (threat: string) => {
    alert(`🚨 [สัญญาณฉุกเฉิน SOS ถูกส่งแล้ว!]\nเหตุการณ์: ${threat}\nระบบได้ส่งพิกัดและแจ้งเตือนทีมงานความปลอดภัยเรียบร้อยแล้ว`);
    try {
      await fetch('https://laysea-entertain-backend-1.onrender.com/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: userSession?.name || 'พาร์ทเนอร์ในภารกิจ',
          message: threat,
          location: 'สุขุมวิท / ทองหล่อ กรุงเทพฯ',
        }),
      });
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
    }
  };

  const handleUpdateAvatar = (newAvatarUrl: string) => {
    if (userSession) {
      setUserSession({ ...userSession, avatarUrl: newAvatarUrl });
    }
  };

  // Account and Data Deletion Handler (PDPA Right to Erasure)
  const handleDeleteAccount = async () => {
    if (!userSession) return;
    try {
      await fetch('https://laysea-entertain-backend-1.onrender.com/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession.id,
          role: userSession.role,
          phone: userSession.phone,
        }),
      });
    } catch (e) {
      console.error('Failed to call delete account API:', e);
    }
    alert('ระบบได้ทำการลบบัญชีและทำลายข้อมูลผู้ใช้ของคุณตามข้อกำหนด PDPA เรียบร้อยแล้ว');
    setUserSession(null);
  };

  return (
    <PhoneContainer
      userSession={userSession}
      onLogout={() => setUserSession(null)}
    >
      {/* 1. Unauthenticated State: Mandatory Login or Sign Up with strict role separation */}
      {!userSession ? (
        <AuthScreen onLogin={(session) => setUserSession(session)} />
      ) : userSession.role === 'client' ? (
        /* 2. Client View: Only sees partner catalog, AI manager, bookings & wallet */
        <ClientPortal
          userSession={userSession}
          partners={partners}
          userCredits={userCredits}
          bookings={bookings}
          onLogout={() => setUserSession(null)}
          onDeductCredits={handleDeductCredits}
          onTopUpCredits={handleTopUpCredits}
          onConfirmBooking={handleConfirmBooking}
          onTriggerSos={handleTriggerSos}
          onUpdateAvatar={handleUpdateAvatar}
          onDeleteAccount={handleDeleteAccount}
          onRefreshBookings={fetchBookings}
          onDeleteBooking={handleDeleteBooking}
        />
      ) : userSession.role === 'partner' ? (
        /* 3. Partner View: Only sees gigs, safety check-in, earnings & persistent SOS */
        <PartnerPortal
          userSession={userSession}
          onLogout={() => setUserSession(null)}
          onTriggerSos={handleTriggerSos}
          onUpdateAvatar={handleUpdateAvatar}
          onDeleteAccount={handleDeleteAccount}
          onRefreshBookings={fetchBookings}
        />
      ) : (
        /* 4. Admin View: Financial dashboard, Google Sheets export, safety & support solver */
        <AdminPortal onLogout={() => setUserSession(null)} userSession={userSession} />
      )}
    </PhoneContainer>
  );
}
