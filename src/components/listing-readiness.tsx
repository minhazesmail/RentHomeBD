"use client";

import { useLocale } from "@/i18n/use-locale";
import { getOwnerEditorCopy } from "@/i18n/owner-editor-copy";
import { formatWorkflowText } from "@/i18n/workflow-copy";

type Props = {
  title: string;
  description: string;
  addressText: string;
  propertyType: string;
  rent: string;
  availableFrom: string;
  floorNumber: string;
  bedrooms: string;
  bathrooms: string;
  tenantTypes: string[];
  amenities: string[];
  utilities: string[];
  hasExactPin: boolean;
  hasPhoto: boolean;
};

type Check = {
  label: string;
  detail: string;
  done: boolean;
};

function positiveNumber(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
}

export function ListingReadiness({
  title,
  description,
  addressText,
  propertyType,
  rent,
  availableFrom,
  floorNumber,
  bedrooms,
  bathrooms,
  tenantTypes,
  amenities,
  utilities,
  hasExactPin,
  hasPhoto,
}: Props) {
  const { locale, formatNumber } = useLocale();
  const copy = getOwnerEditorCopy(locale).readiness;
  const essentials: Check[] = [
    { label: copy.checks.basics[0], detail: copy.checks.basics[1], done: title.trim().length >= 5 && Boolean(propertyType) && positiveNumber(rent) && Boolean(availableFrom) },
    { label: copy.checks.tenant[0], detail: copy.checks.tenant[1], done: tenantTypes.length > 0 },
    { label: copy.checks.pin[0], detail: copy.checks.pin[1], done: hasExactPin },
    { label: copy.checks.photo[0], detail: copy.checks.photo[1], done: hasPhoto },
  ];

  const floor = Number(floorNumber);
  const isUpperFloor = Number.isFinite(floor) && floor >= 3;
  const isWholeHome = propertyType === "apartment" || propertyType === "house" || propertyType === "sublet";
  const descriptionLower = description.toLowerCase();
  const mentionsExtras = ["service charge", "utility", "utilities", "gas bill", "electricity", "water bill", "সার্ভিস চার্জ", "ইউটিলিটি", "গ্যাস", "বিদ্যুৎ", "পানি"].some((term) => descriptionLower.includes(term));

  const helpful: Check[] = [
    { label: copy.checks.address[0], detail: copy.checks.address[1], done: addressText.trim().length >= 8 },
    { label: copy.checks.rooms[0], detail: copy.checks.rooms[1], done: !isWholeHome || (positiveNumber(bedrooms) && positiveNumber(bathrooms)) },
    { label: (isUpperFloor ? copy.checks.floorLiftUpper : copy.checks.floorLift)[0], detail: (isUpperFloor ? copy.checks.floorLiftUpper : copy.checks.floorLift)[1], done: !isWholeHome || Boolean(floorNumber.trim()) && (!isUpperFloor || amenities.includes("lift")) },
    { label: copy.checks.waterSecurity[0], detail: copy.checks.waterSecurity[1], done: amenities.includes("water-supply") || amenities.includes("security") || amenities.includes("cctv") || descriptionLower.includes("water") || descriptionLower.includes("security") || descriptionLower.includes("পানি") || descriptionLower.includes("নিরাপত্তা") },
    { label: copy.checks.extras[0], detail: copy.checks.extras[1], done: utilities.length > 0 || mentionsExtras },
    { label: copy.checks.description[0], detail: copy.checks.description[1], done: description.trim().length >= 120 },
  ];

  const completedEssentials = essentials.filter((item) => item.done).length;
  const completedHelpful = helpful.filter((item) => item.done).length;
  const essentialsReady = completedEssentials === essentials.length;
  const progressValues = { complete: formatNumber(completedEssentials), total: formatNumber(essentials.length) };

  return (
    <aside className={`listing-readiness${essentialsReady ? " ready" : ""}`} aria-label={copy.aria}>
      <div className="listing-readiness-head">
        <div>
          <span className="listing-readiness-eyebrow">{copy.eyebrow}</span>
          <h2>{essentialsReady ? copy.readyTitle : formatWorkflowText(copy.progressTitle, progressValues)}</h2>
          <p>{copy.intro}</p>
        </div>
        <div className="listing-readiness-score" aria-label={formatWorkflowText(copy.scoreAria, progressValues)}>
          <strong>{formatNumber(completedEssentials)}/{formatNumber(essentials.length)}</strong>
          <span>{copy.essentials}</span>
        </div>
      </div>

      <div className="listing-readiness-columns">
        <section>
          <h3>{copy.required}</h3>
          <div className="listing-check-list">
            {essentials.map((item) => <div className={`listing-check${item.done ? " done" : ""}`} key={item.label}><span aria-hidden="true">{item.done ? "✓" : "!"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}
          </div>
        </section>
        <section>
          <h3>{copy.helpful} <small>{formatNumber(completedHelpful)}/{formatNumber(helpful.length)}</small></h3>
          <div className="listing-check-list">
            {helpful.map((item) => <div className={`listing-check helpful${item.done ? " done" : ""}`} key={item.label}><span aria-hidden="true">{item.done ? "✓" : "+"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}
          </div>
        </section>
      </div>
    </aside>
  );
}
