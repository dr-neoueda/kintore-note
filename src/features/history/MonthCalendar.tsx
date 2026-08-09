import { useState } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import {
  WEEKDAY_LABELS,
  addMonths,
  buildMonthGrid,
  formatMonthLabel,
  toMonthKey,
} from '@/domain/calendar'
import type { DateKey } from '@/domain/date'
import styles from './MonthCalendar.module.css'

interface MonthCalendarProps {
  readonly todayKey: DateKey
  /** 記録がある日。印を付けて、どこに記録済みかを分かるようにする。 */
  readonly recordedDates: ReadonlySet<DateKey>
  readonly onSelect: (date: DateKey) => void
}

/**
 * 月のカレンダー。
 *
 * `input[type="date"]` を使うと、iOS Safari では開いた瞬間に今日が確定して
 * change が飛び、過去の日を選べない。ネイティブの選択 UI に頼らず自前で描く。
 * ついでに、記録がある日が一目で分かるようになる。
 */
export function MonthCalendar({ todayKey, recordedDates, onSelect }: MonthCalendarProps) {
  const [monthKey, setMonthKey] = useState(() => toMonthKey(todayKey))

  const weeks = buildMonthGrid(monthKey)
  const isCurrentMonth = monthKey === toMonthKey(todayKey)

  return (
    <section className={styles.calendar} aria-label="日付を選ぶ">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonthKey(addMonths(monthKey, -1))}
          aria-label="前の月"
        >
          <span className={styles.chevronLeft}>
            <ChevronRightIcon size={18} />
          </span>
        </button>

        <h2 className={styles.monthLabel}>{formatMonthLabel(monthKey)}</h2>

        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonthKey(addMonths(monthKey, 1))}
          disabled={isCurrentMonth}
          aria-label="次の月"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {weeks.flat().map((date, index) => {
          if (date === null) {
            // 前後の月にはみ出す枠。押せる要素にすると誤タップの的になる
            return <span key={`blank-${index}`} className={styles.blank} />
          }

          const day = Number(date.slice(8))
          const isFuture = date > todayKey
          const isToday = date === todayKey
          const hasRecord = recordedDates.has(date)

          const className = [
            styles.day,
            isToday ? styles.today : '',
            hasRecord ? styles.recorded : '',
          ]
            .filter((name) => name !== '')
            .join(' ')

          return (
            <button
              key={date}
              type="button"
              className={className}
              disabled={isFuture}
              onClick={() => onSelect(date)}
              aria-label={`${formatMonthLabel(monthKey)}${day}日${hasRecord ? '（記録あり）' : ''}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      <p className={styles.hint}>
        日付を選ぶと、その日の記録を作ったり直したりできます。塗りつぶした日は記録済みです。
      </p>
    </section>
  )
}
