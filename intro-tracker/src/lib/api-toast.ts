import { toast } from "sonner";

export async function toastIfError(res: Response, fallback = "Request failed"): Promise<boolean> {
  if (res.ok) return false;
  let message = fallback;
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") message = body.error;
  } catch {
    // not JSON
  }
  toast.error(message);
  return true;
}
