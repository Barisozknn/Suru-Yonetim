export type GrowthStatus = 'Başarılı' | 'Riskli' | 'Geri Kalmış' | 'Bilinmiyor';

export const calculateGrowthStatus = (
  currentWeightKg?: number,
  targetWeightKg?: number
): { status: GrowthStatus; color: string; percentage: number } => {
  if (!currentWeightKg || !targetWeightKg || targetWeightKg <= 0) {
    return { status: 'Bilinmiyor', color: 'text-earth-500 bg-earth-100 border-earth-300', percentage: 0 };
  }

  const percentage = (currentWeightKg / targetWeightKg) * 100;

  if (percentage >= 90) {
    return { status: 'Başarılı', color: 'text-green-700 bg-green-100 border-green-300', percentage };
  } else if (percentage >= 80) {
    return { status: 'Riskli', color: 'text-yellow-700 bg-yellow-100 border-yellow-300', percentage };
  } else {
    return { status: 'Geri Kalmış', color: 'text-red-700 bg-red-100 border-red-300', percentage };
  }
};

export const calculateAgeInDays = (birthDateStr: string): number => {
  const birth = new Date(birthDateStr);
  birth.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, today.getTime() - birth.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateTargetWeaningDate = (birthDateStr: string, weaningAgeDays: number = 60): string => {
  const d = new Date(birthDateStr);
  d.setDate(d.getDate() + weaningAgeDays);
  return d.toISOString().split('T')[0];
};
