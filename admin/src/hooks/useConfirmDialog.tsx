import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, resolve });
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setState(null);
  }, []);

  const ConfirmDialogComponent = state ? (
    <Dialog open={!!state} onOpenChange={(open) => { if (!open) handleClose(false); }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>确认操作</DialogTitle>
          <DialogDescription>{state.message}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="flex-1 rounded-full bg-white/60 backdrop-blur-sm"
          >
            取消
          </Button>
          <Button
            onClick={() => handleClose(true)}
            className="flex-1 glass-button"
          >
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  return { confirm, ConfirmDialogComponent };
}
