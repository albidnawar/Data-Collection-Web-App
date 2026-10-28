import { auth } from "@/auth";
import { CaptureForm } from "@/components/CaptureForm";

export default async function CapturePage() {
  const session = await auth();
  const requiresOutletCapture = session?.user?.role === "pran";

  return <CaptureForm requiresOutletCapture={requiresOutletCapture} />;
}
