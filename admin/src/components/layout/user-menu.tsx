"use client"

import { LogOut, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getErrorMessage } from "@/lib/api/error-message"
import { useAuth } from "@/providers/auth-provider"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const t = useTranslations("auth")
  const c = useTranslations("common")
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) return null

  async function handleLogout() {
    setIsSigningOut(true)
    try {
      await logout()
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-8 gap-2 px-1.5">
            <Avatar className="size-6">
              <AvatarFallback className="text-[0.65rem]">
                {initials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm sm:inline">
              {user.full_name}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {user.full_name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="opacity-70">
          <User />
          {t("myAccount")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onClick={handleLogout}
        >
          <LogOut />
          {isSigningOut ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
