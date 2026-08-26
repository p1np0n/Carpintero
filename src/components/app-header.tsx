import Link from "next/link";
import { Hammer, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

export function AppHeader({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Hammer className="size-5 text-primary" />
        Carpintero
      </Link>
      <div className="flex items-center gap-2">
        {userEmail && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/materiales">
              <Layers /> Materiales
            </Link>
          </Button>
        )}
        <ThemeToggle />
        {userEmail && <UserMenu email={userEmail} />}
      </div>
    </header>
  );
}
