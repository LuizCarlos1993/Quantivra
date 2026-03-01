import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface DeleteStationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  stationName: string
}

export function DeleteStationModal({
  isOpen,
  onClose,
  onConfirm,
  stationName,
}: DeleteStationModalProps) {
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    if (isOpen) setTypedName('')
  }, [isOpen, stationName])

  if (!isOpen) return null

  const canConfirm = typedName.trim() === stationName

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Excluir Estação</h2>
              <p className="text-xs text-white/70">Remover estação e todos os dados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Para confirmar, digite o nome da estação que será excluída:
            </p>
            <div className="bg-white rounded-lg p-2 border border-gray-300 mb-2">
              <p className="font-bold text-gray-900 text-sm mb-2">{stationName}</p>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Digite o nome da estação"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">Atenção:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Esta ação excluirá a estação permanentemente</li>
                  <li>Sensores e dados dos sensores serão excluídos em cascata</li>
                  <li>Esta ação não pode ser desfeita</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Estação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
