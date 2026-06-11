import { requireUser } from "@/lib/session";
import { ReportForm } from "./report-form";

export default async function ReportPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Report an issue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your report is checked against nearby issues. If others reported the same
          problem, you&apos;ll join their issue to raise its community impact — and you
          still get your own tracking ID.
        </p>
      </div>
      <ReportForm
        defaults={{
          wardNumber: user.wardNumber,
          municipalityName: user.municipalityName,
          districtName: user.districtName,
          provinceName: user.provinceName,
        }}
      />
    </div>
  );
}
