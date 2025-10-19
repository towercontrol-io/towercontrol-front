import { defineNuxtPlugin } from '#app'

const SEC = 1
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY        // simple human average
const YEAR = 365 * DAY        // simple human average

type UnitKey = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

/**
 * Map seconds to the largest human unit among minute/hour/day/week/month/year.
 * For < 1 minute, we round up to 1 minute (no "seconds" output per request).
 */
 export default defineNuxtPlugin((nuxtApp) => {
  const formatDuration = (seconds: number): string => {
    const { t, n } = nuxtApp.$i18n

    const s = Math.max(0, Math.floor(seconds))

    // Under 1 minute → display "1 minute"
    if (s < MIN) {
      const count = 1
      return t('duration.minute', { count, value: n(count) })
    }

    // Largest fitting unit
    const units: Array<{ key: UnitKey; size: number }> = [
      { key: 'year', size: YEAR },
      { key: 'month', size: MONTH },
      { key: 'week', size: WEEK },
      { key: 'day', size: DAY },
      { key: 'hour', size: HOUR },
      { key: 'minute', size: MIN }
    ]

    const unit = units.find(u => s >= u.size) ?? units[units.length - 1]
    const count = Math.round(s / unit!.size)

    return t(`duration.${unit!.key}`, { count, value: n(count) })
  }

  return {
    provide: {
      formatDuration
    }
  }
});
