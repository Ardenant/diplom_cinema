"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserRoleAction } from "@/lib/actions/admin";

export function UserRoleSwitcher({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: "CLIENT" | "ADMIN";
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(role: string) {
    if (role === currentRole) return;
    startTransition(() => {
      void setUserRoleAction(userId, role as "CLIENT" | "ADMIN");
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        defaultValue={currentRole}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CLIENT">Клиент</SelectItem>
          <SelectItem value="ADMIN">Админ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
