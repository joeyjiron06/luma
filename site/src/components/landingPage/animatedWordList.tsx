import * as React from "react"
import { cn } from "@/lib/utils"
import './animatedWordList.css'

export type AnimatedWordItem = {
  label: string
  className?: string
}

type AnimatedWordListProps = {
  items: AnimatedWordItem[]
  durationMs?: number
  intervalMs?: number
  className?: string
}

export default function AnimatedWordList({
  items,
  durationMs = 200,
  intervalMs = 2200,
  className,
}: AnimatedWordListProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [exitingIndex, setExitingIndex] = React.useState<number | null>(null)
  const [resetTransitionIndex, setResetTransitionIndex] = React.useState<
    number | null
  >(null)
  const [reduceMotion, setReduceMotion] = React.useState(false)

  React.useLayoutEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  }, [])

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (reduceMotion || items.length < 2) return

    const id = window.setInterval(() => {
      setActiveIndex((current) => {
        const prev = current
        const next = (current + 1) % items.length
        setExitingIndex(prev)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null
          setExitingIndex(null)
          setResetTransitionIndex(prev)
          requestAnimationFrame(() => {
            setResetTransitionIndex(null)
          })
        }, durationMs)
        return next
      })
    }, intervalMs)

    return () => {
      window.clearInterval(id)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [reduceMotion, items.length, durationMs, intervalMs])

  const widthLabel = React.useMemo(() => {
    if (!items.length) return ""
    return items.reduce(
      (longest, item) =>
        item.label.length > longest.length ? item.label : longest,
      items[0].label
    )
  }, [items])

  if (!items.length) return null

  return (
    <span
      className={cn("inline-block align-middle overflow-hidden", className)}
      aria-live="polite"
    >
      <span className="relative inline-block align-baseline">
        <span
          className="invisible select-none pointer-events-none"
          aria-hidden="true"
        >
          {widthLabel}
        </span>
        <span className="absolute top-0 left-0 h-full w-full">
          {items.map((item, i) => {
            const animatedActive =
              !reduceMotion && i === activeIndex && i !== exitingIndex
            const staticActive = reduceMotion && i === 0
            const isActive = animatedActive || staticActive

            return (
              <span
                key={`${item.label}-${i}`}
                className={cn(
                  "hero-word",
                  item.className,
                  isActive && "active",
                  !reduceMotion && i === exitingIndex && "exiting",
                  !reduceMotion && i === resetTransitionIndex && "is-idle"
                )}
              >
                {item.label}
              </span>
            )
          })}
        </span>
      </span>
    </span>
  )
}
