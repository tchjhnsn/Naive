import { enrollWaitlistRequest } from "@/lib/waitlist-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (request: Request) => enrollWaitlistRequest(request);
