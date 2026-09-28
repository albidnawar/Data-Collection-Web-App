import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTodayAttendance } from "@/lib/attendance";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attendance = await getTodayAttendance(session.user.id);

  const mode: "clockin" | "clockout" | "done" = !attendance
    ? "clockin"
    : !attendance.clockOutAt
      ? "clockout"
      : "done";

  return (
    <AttendanceClient
      mode={mode}
      clockInAt={attendance?.clockInAt.toISOString() ?? null}
      clockOutAt={attendance?.clockOutAt?.toISOString() ?? null}
    />
  );
}
