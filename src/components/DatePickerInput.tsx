import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const CALENDAR_WIDTH = 280

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function formatDisplayDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function parseDate(iso: string): { year: number; month: number; day: number } {
  if (!iso) return { year: 0, month: 0, day: 0 }
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: (m ?? 1) - 1, day: d ?? 1 }
}

interface DatePickerInputProps {
  value: string
  onChange: (date: string) => void
  min?: string
  max?: string
  className?: string
  /** Para combinar altura com outros inputs (ex: py-2.5 no modal de sensores) */
  buttonClassName?: string
  /** Quando true, renderiza o calendário em portal para ficar acima de modais */
  portal?: boolean
}

export function DatePickerInput({ value, onChange, min, max, className = '', buttonClassName = '', portal = false }: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [viewDate, setViewDate] = useState(() => value ? parseDate(value) : { year: new Date().getFullYear(), month: new Date().getMonth(), day: 1 })
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const minDate = min ? parseDate(min) : null
  const maxDate = max ? parseDate(max) : null

  useEffect(() => {
    if (value && value.length >= 10) {
      const p = parseDate(value)
      setViewDate({ ...p, day: 1 })
    }
  }, [value, isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceOnRight = (typeof window !== 'undefined' ? window.innerWidth : 0) - rect.right
    const spaceOnLeft = rect.left
    setAlignRight(spaceOnRight < CALENDAR_WIDTH && spaceOnLeft >= spaceOnRight)
    if (portal) {
      setPosition({
        top: rect.bottom + 8,
        left: spaceOnRight < CALENDAR_WIDTH && spaceOnLeft >= spaceOnRight ? rect.right - CALENDAR_WIDTH : rect.left,
      })
    }
  }, [isOpen, portal])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inContainer = containerRef.current?.contains(target)
      const inCalendar = calendarRef.current?.contains(target)
      if (!inContainer && !inCalendar) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay()
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const isDayDisabled = (day: number) => {
    if (maxDate) {
      if (viewDate.year > maxDate.year) return true
      if (viewDate.year === maxDate.year && viewDate.month > maxDate.month) return true
      if (viewDate.year === maxDate.year && viewDate.month === maxDate.month && day > maxDate.day) return true
    }
    if (minDate) {
      if (viewDate.year < minDate.year) return true
      if (viewDate.year === minDate.year && viewDate.month < minDate.month) return true
      if (viewDate.year === minDate.year && viewDate.month === minDate.month && day < minDate.day) return true
    }
    return false
  }

  const isSelected = (day: number) => {
    const p = parseDate(value)
    return value && p.year === viewDate.year && p.month === viewDate.month && p.day === day
  }

  const isToday = (day: number) => {
    const now = new Date()
    return now.getFullYear() === viewDate.year && now.getMonth() === viewDate.month && now.getDate() === day
  }

  const selectDay = (day: number) => {
    if (isDayDisabled(day)) return
    const m = String(viewDate.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewDate.year}-${m}-${d}`)
    setIsOpen(false)
  }

  const prevMonth = () => setViewDate((v) => ({
    ...v,
    month: v.month === 0 ? 11 : v.month - 1,
    year: v.month === 0 ? v.year - 1 : v.year,
  }))

  const nextMonth = () => setViewDate((v) => ({
    ...v,
    month: v.month === 11 ? 0 : v.month + 1,
    year: v.month === 11 ? v.year + 1 : v.year,
  }))

  const canGoNext = maxDate
    ? viewDate.year < maxDate.year || (viewDate.year === maxDate.year && viewDate.month < maxDate.month)
    : true

  const calendarContent = isOpen && (
    <div
      ref={calendarRef}
      className={`bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[280px] ${portal ? 'fixed z-[2500]' : `absolute top-full mt-2 z-50 ${alignRight ? 'right-0 left-auto' : 'left-0 right-auto'}`}`}
      style={portal ? { top: position.top, left: position.left } : undefined}
      role="dialog"
      aria-label="Selecionar data"
    >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 bg-gradient-to-r from-[#2C5F6F] to-[#3d7a8c]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTHS[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 px-3 pt-3 pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs font-medium text-gray-500 py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
            {days.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const disabled = isDayDisabled(day)
              const selected = isSelected(day)
              const today = isToday(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={disabled}
                  className={`
                    w-9 h-9 rounded-lg text-sm font-medium transition-all
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-[#2C5F6F]/10 cursor-pointer'}
                    ${selected ? 'bg-[#2C5F6F] text-white hover:bg-[#2C5F6F]' : 'text-gray-700'}
                    ${today && !selected ? 'ring-2 ring-[#2C5F6F]/50' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="px-3 pb-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const todayIso = new Date().toISOString().split('T')[0]
                if (!maxDate) {
                  onChange(todayIso)
                  setIsOpen(false)
                  return
                }
                const todayParsed = parseDate(todayIso)
                const isTodayAllowed =
                  todayParsed.year < maxDate.year ||
                  (todayParsed.year === maxDate.year && todayParsed.month < maxDate.month) ||
                  (todayParsed.year === maxDate.year && todayParsed.month === maxDate.month && todayParsed.day <= maxDate.day)
                if (isTodayAllowed) {
                  onChange(todayIso)
                  setIsOpen(false)
                }
              }}
              className="text-xs text-[#2C5F6F] font-medium hover:underline"
            >
              Ir para hoje
            </button>
          </div>
        </div>
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer text-left ${buttonClassName || 'py-2'}`}
      >
        <Calendar className="size-4 text-[#2C5F6F] shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDisplayDate(value) : 'Selecione uma data'}
        </span>
      </button>

      {portal && calendarContent
        ? createPortal(calendarContent, document.body)
        : calendarContent}
    </div>
  )
}
