'use client'

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { colorOf } from '@/lib/category'
import type { ChartData } from '@/lib/report-data'

const rp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
const rpShort = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'jt' : n >= 1e3 ? Math.round(n / 1e3) + 'rb' : String(n)

const INK = { grid: 'rgba(100,116,139,.14)', tick: '#64748b' }
const tooltip = {
  backgroundColor: '#ffffff',
  titleColor: '#0f172a',
  bodyColor: '#0f172a',
  borderColor: 'rgba(100,116,139,.2)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
}

export default function ReportCharts({ chart }: { chart: ChartData }) {
  const donutRef = useRef<HTMLCanvasElement>(null)
  const lineRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const charts: Chart[] = []
    const { labels, pengeluaranHarian, sisaHarian, areaSeries, donut } = chart

    // ---- Donut: komposisi ----
    if (donutRef.current && donut.length) {
      const total = donut.reduce((s, d) => s + d.total, 0)
      charts.push(
        new Chart(donutRef.current, {
          type: 'doughnut',
          data: {
            labels: donut.map((d) => d.kategori),
            datasets: [
              {
                data: donut.map((d) => d.total),
                backgroundColor: donut.map((d) => colorOf(d.kategori)),
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '66%',
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltip,
                callbacks: {
                  label: (c) =>
                    ' ' + c.label + ': ' + rp(c.parsed) + ' (' + Math.round((c.parsed / total) * 100) + '%)',
                },
              },
            },
          },
        }),
      )
    }

    // ---- Line: tren harian ----
    if (lineRef.current) {
      const grad = (hex: string) => (c: { chart: Chart }) => {
        const { ctx, chartArea } = c.chart
        if (!chartArea) return hex + '22'
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        g.addColorStop(0, hex + '55')
        g.addColorStop(1, hex + '00')
        return g
      }
      charts.push(
        new Chart(lineRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Pengeluaran', data: pengeluaranHarian, borderColor: '#e34948', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.35, fill: true, backgroundColor: grad('#e34948') },
              { label: 'Sisa Saldo', data: sisaHarian, borderColor: '#2a78d6', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.35, fill: false },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + rp(Number(c.parsed.y ?? 0)) } } },
            scales: {
              x: { grid: { display: false }, ticks: { color: INK.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, border: { display: false } },
              y: { grid: { color: INK.grid }, ticks: { color: INK.tick, callback: (v) => rpShort(Number(v)) }, border: { display: false }, beginAtZero: true },
            },
          },
        }),
      )
    }

    // ---- Stacked area: kondisi amplop ----
    if (areaRef.current && areaSeries.length) {
      charts.push(
        new Chart(areaRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: areaSeries.map((s) => ({
              label: s.kategori,
              data: s.data,
              borderColor: colorOf(s.kategori),
              backgroundColor: colorOf(s.kategori) + '66',
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0.3,
              fill: true,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + rp(Number(c.parsed.y ?? 0)) } } },
            scales: {
              x: { grid: { display: false }, ticks: { color: INK.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, border: { display: false } },
              y: { stacked: true, grid: { color: INK.grid }, ticks: { color: INK.tick, callback: (v) => rpShort(Number(v)) }, border: { display: false }, beginAtZero: true },
            },
          },
        }),
      )
    }

    return () => charts.forEach((c) => c.destroy())
  }, [chart])

  const hasDaily = chart.pengeluaranHarian.some((v) => v > 0) || chart.sisaHarian.some((v) => v !== 0)

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
      {chart.donut.length > 0 && (
        <section style={card}>
          <h2 style={h2}>Komposisi Pengeluaran</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 8 }}>
            <div style={{ height: 200, width: 200 }}>
              <canvas ref={donutRef} />
            </div>
            <div style={{ display: 'grid', gap: 6, minWidth: 200, flex: 1 }}>
              {chart.donut.map((d) => (
                <div key={d.kategori} style={legendRow}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ height: 10, width: 10, borderRadius: 999, background: colorOf(d.kategori) }} />
                    {d.kategori}
                  </span>
                  <span style={{ fontWeight: 600 }}>{rp(d.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasDaily && (
        <section style={card}>
          <div style={legendHead}>
            <h2 style={h2}>Tren Harian</h2>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 500 }}>
              <Legend color="#e34948" label="Pengeluaran" />
              <Legend color="#2a78d6" label="Sisa Saldo" />
            </div>
          </div>
          <div style={{ height: 280, marginTop: 12 }}>
            <canvas ref={lineRef} />
          </div>
        </section>
      )}

      {chart.areaSeries.length > 0 && (
        <section style={card}>
          <div style={legendHead}>
            <h2 style={h2}>Kondisi Amplop</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, fontWeight: 500 }}>
              {chart.areaSeries.map((s) => (
                <Legend key={s.kategori} color={colorOf(s.kategori)} label={s.kategori} />
              ))}
            </div>
          </div>
          <div style={{ height: 280, marginTop: 12 }}>
            <canvas ref={areaRef} />
          </div>
        </section>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ height: 10, width: 10, borderRadius: 999, background: color }} />
      {label}
    </span>
  )
}

const card: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  padding: 18,
  background: '#fff',
}
const h2: React.CSSProperties = { fontSize: 15, margin: 0, fontWeight: 700 }
const legendHead: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
}
const legendRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
  background: '#f8fafc',
  borderRadius: 8,
  padding: '8px 12px',
}
