import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimePickerInputProps {
  value: string
  onChange: (time: string) => void
  className?: string
  buttonClassName?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function TimePickerInput({ value, onChange, className = '', buttonClassName = '' }: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hour, setHour] = useState(() => {
    if (value && value.includes(':')) return parseInt(value.split(':')[0], 10)
    return 3
  })
  const [minute, setMinute] = useState(() => {
    if (value && value.includes(':')) return parseInt(value.split(':')[1], 10)
    return 0
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':').map(Number)
      setHour(isNaN(h) ? 3 : Math.min(23, Math.max(0, h)))
      const rawMin = isNaN(m) ? 0 : Math.min(59, Math.max(0, m))
      const nearest = minuteOptions.reduce((prev, curr) =>
        Math.abs(curr - rawMin) < Math.abs(prev - rawMin) ? curr : prev
      )
      setMinute(nearest)
    }
  }, [value, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
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

  const handleApply = () => {
    onChange(`${pad(hour)}:${pad(minute)}`)
    setIsOpen(false)
  }

  const displayValue = value || 'Selecione o horário'
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-4 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer text-left ${buttonClassName || 'py-2.5'}`}
      >
        <Clock className="size-4 text-[#2C5F6F] shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[200px]"
          role="dialog"
          aria-label="Selecionar horário"
        >
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                <select
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {pad(h)}h
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Minuto</label>
                <select
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                >
                  {minuteOptions.map((m) => (
                    <option key={m} value={m}>
                      {pad(m)} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-2 px-3 bg-[#2C5F6F] text-white text-sm font-medium rounded-lg hover:bg-[#3d7a8c] transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
