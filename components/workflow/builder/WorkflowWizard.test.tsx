import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import React from 'react'
import WorkflowWizard from './WorkflowWizard'
import type { WorkflowWizardProps } from './WorkflowWizard'

// ── Mock framer-motion (jsdom has no rAF/WAAPI) ───────────────────────────────
vi.mock('framer-motion', async () => {
  const R = await import('react')
  const MotionDiv = R.forwardRef(
    ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { custom?: unknown; variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }, ref: React.Ref<HTMLDivElement>) =>
      R.createElement('div', { ref, ...props }, children)
  )
  MotionDiv.displayName = 'MotionDiv'
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    motion: { div: MotionDiv },
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWizard(props: Partial<WorkflowWizardProps> = {}) {
  const onComplete = vi.fn()
  const onCancel = vi.fn()

  const result = render(
    <WorkflowWizard
      onComplete={onComplete}
      onCancel={onCancel}
      {...props}
    />
  )
  return { ...result, onComplete, onCancel }
}

const MOCK_GENERATED = {
  name: 'Home Visit - Urgent',
  slug: 'home-visit-urgent',
  description: 'Home visit workflow with urgent urgency',
  serviceMode: 'home',
  providerType: 'NURSE',
  paymentTiming: 'ON_ACCEPTANCE',
  steps: [
    { order: 1, statusCode: 'pending', label: 'Pending' },
    { order: 2, statusCode: 'confirmed', label: 'Confirmed' },
    { order: 3, statusCode: 'completed', label: 'Completed' },
  ],
  transitions: [{ from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] }],
  serviceConfig: {},
  suggestedAxes: {},
}

function mockFetch(response: { success: boolean; data?: unknown; message?: string }) {
  return vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(response), { status: 200 }))
  )
}

// ── Navigate through all steps helper ────────────────────────────────────────
// Renders the wizard and drives it to the given step number (1–6).

