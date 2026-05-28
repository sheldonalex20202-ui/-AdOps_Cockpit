import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    return ok({ user: await requireUser() });
  } catch (error) {
    return fail(error);
  }
}
