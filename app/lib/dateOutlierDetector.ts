// Date outlier detection and correction

export interface DateOutlier {
  rowIndex: number
  originalDate: string
  suggestedDate: string
  distanceInDays: number
}

export interface DateOutlierResult {
  outliers: DateOutlier[]
  mostCommonYear: number
  dateRange: { min: string; max: string }
  totalDates: number
}

export function detectDateOutliers(
  dates: (string | null | undefined)[],
  thresholdDays: number = 365
): DateOutlierResult {
  // Parse dates
  const parsedDates: { index: number; date: Date; original: string }[] = []
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]
    if (!d) continue
    const parsed = parseDateString(String(d))
    if (parsed) {
      parsedDates.push({
        index: i,
        date: parsed,
        original: String(d),
      })
    }
  }

  if (parsedDates.length === 0) {
    return {
      outliers: [],
      mostCommonYear: new Date().getFullYear(),
      dateRange: { min: '', max: '' },
      totalDates: 0,
    }
  }

  // Find most common year
  const yearCounts = new Map<number, number>()
  for (const pd of parsedDates) {
    const year = pd.date.getFullYear()
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }
  let mostCommonYear = 0
  let maxCount = 0
  for (const [year, count] of yearCounts) {
    if (count > maxCount) {
      maxCount = count
      mostCommonYear = year
    }
  }

  // Find date range
  const allDates = parsedDates.map(pd => pd.date)
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

  // Detect outliers
  const outliers: DateOutlier[] = []
  for (const pd of parsedDates) {
    const yearDiff = Math.abs(pd.date.getFullYear() - mostCommonYear)
    if (yearDiff > 1) {
      // Suggest correction
      const suggestedDate = new Date(pd.date)
      suggestedDate.setFullYear(mostCommonYear)
      
      // If the date was in a different year, check if the day/month is valid
      const dayDiff = Math.abs(pd.date.getTime() - suggestedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      outliers.push({
        rowIndex: pd.index,
        originalDate: pd.original,
        suggestedDate: suggestedDate.toISOString().slice(0, 10),
        distanceInDays: Math.round(dayDiff),
      })
    }
  }

  return {
    outliers,
    mostCommonYear,
    dateRange: {
      min: minDate.toISOString().slice(0, 10),
      max: maxDate.toISOString().slice(0, 10),
    },
    totalDates: parsedDates.length,
  }
}

function parseDateString(str: string): Date | null {
  // Try various formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YYYY (day > 12)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ]

  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      let [_, a, b, c] = match
      // Try MM/DD/YYYY first
      let d = new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`)
      if (!isNaN(d.getTime())) return d
      // Try DD/MM/YYYY
      d = new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Try native Date parse
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d

  return null
}

export function suggestDateCorrection(
  originalDate: string,
  targetYear: number
): string {
  const d = parseDateString(originalDate)
  if (!d) return originalDate
  d.setFullYear(targetYear)
  return d.toISOString().slice(0, 10)
}
