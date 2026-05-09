import * as React from "react"
import { ArrowRight } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface WaitlistFormProps {
  /** Shown inside the email field when provided. Defaults to hero copy when omitted. */
  inputPlaceholder?: string
  /** Replaces hero split label + arrow layout when provided. */
  submitLabel?: string
  hideSubmitArrow?: boolean
  hideFooterNotes?: boolean
}

export function WaitlistForm({
  inputPlaceholder = "Enter your email",
  submitLabel,
  hideSubmitArrow = false,
  hideFooterNotes = false,
}: WaitlistFormProps = {}) {
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [popoverVisible, setPopoverVisible] = React.useState(false)
  const popoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const hidePopover = React.useCallback(() => {
    if (popoverTimerRef.current) {
      clearTimeout(popoverTimerRef.current)
      popoverTimerRef.current = null
    }
    setPopoverVisible(false)
  }, [])

  const showPopover = React.useCallback(() => {
    hidePopover()
    setPopoverVisible(true)
    popoverTimerRef.current = setTimeout(() => {
      setPopoverVisible(false)
      popoverTimerRef.current = null
    }, 4000)
  }, [hidePopover])

  React.useEffect(() => {
    return () => {
      if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim()

    if (loading) return

    setError("")
    hidePopover()
    setLoading(true)

    try {
      const res = await fetch("/api/waitlist-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
      }

      if (res.ok && data.success) {
        setEmail("")
        showPopover()
        return
      }

      setError(
        data.message || "Could not join the waitlist. Please try again."
      )
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="waitlist-form relative flex w-full max-w-md flex-col gap-3"
      onSubmit={handleSubmit}
    >
      <div className="flex w-full items-stretch gap-2 border border-border bg-muted/50 p-1">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError("")
          }}
          size="lg"
          onFocus={hidePopover}
          placeholder={inputPlaceholder}
          required
          autoComplete="email"
          aria-invalid={error ? true : undefined}
        />
        <div className="relative shrink-0">
          <Button
            type="submit"
            variant="shiny"
            size="lg"
            data-waitlist-submit
            aria-busy={loading}
            disabled={loading}
            className="relative gap-1.5 px-4 py-3"
          >
            <span
              data-button-label
              className={cn(
                "inline-flex items-center gap-1.5",
                loading && "invisible"
              )}
            >
              {submitLabel ? (
                <>
                  <span>{submitLabel}</span>
                  {!hideSubmitArrow ? (
                    <ArrowRight
                      data-icon="inline-end"
                      className="size-4"
                      weight="regular"
                      aria-hidden
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <span className="hidden md:inline">Join Early Access</span>
                  {!hideSubmitArrow ? (
                    <ArrowRight
                      data-icon="inline-end"
                      className="size-4"
                      weight="regular"
                      aria-hidden
                    />
                  ) : null}
                </>
              )}
            </span>
            <span
              data-button-spinner
              className={cn(
                "pointer-events-none absolute inset-0 m-auto size-4 rounded-full border-2 border-black/80 border-t-transparent",
                loading ? "animate-spin opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
          </Button>
          <div
            data-waitlist-popover
            role="status"
            aria-live="polite"
            className={cn(
              "absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md",
              !popoverVisible && "hidden"
            )}
          >
            Check your email
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <p
          data-waitlist-error
          className={cn("text-xs text-destructive", !error && "hidden")}
        >
          {error}
        </p>
        {!hideFooterNotes ? (
          <p className="text-xs text-muted-foreground">
            Your email is never shared. We&apos;ll only send you updates about
            the product.
          </p>
        ) : null}
      </div>
    </form>
  )
}
