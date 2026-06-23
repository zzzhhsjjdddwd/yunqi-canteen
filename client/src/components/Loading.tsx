import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-screen items-center justify-center', className)}>
      <div className="glass-card flex flex-col items-center gap-6 p-8">
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-primary-light animate-pulse" />
          <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <p className="text-sm font-medium gradient-text">加载中...</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Skeleton 系列 - 骨架屏加载占位符
 *  使用 Tailwind animate-pulse + 透明渐变模拟内容结构
 * ============================================================ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-white/40',
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'glass-card overflow-hidden p-3 space-y-3',
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card flex items-center gap-3 p-4">
          <Skeleton className="h-12 w-12 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('glass-card overflow-hidden', className)}
      aria-hidden="true"
    >
      <div className="flex items-center gap-4 border-b border-white/30 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-white/20">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  'h-3.5 flex-1',
                  c === 0 && 'w-24 flex-none'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 复合场景骨架 ============ */

export function HomePageSkeleton() {
  return (
    <div className="space-y-6 p-4 pb-24" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card flex flex-col items-center gap-2 p-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function MenuPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl p-4" aria-hidden="true">
      <Skeleton className="mb-4 h-6 w-24" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </div>
      <SkeletonList count={4} />
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-hidden="true">
      <div className="glass-card flex items-center gap-4 p-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="glass-card divide-y divide-white/20 overflow-hidden">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}

/* ============ 空状态 ============ */

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-card flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground opacity-60" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground/70">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
