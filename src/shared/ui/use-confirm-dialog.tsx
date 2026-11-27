import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

type Confirmation = {
  title: string;
  description?: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel?: (() => void) | undefined;
};

export function useConfirmDialog() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const confirmed = useRef(false);
  const confirm = useCallback((next: Confirmation) => {
    confirmed.current = false;
    setRequest(next);
  }, []);

  const dialog = (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) {
          if (!confirmed.current) request?.onCancel?.();
          setRequest(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? (
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() => {
              const action = request?.onConfirm;
              confirmed.current = true;
              setRequest(null);
              action?.();
            }}
          >
            {request?.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
