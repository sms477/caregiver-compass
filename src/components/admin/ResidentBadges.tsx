import { Badge } from "@/components/ui/badge";
import { Phone, AlertTriangle, ShieldAlert } from "lucide-react";
import { DBResident } from "@/hooks/useResidents";
import { differenceInDays, parseISO } from "date-fns";

export const ResidentBadges = ({ resident }: { resident: DBResident }) => (
  <div className="flex flex-wrap gap-1.5">
    {resident.is_hospice && (
      <Badge className="bg-purple-600 text-white hover:bg-purple-700 text-[10px] px-1.5 py-0">
        HOSPICE
      </Badge>
    )}
    {resident.is_non_ambulatory && (
      <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[10px] px-1.5 py-0">
        NON-AMB
      </Badge>
    )}
    {resident.dnr_on_file && (
      <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] px-1.5 py-0">
        DNR
      </Badge>
    )}
  </div>
);

export const AcuityTag = ({ resident }: { resident: DBResident }) => {
  const level = resident.care_level;
  const colorClass =
    level === "High Acuity"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : level === "Level 2"
        ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
        : "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
        {level}
      </span>
      <span className="text-xs text-muted-foreground">
        Acuity: <strong className="text-foreground">{resident.acuity_score}</strong> pts
      </span>
    </div>
  );
};

export const HospiceEmergencyCard = ({ resident }: { resident: DBResident }) => {
  if (!resident.is_hospice || !resident.hospice_agency) return null;
  const agency = resident.hospice_agency;

  return (
    <div className="rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 p-3 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
          Hospice Emergency — {agency.name}
        </p>
        {agency.nurse_phone_24h && (
          <a
            href={`tel:${agency.nurse_phone_24h}`}
            className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-400 hover:underline"
          >
            <Phone className="w-3.5 h-3.5" /> Call Nurse 24h: {agency.nurse_phone_24h}
          </a>
        )}
        {agency.office_phone && (
          <p className="text-xs text-muted-foreground">Office: {agency.office_phone}</p>
        )}
      </div>
    </div>
  );
};

export const ComplianceCountdown = ({ resident }: { resident: DBResident }) => {
  if (!resident.lic602a_expiry) return null;

  const expiry = parseISO(resident.lic602a_expiry);
  const daysLeft = differenceInDays(expiry, new Date());
  const isUrgent = daysLeft < 30;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
      <span className={isUrgent ? "text-destructive font-semibold" : "text-muted-foreground"}>
        LIC 602A expires: {resident.lic602a_expiry}
        {isUrgent ? ` (${daysLeft <= 0 ? "EXPIRED" : `${daysLeft}d left`})` : ""}
      </span>
    </div>
  );
};
