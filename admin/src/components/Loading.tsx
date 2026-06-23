import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-screen items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">加载中...</p>
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

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}

export function AdminOrdersPageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <SkeletonList count={5} />
    </div>
  );
}

export function AdminProductsPageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-44" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function AdminUsersPageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
      <SkeletonList count={6} />
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
