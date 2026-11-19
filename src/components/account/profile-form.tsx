"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/actions/account";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/auth";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: UpdateProfileInput;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateProfileInput) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.success) {
        setFeedback({ type: "success", message: "Профиль обновлён" });
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Ошибка сохранения",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input value={email} disabled />
          <FormDescription>
            Email используется для входа и нельзя поменять. Билеты приходят на него.
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ссылка на аватар (опционально)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Прямая ссылка на изображение. В дипломе заменю на загрузку файла со своего устройства.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {feedback && (
          <p
            className={
              feedback.type === "success"
                ? "flex items-center gap-2 text-sm text-green-600"
                : "text-sm text-destructive"
            }
          >
            {feedback.type === "success" && (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {feedback.message}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </form>
    </Form>
  );
}