async function navigateToStep(targetStep: number) {
  const { onComplete, onCancel } = renderWizard()

  if (targetStep >= 2) {
    fireEvent.click(screen.getByText('Home Visit'))
    fireEvent.click(screen.getByText('Next →'))
    await waitFor(() => expect(screen.getByText('How often does this service repeat?')).toBeInTheDocument())
  }

  if (targetStep >= 3) {
    fireEvent.click(screen.getByText('Next →'))
    await waitFor(() => expect(screen.getByText('Does this service require a biological sample?')).toBeInTheDocument())
  }

  if (targetStep >= 4) {
    fireEvent.click(screen.getByText('No Sample'))
    fireEvent.click(screen.getByText('Next →'))
    await waitFor(() => expect(screen.getByText('Who delivers the service?')).toBeInTheDocument())
  }

  if (targetStep >= 5) {
    fireEvent.click(screen.getByText('Single Provider'))
    fireEvent.click(screen.getByText('Next →'))
    await waitFor(() => expect(screen.getByText('What is the booking urgency?')).toBeInTheDocument())
  }

  if (targetStep >= 6) {
    fireEvent.click(screen.getByText('Scheduled'))
    fireEvent.click(screen.getByText('Next →'))
    await waitFor(() => expect(screen.getByText('Review your workflow configuration')).toBeInTheDocument())
  }

  return { onComplete, onCancel }
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  // Default: successful generate response
  vi.stubGlobal('fetch', mockFetch({ success: true, data: MOCK_GENERATED }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkflowWizard', () => {
  it('1. renders step 1 on mount — all 5 location cards visible', () => {
    renderWizard()
    expect(screen.getByText('Where does the service take place?')).toBeInTheDocument()
    expect(screen.getByText('Home Visit')).toBeInTheDocument()
    expect(screen.getByText('Office Visit')).toBeInTheDocument()
    expect(screen.getByText('Video Call')).toBeInTheDocument()
    expect(screen.getByText('Audio Call')).toBeInTheDocument()
    expect(screen.getByText('Async / Remote')).toBeInTheDocument()
  })

  it('2. Next button disabled until selection on step 1', () => {
    renderWizard()
    const nextBtn = screen.getByText('Next →')
    expect(nextBtn).toBeDisabled()

    // Still on step 1 after clicking disabled button
    expect(screen.getByText('Where does the service take place?')).toBeInTheDocument()
  })

  it('3. step 1 → 2 navigation after selecting Video Call', async () => {
    renderWizard()

    // Next is disabled before selection
    expect(screen.getByText('Next →')).toBeDisabled()

    // Select Video Call
    fireEvent.click(screen.getByText('Video Call'))

    // Now Next is enabled
    expect(screen.getByText('Next →')).not.toBeDisabled()

    // Navigate to step 2
    fireEvent.click(screen.getByText('Next →'))

    await waitFor(() => {
      expect(screen.getByText('How often does this service repeat?')).toBeInTheDocument()
    })
  })

  it('4. recurrence toggle — default is One-time, clicking Recurring shows frequency options', async () => {
    renderWizard()

    // Navigate to step 2
    fireEvent.click(screen.getByText('Home Visit'))
    fireEvent.click(screen.getByText('Next →'))

    await waitFor(() => expect(screen.getByText('How often does this service repeat?')).toBeInTheDocument())

    // Default is One-time — frequency section not visible
    expect(screen.queryByText('Frequency')).not.toBeInTheDocument()

    // Click Recurring
    fireEvent.click(screen.getByText('Recurring'))

    // Frequency options appear
    await waitFor(() => {
      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })
  })

  it('5. Back navigation — on step 2, clicking Back returns to step 1 with selection preserved', async () => {
    renderWizard()

    // Select Home Visit and go to step 2
    fireEvent.click(screen.getByText('Home Visit'))
    fireEvent.click(screen.getByText('Next →'))

    await waitFor(() => expect(screen.getByText('How often does this service repeat?')).toBeInTheDocument())

    // Go back
    fireEvent.click(screen.getByText('← Back'))

    await waitFor(() => expect(screen.getByText('Where does the service take place?')).toBeInTheDocument())

    // The selection is preserved — Next button should be enabled
    const nextBtn = screen.getByText('Next →')
    expect(nextBtn).not.toBeDisabled()
  })

  it('6. full navigation to review — simulate selecting all 5 steps', async () => {
    await navigateToStep(6)
    expect(screen.getByText('Review your workflow configuration')).toBeInTheDocument()
  })

  it('7. API call on review — fetch called with correct payload', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true, data: MOCK_GENERATED }), { status: 200 }))
    )
    vi.stubGlobal('fetch', fetchSpy)

    await navigateToStep(6)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/workflow/templates/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    // Verify payload
    const rawCalls = fetchSpy.mock.calls as unknown as Array<[string, RequestInit]>
    const init = rawCalls[0][1]
    const body = JSON.parse(init.body as string)
    expect(body.location).toBe('home')
    expect(body.sample).toBe('none')
    expect(body.careModel).toBe('single')
    expect(body.urgency).toBe('scheduled')
    expect(body.recurrenceType).toBe('once')
  })

  it('8. loading state — "Generating template..." shown while fetch pending', async () => {
    // Create a promise that doesn't resolve immediately
    let resolveGenerate!: (v: Response) => void
    const slowFetch = vi.fn(
      () => new Promise<Response>(resolve => { resolveGenerate = resolve })
    )
    vi.stubGlobal('fetch', slowFetch)

    await navigateToStep(6)

    await waitFor(() => {
      expect(screen.getByText('Generating template...')).toBeInTheDocument()
    })

    // Resolve so cleanup doesn't hang
    act(() => {
      resolveGenerate(new Response(JSON.stringify({ success: true, data: MOCK_GENERATED }), { status: 200 }))
    })
  })

  it('9. error state — when fetch fails, error banner shown with retry button', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ success: false, message: 'Server error' }), { status: 500 }))
    ))

    await navigateToStep(6)

    await waitFor(() => {
      expect(screen.getByText('Could not generate template. Please try again.')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('10. onComplete called when Build Template clicked with valid generated data', async () => {
    const { onComplete } = await navigateToStep(6)

    // Wait for generated template to appear
    await waitFor(() => {
      expect(screen.getByText('Home Visit - Urgent')).toBeInTheDocument()
    })

    // Click Build Template
    fireEvent.click(screen.getByText('Build Template →'))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Home Visit - Urgent',
        slug: 'home-visit-urgent',
        serviceMode: 'home',
        steps: expect.arrayContaining([
          expect.objectContaining({ statusCode: 'pending' }),
        ]),
      })
    )
  })

  it('11. onCancel called when cancel button clicked', () => {
    const { onCancel } = renderWizard()

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
