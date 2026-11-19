// Route handler для NextAuth. Принимает все /api/auth/* запросы (signin, signout, callback).
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
