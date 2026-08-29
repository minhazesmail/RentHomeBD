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
  const essentials: Check[] = [
    { label: "Clear listing basics", detail: "Add a useful title, property type, monthly rent, and availability date.", done: title.trim().length >= 5 && Boolean(propertyType) && positiveNumber(rent) && Boolean(availableFrom) },
    { label: "Tenant fit selected", detail: "Choose who the home is suitable for so mismatched renters can filter it out.", done: tenantTypes.length > 0 },
    { label: "Exact entrance pin", detail: "Place the map pin on the actual building entrance or gate.", done: hasExactPin },
    { label: "At least one property photo", detail: "A real photo is required before the listing can be reviewed.", done: hasPhoto },
  ];

  const floor = Number(floorNumber);
  const isUpperFloor = Number.isFinite(floor) && floor >= 3;
  const isWholeHome = propertyType === "apartment" || propertyType === "house" || propertyType === "sublet";
  const descriptionLower = description.toLowerCase();
  const mentionsExtras = ["service charge", "utility", "utilities", "gas bill", "electricity", "water bill"].some((term) => descriptionLower.includes(term));

  const helpful: Check[] = [
    { label: "Specific address / landmark", detail: "Road, block, nearby landmark, or building name helps renters recognize the location before contacting you.", done: addressText.trim().length >= 8 },
    { label: "Room count", detail: "Bedrooms and bathrooms are among the fastest ways renters compare full-home listings.", done: !isWholeHome || (positiveNumber(bedrooms) && positiveNumber(bathrooms)) },
    { label: "Floor and lift clarity", detail: isUpperFloor ? "For an upper-floor home, confirm whether a lift is available." : "Add the floor when it matters, and select Lift if the building has one.", done: !isWholeHome || Boolean(floorNumber.trim()) && (!isUpperFloor || amenities.includes("lift")) },
    { label: "Water and security details", detail: "Select Water supply and Security/CCTV when available, or explain any important limitations in the description.", done: amenities.includes("water-supply") || amenities.includes("security") || amenities.includes("cctv") || descriptionLower.includes("water") || descriptionLower.includes("security") },
    { label: "Monthly extras are clear", detail: "Say what is included in rent and clarify service charge or utility costs to reduce repetitive calls.", done: utilities.length > 0 || mentionsExtras },
    { label: "Useful description", detail: "Mention building rules, transport/landmarks, move-in conditions, and anything a renter should know before visiting.", done: description.trim().length >= 120 },
  ];

  const completedEssentials = essentials.filter((item) => item.done).length;
  const completedHelpful = helpful.filter((item) => item.done).length;
  const essentialsReady = completedEssentials === essentials.length;

  return (
    <aside className={`listing-readiness${essentialsReady ? " ready" : ""}`} aria-label="Listing readiness">
      <div className="listing-readiness-head">
        <div>
          <span className="listing-readiness-eyebrow">Listing readiness</span>
          <h2>{essentialsReady ? "Ready for the review checks" : `${completedEssentials}/${essentials.length} submission essentials complete`}</h2>
          <p>Finish the essentials, then use the renter-confidence prompts to reduce avoidable questions and mismatched enquiries.</p>
        </div>
        <div className="listing-readiness-score" aria-label={`${completedEssentials} of ${essentials.length} essentials complete`}>
          <strong>{completedEssentials}/{essentials.length}</strong>
          <span>essentials</span>
        </div>
      </div>

      <div className="listing-readiness-columns">
        <section>
          <h3>Required for review</h3>
          <div className="listing-check-list">
            {essentials.map((item) => <div className={`listing-check${item.done ? " done" : ""}`} key={item.label}><span aria-hidden="true">{item.done ? "✓" : "!"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}
          </div>
        </section>
        <section>
          <h3>Helps renters decide faster <small>{completedHelpful}/{helpful.length}</small></h3>
          <div className="listing-check-list">
            {helpful.map((item) => <div className={`listing-check helpful${item.done ? " done" : ""}`} key={item.label}><span aria-hidden="true">{item.done ? "✓" : "+"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}
          </div>
        </section>
      </div>
    </aside>
  );
}
