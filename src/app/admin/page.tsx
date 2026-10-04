import { DemoAdminTour } from "@/components/DemoAdminTour";
import { OverviewContent } from "@/components/admin/OverviewContent";

export default async function AdminOverviewPage() {
  return (
    <>
      <DemoAdminTour />
      <OverviewContent />
    </>
  );
}
