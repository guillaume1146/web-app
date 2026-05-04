'use client'

import { useState, useRef, useEffect } from 'react'
import { FaFileMedical, FaTimes, FaUpload, FaCamera, FaCheckCircle, FaSpinner, FaTrash, FaPills } from 'react-icons/fa'
import { usePrescription } from '@/lib/contexts/prescription-context'

export default function FloatingPrescriptionFAB() {
  const { prescription, hasPrescription, setPrescription, clearPrescription, isExtracting, setIsExtracting } = usePrescription()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hasPrescription && prescription.imageUrl && !showReplace) setPreview(prescription.imageUrl)
  }, [hasPrescription, prescription.imageUrl, showReplace])

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return
    setIsExtracting(true)
    try {
      const res = await fetch('/api/ai/extract-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview }),
      })
      const json = await res.json() as { success: boolean; data?: { medicines: string[]; rawText: string } }
      const data = json.data ?? { medicines: [], rawText: '' }
      setPrescription({ imageUrl: preview, medicines: data.medicines, rawText: data.rawText, uploadedAt: new Date().toISOString() })
    } catch {
      setPrescription({ imageUrl: preview, medicines: [], rawText: '', uploadedAt: new Date().toISOString() })
    } finally {
      setIsExtracting(false)
      setShowReplace(false)
      setOpen(false)
    }
  }

  const handleClear = () => {
    clearPrescription()
    setPreview(null)
    setFileName('')
    setShowReplace(false)
  }

  const isUploadMode = !hasPrescription || showReplace

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setShowReplace(false) }} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <FaFileMedical className="text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">My Prescription</p>
                  <p className="text-xs text-gray-500">Saved across the platform</p>
                </div>
              </div>
              <button onClick={() => { setOpen(false); setShowReplace(false) }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimes />
              </button>
            </div>

            <div className="p-5">
              {isExtracting ? (
                <div className="py-10 text-center">
                  <FaSpinner className="text-amber-500 text-3xl animate-spin mx-auto mb-3" />
                  <p className="font-semibold text-gray-800 text-sm">Scanning prescription…</p>
                  <p className="text-xs text-gray-500 mt-1">AI is extracting medicine names</p>
                </div>

              ) : hasPrescription && !showReplace ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FaCheckCircle className="text-green-500" />
                    <span className="text-sm font-semibold text-green-700">Prescription active</span>
                    {prescription.uploadedAt && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(prescription.uploadedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {prescription.imageUrl && (
                    <img src={prescription.imageUrl} alt="Prescription" className="w-full h-36 object-contain rounded-xl border border-gray-200 mb-3 bg-gray-50" />
                  )}

                  {prescription.medicines.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                        <FaPills className="text-amber-500" />
                        Detected medicines ({prescription.medicines.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {prescription.medicines.map((m, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {prescription.medicines.length === 0 && (
                    <p className="text-xs text-gray-500 mb-4">No medicines were extracted — the AI may need a clearer image.</p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setShowReplace(true)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      Replace
                    </button>
                    <button onClick={handleClear} className="flex items-center gap-1.5 px-4 py-2.5 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <FaTrash className="text-xs" /> Remove
                    </button>
                  </div>
                </div>

              ) : (
                <div>
                  {showReplace && (
                    <button onClick={() => setShowReplace(false)} className="text-xs text-[#0C6780] mb-3 flex items-center gap-1 hover:underline">
                      ← Back to current prescription
                    </button>
                  )}
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your prescription once. We'll extract the medicines and show matching products at the top of the Health Shop.
                  </p>

                  <div
                    onClick={() => fileRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onDragOver={e => e.preventDefault()}
                    className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-xl p-5 cursor-pointer text-center transition-colors group mb-2"
                  >
                    {preview && preview !== prescription.imageUrl ? (
                      <div>
                        <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-lg object-contain mb-2" />
                        <p className="text-xs text-gray-500 truncate">{fileName}</p>
                        <p className="text-xs text-amber-600 font-medium mt-1">Click to change</p>
                      </div>
                    ) : (
                      <>
                        <FaUpload className="text-gray-300 group-hover:text-amber-400 text-2xl mx-auto mb-2 transition-colors" />
                        <p className="text-sm font-medium text-gray-700">Upload prescription image</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Max 10MB</p>
                        <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />

                  <button
                    onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() }}}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors mb-3"
                  >
                    <FaCamera className="text-gray-400" /> Take a photo
                  </button>

                  <button
                    disabled={!preview || preview === prescription.imageUrl}
                    onClick={handleUpload}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <FaFileMedical /> Scan & Save Prescription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="My prescription"
        className="fixed bottom-56 right-5 sm:right-6 z-[150] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: hasPrescription ? '#f59e0b' : '#ffffff', border: hasPrescription ? 'none' : '2px solid #e5e7eb' }}
      >
        <FaFileMedical className={hasPrescription ? 'text-white text-xl' : 'text-gray-400 text-xl'} />
        {isExtracting && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-300 rounded-full flex items-center justify-center">
            <FaSpinner className="text-white text-[10px] animate-spin" />
          </span>
        )}
        {hasPrescription && !isExtracting && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <FaCheckCircle className="text-white text-[10px]" />
          </span>
        )}
      </button>
    </>
  )
}
