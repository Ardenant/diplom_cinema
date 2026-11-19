import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  });

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Профиль
      </h1>
      <ProfileForm
        email={user.email}
        defaultValues={{
          name: user.name ?? "",
          image: user.image ?? "",
        }}
      />
    </div>
  );
}
