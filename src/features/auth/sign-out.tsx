import { LogOut } from "lucide-react";
import { Button, type ButtonProps } from "../../shared/ui/button";
import { useSession } from "../../shared/auth/session-context";
import { cn } from "../../shared/utils/cn";

export interface SignOutButtonProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  onSignedOut?: () => void;
  showIcon?: boolean;
}

/** Signing out clears the in-memory session and locks any register credential held for offline selling. */
export function SignOutButton({
  onSignedOut,
  variant = "outline",
  size = "default",
  className,
  showIcon = false,
}: SignOutButtonProps) {
  const { manager } = useSession();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      aria-label="Sign out of your account"
      onClick={() => {
        manager.signOut();
        onSignedOut?.();
      }}
    >
      {showIcon ? <LogOut className="size-4" aria-hidden /> : null}
      Sign out
    </Button>
  );
}
