import { Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Баллы лояльности" };

export default async function LoyaltyPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { loyaltyPoints: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Баллы лояльности
      </h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-950">
              <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle>Текущий баланс</CardTitle>
              <CardDescription>1 балл = 1 ₽ скидки на следующую покупку</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold">
            {user?.loyaltyPoints ?? 0}
            <span className="text-xl text-muted-foreground ml-2">баллов</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Программа лояльности в разработке. В дипломе подключу начисление и списание баллов:
            5% от стоимости каждой оплаченной покупки буду зачислять на баланс, а при следующем
            оформлении пользователь сможет частично оплатить билет баллами.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
