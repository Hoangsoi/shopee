// Utility functions for investment calculations

/**
 * Get investment rate based on number of days
 * @param days - Number of investment days
 * @param rates - Array of rate configurations with min_days, max_days (optional), and rate
 * @returns The appropriate rate for the given number of days
 */
export function getInvestmentRateByDays(
  days: number,
  rates: Array<{ min_days: number; max_days?: number; rate: number }>
): number {
  // Sắp xếp rates theo min_days tăng dần
  const sortedRates = [...rates].sort((a, b) => a.min_days - b.min_days);

  // Tìm rate phù hợp
  for (const rateConfig of sortedRates) {
    if (days >= rateConfig.min_days) {
      // Nếu không có max_days hoặc days <= max_days
      if (!rateConfig.max_days || days <= rateConfig.max_days) {
        return rateConfig.rate;
      }
    }
  }

  // Nếu không tìm thấy, trả về rate của mức cao nhất
  if (sortedRates.length > 0) {
    return sortedRates[sortedRates.length - 1].rate;
  }

  // Mặc định 1%
  return 1.00;
}

