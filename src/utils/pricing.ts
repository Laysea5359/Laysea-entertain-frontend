/**
 * Progressive Hourly Pricing Engine for Laysea Entertain
 * 
 * Rules:
 * - 1 Hour: Standard base hourly rate (0% discount)
 * - 2-4 Hours: Progressively discounted per hour compared to 1 hour rate (6% -> 12% -> 18%)
 * - 5-7 Hours: Further gradual decrease (22% -> 25% -> 28%)
 * - 8 Hours (1 Full Day / เหมา 1 วัน): Deepest progressive discount (35% off hourly rate)
 * - 9-12 Hours (1 Full Day Plus): Up to 38% off
 */

export interface PricingBreakdown {
  durationHours: number;
  baseHourlyRate: number;
  effectiveHourlyRate: number;
  totalPrice: number;
  standardTotalPrice: number;
  savingsBaht: number;
  discountPercent: number;
  tierLabel: string;
  badgeText: string;
}

export function getProgressiveDiscountRate(hours: number): {
  discountPercent: number;
  tierLabel: string;
  badgeText: string;
} {
  if (hours <= 1) {
    return {
      discountPercent: 0,
      tierLabel: 'อัตรามาตรฐาน (1 ชม.)',
      badgeText: 'ราคาปกติ',
    };
  }
  if (hours === 2) {
    return {
      discountPercent: 6,
      tierLabel: 'แพ็กเกจ 2 ชม. (อัตราเฉลี่ยลดลง 6%)',
      badgeText: 'ลด 6%/ชม.',
    };
  }
  if (hours === 3) {
    return {
      discountPercent: 12,
      tierLabel: 'แพ็กเกจ 3 ชม. (อัตราเฉลี่ยลดลง 12%)',
      badgeText: 'ลด 12%/ชม.',
    };
  }
  if (hours === 4) {
    return {
      discountPercent: 18,
      tierLabel: 'แพ็กเกจ 1-4 ชม. (อัตราเฉลี่ยลดลง 18%)',
      badgeText: 'ลด 18%/ชม. แนะนำ!',
    };
  }
  if (hours === 5) {
    return {
      discountPercent: 22,
      tierLabel: 'แพ็กเกจ 5 ชม. (อัตราเฉลี่ยลดลง 22%)',
      badgeText: 'ลด 22%/ชม.',
    };
  }
  if (hours === 6) {
    return {
      discountPercent: 25,
      tierLabel: 'แพ็กเกจครึ่งวัน 6 ชม. (อัตราเฉลี่ยลดลง 25%)',
      badgeText: 'ลด 25%/ชม. ยอดนิยม',
    };
  }
  if (hours === 7) {
    return {
      discountPercent: 28,
      tierLabel: 'แพ็กเกจ 7 ชม. (อัตราเฉลี่ยลดลง 28%)',
      badgeText: 'ลด 28%/ชม.',
    };
  }
  if (hours === 8) {
    return {
      discountPercent: 35,
      tierLabel: 'แพ็กเกจเหมา 1 วัน (8 ชม.) อัตราลดพิเศษสูงสุด!',
      badgeText: '🔥 เหมา 1 วัน ลด 35%',
    };
  }
  if (hours > 8) {
    return {
      discountPercent: 38,
      tierLabel: `แพ็กเกจเหมาวันพิเศษ (${hours} ชม.)`,
      badgeText: '🔥 ลด 38% สิทธิพิเศษ',
    };
  }

  return {
    discountPercent: 0,
    tierLabel: 'อัตรามาตรฐาน',
    badgeText: 'ราคาปกติ',
  };
}

export function calculateProgressiveBookingPrice(
  baseHourlyRate: number,
  durationHours: number
): PricingBreakdown {
  const safeHours = Math.max(1, Math.min(12, Math.round(durationHours)));
  const { discountPercent, tierLabel, badgeText } = getProgressiveDiscountRate(safeHours);

  // Calculate discounted rate per hour
  const discountMultiplier = 1 - discountPercent / 100;
  const rawEffectiveRate = baseHourlyRate * discountMultiplier;
  
  // Round effective rate to clean integer (hundreds or tens)
  const effectiveHourlyRate = Math.round(rawEffectiveRate / 10) * 10;
  
  const totalPrice = effectiveHourlyRate * safeHours;
  const standardTotalPrice = baseHourlyRate * safeHours;
  const savingsBaht = Math.max(0, standardTotalPrice - totalPrice);

  return {
    durationHours: safeHours,
    baseHourlyRate,
    effectiveHourlyRate,
    totalPrice,
    standardTotalPrice,
    savingsBaht,
    discountPercent,
    tierLabel,
    badgeText,
  };
}

export const POPULAR_DURATIONS = [
  { hours: 1, label: '1 ชม.', hint: 'ปกติ' },
  { hours: 2, label: '2 ชม.', hint: 'ลด 6%' },
  { hours: 3, label: '3 ชม.', hint: 'ลด 12%' },
  { hours: 4, label: '4 ชม.', hint: 'ลด 18%' },
  { hours: 6, label: '6 ชม.', hint: 'ลด 25%' },
  { hours: 8, label: '1 วัน (8 ชม.)', hint: 'ลด 35% คุ้มสุด' },
];
