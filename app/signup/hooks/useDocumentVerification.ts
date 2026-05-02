'use client'

import { useState, useCallback } from 'react'

export interface DocumentVerificationStatus {
  documentId: string
  status: 'idle' | 'verifying' | 'verified' | 'failed' | 'error'
  confidence: number
  nameFound: boolean
  message: string
  analysisReport?: string
}

export function useDocumentVerification(fullName: string) {
  const [verificationResults, setVerificationResults] = useState<
    Record<string, DocumentVerificationStatus>
  >({})

  const verifyDocument = useCallback(
    async (documentId: string, file: File) => {
      setVerificationResults((prev) => ({
        ...prev,
        [documentId]: {
          documentId,
          status: 'verifying',
          confidence: 0,
          nameFound: false,
          message: 'Verifying document...',
        },
      }))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fullName', fullName)
        formData.append('documentType', documentId)

        const response = await fetch('/api/documents/verify', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        const result = await response.json()

        if (result.success && result.verified) {
          setVerificationResults((prev) => ({
            ...prev,
            [documentId]: {
              documentId,
              status: 'verified',
              confidence: result.confidence,
              nameFound: result.nameFound,
              message: `Name verified (${result.confidence}% confidence)`,
              analysisReport: result.analysisReport,
            },
          }))
        } else {
          setVerificationResults((prev) => ({
            ...prev,
            [documentId]: {
              documentId,
              status: 'failed',
              confidence: result.confidence || 0,
              nameFound: result.nameFound || false,
              message:
                'Name not found in document. This will require manual review.',
              analysisReport: result.analysisReport,
            },
          }))
        }
      } catch {
        setVerificationResults((prev) => ({
          ...prev,
          [documentId]: {
            documentId,
            status: 'error',
            confidence: 0,
            nameFound: false,
            message: 'Verification service unavailable. Will be reviewed manually.',
          },
        }))
      }
    },
    [fullName]
  )

  const resetVerification = useCallback((documentId: string) => {
    setVerificationResults((prev) => {
      const next = { ...prev }
      delete next[documentId]
      return next
    })
  }, [])

  const allRequiredVerified = useCallback(
    (requiredDocIds: string[]) => {
      return requiredDocIds.every(
        (id) => verificationResults[id]?.status === 'verified'
      )
    },
    [verificationResults]
  )

  return { verificationResults, verifyDocument, resetVerification, allRequiredVerified }
}
