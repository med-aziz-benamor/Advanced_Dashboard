import { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'subtle' | 'elevated'
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variantStyles = {
    default: 'bg-charcoal-800/50 border border-gray-700',
    subtle: 'bg-charcoal-800/30 border border-gray-700/50',
    elevated: 'bg-charcoal-800 border border-gray-700 shadow-lg',
  }

  return (
    <div className={cn('rounded-lg', variantStyles[variant], className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-700', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-700', className)}>
      {children}
    </div>
  )
}
