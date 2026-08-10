import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DateKey } from '@/domain/date'
import { formatShortDateLabel } from '@/domain/date'
import { calcEnergyShare } from '@/domain/nutrition'
import type { NutritionTarget } from '@/domain/types'
import type { MetricChange } from '../body/bodyTrend'
import { useChartTheme } from '../charts/useChartTheme'
import type { DailyExpenditure } from './dailyExpenditure'
import { buildEnergyBalance, summarizeEnergyBalance } from './energyBalance'
import { averageNutrition, type MealDaySummary } from './mealDays'
import styles from './NutritionChartsSection.module.css'

interface NutritionChartsSectionProps {
  /** 古い順に並んだ、期間内の食事の記録。 */
  readonly days: readonly MealDaySummary[]
  readonly expenditureByDate: ReadonlyMap<DateKey, DailyExpenditure>
  readonly target: NutritionTarget
  /** 同じ期間の体重の変化。収支から見積もった増減と突き合わせる。 */
  readonly weightChange: MetricChange | null
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/** 摂取エネルギーと栄養素の推移、および消費との収支。 */
export function NutritionChartsSection({
  days,
  expenditureByDate,
  target,
  weightChange,
}: NutritionChartsSectionProps) {
  const theme = useChartTheme()

  const average = useMemo(() => averageNutrition(days), [days])
  const share = useMemo(() => calcEnergyShare(average), [average])

  const balancePoints = useMemo(
    () => buildEnergyBalance({ days, expenditureByDate }),
    [days, expenditureByDate],
  )
  const balance = useMemo(() => summarizeEnergyBalance(balancePoints), [balancePoints])

  const energyData = days.map((day) => ({
    label: formatShortDateLabel(day.date),
    摂取: day.nutrition.kcal,
    // 消費が出せない日は線を飛ばす。0 にすると急落して見える
    消費: expenditureByDate.get(day.date)?.totalKcal || null,
  }))
  const hasExpenditure = energyData.some((point) => point.消費 !== null)

  const cumulativeData = balancePoints.map((point) => ({
    label: formatShortDateLabel(point.date),
    収支の累計: point.cumulativeKcal,
  }))

  const proteinData = days.map((day) => ({
    label: formatShortDateLabel(day.date),
    たんぱく質: day.nutrition.protein,
  }))

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>この期間の平均</h2>
        <p className={styles.cardNote}>記録がある{days.length}日だけで平均しています。</p>

        <div className={styles.averages}>
          <div className={styles.average}>
            <div className={styles.averageValue}>{average.kcal}</div>
            <div className={styles.averageLabel}>kcal / 日</div>
          </div>
          <div className={styles.average}>
            <div className={styles.averageValue}>{average.protein}</div>
            <div className={styles.averageLabel}>たんぱく質 g</div>
          </div>
          <div className={styles.average}>
            <div className={styles.averageValue}>{average.fat}</div>
            <div className={styles.averageLabel}>脂質 g</div>
          </div>
          <div className={styles.average}>
            <div className={styles.averageValue}>{average.carb}</div>
            <div className={styles.averageLabel}>炭水化物 g</div>
          </div>
        </div>

        {average.kcal > 0 && (
          <div className={styles.shareBlock}>
            <div className={styles.shareBar} aria-hidden="true">
              <span className={styles.shareProtein} style={{ width: `${share.protein}%` }} />
              <span className={styles.shareFat} style={{ width: `${share.fat}%` }} />
              <span className={styles.shareCarb} style={{ width: `${share.carb}%` }} />
            </div>
            <p className={styles.shareLegend} data-testid="energy-share">
              エネルギー比 P {share.protein}% / F {share.fat}% / C {share.carb}%
            </p>
          </div>
        )}
      </section>

      {balance !== null && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>エネルギー収支</h2>
          <p className={styles.cardNote}>
            基礎代謝を出せた{balance.dayCount}日ぶんです。摂取 −（基礎代謝 + 運動）で、
            日常生活の活動量は消費に入っていません。そのぶん収支は多めに出ます。
          </p>

          <div className={styles.balanceRow}>
            <div className={styles.average}>
              <div className={styles.averageValue}>{balance.averageIntakeKcal}</div>
              <div className={styles.averageLabel}>平均の摂取</div>
            </div>
            <div className={styles.average}>
              <div className={styles.averageValue}>{balance.averageExpenditureKcal}</div>
              <div className={styles.averageLabel}>平均の消費</div>
            </div>
            <div className={styles.average}>
              <div className={styles.averageValue} data-testid="average-balance">
                {formatSigned(balance.averageBalanceKcal)}
              </div>
              <div className={styles.averageLabel}>平均の収支</div>
            </div>
          </div>

          <p className={styles.estimate} data-testid="fat-estimate">
            累計 {formatSigned(balance.cumulativeKcal)} kcal ＝ 体脂肪{' '}
            <strong>{formatSigned(balance.fatMassKg)} kg</strong> 相当
            {weightChange !== null && (
              <span className={styles.estimateNote}>
                同じ期間の体重は {formatSigned(weightChange.delta)} kg
                でした。水分や glycogen の増減で数日単位ではずれます。
                向きが合っているかを見てください。
              </span>
            )}
          </p>

          {cumulativeData.length > 1 && (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={cumulativeData}
                  margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                >
                  <CartesianGrid
                    stroke={theme.palette.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
                  <YAxis tick={theme.axisStyle} stroke={theme.palette.axis} width={48} />
                  <Tooltip
                    contentStyle={theme.tooltipStyle}
                    labelStyle={theme.tooltipLabelStyle}
                  />
                  <ReferenceLine y={0} stroke={theme.palette.axis} />
                  <Area
                    type="monotone"
                    dataKey="収支の累計"
                    stroke={theme.palette.maxWeight}
                    strokeWidth={2}
                    fill={theme.palette.cursorFill}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {hasExpenditure ? '摂取と消費の推移' : 'エネルギーの推移'}
        </h2>
        <p className={styles.cardNote}>
          棒が摂取、横線は目標の {target.kcal} kcal です。
          {hasExpenditure && ' 折れ線は消費（基礎代謝 + 運動）です。'}
        </p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={energyData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={theme.palette.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
              <YAxis tick={theme.axisStyle} stroke={theme.palette.axis} width={40} />
              <Tooltip
                contentStyle={theme.tooltipStyle}
                labelStyle={theme.tooltipLabelStyle}
                cursor={theme.cursorStyle}
              />
              <ReferenceLine y={target.kcal} stroke={theme.palette.grid} strokeDasharray="4 4" />
              <Bar dataKey="摂取" fill={theme.palette.maxWeight} radius={[4, 4, 0, 0]} />
              {hasExpenditure && (
                <Line
                  type="monotone"
                  dataKey="消費"
                  stroke={theme.palette.oneRepMax}
                  strokeWidth={2}
                  dot={{ r: 3, fill: theme.palette.oneRepMax, stroke: theme.palette.oneRepMax }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>たんぱく質の推移</h2>
        <p className={styles.cardNote}>横線は目標の {target.protein} g です。</p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proteinData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={theme.palette.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
              <YAxis tick={theme.axisStyle} stroke={theme.palette.axis} width={40} />
              <Tooltip
                contentStyle={theme.tooltipStyle}
                labelStyle={theme.tooltipLabelStyle}
                cursor={theme.cursorStyle}
              />
              <ReferenceLine
                y={target.protein}
                stroke={theme.palette.oneRepMax}
                strokeDasharray="4 4"
              />
              <Bar dataKey="たんぱく質" fill={theme.palette.maxWeight} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
}
