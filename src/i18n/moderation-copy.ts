import type { Locale } from "@/i18n/config";

const moderationCopy = {
  en: {
    nav: { aria: "Moderation workbench", listings: "Listing reviews", reports: "Reports", accounts: "Accounts", dashboard: "Dashboard" },
    common: {
      moderation: "Moderation", trustSafety: "Trust & safety", trustModeration: "Trust moderation",
      untitled: "Untitled listing", reportedListing: "Reported listing", noAddress: "No address", typeMissing: "Type missing",
      owner: "owner", agent: "agent", user: "user", unnamedOwner: "Unnamed owner", unnamedAccount: "Unnamed account", nearbashaUser: "a NearBasha user",
      previous: "Previous", next: "Next", of: "{current} of {total}", phoneVerified: "Phone verified", phoneNotVerified: "Phone not verified",
      roleVerified: "Verified {role} role", roleNotVerified: "{role} role not verified", legalDisclaimer: "NearBasha trust badges are platform moderation signals, not proof of government identity, legal property ownership, or authority to rent the property.",
    },
    listings: {
      title: "Review queue", intro: "Process listings, safety reports, and account trust reviews from one operational workbench.",
      approved: "Listing approved and published for 14 days.", rejected: "Listing returned to the owner with reviewer notes.",
      waitingOne: "{count} listing waiting", waitingMany: "{count} listings waiting", oldest: "Oldest submissions appear first.",
      clearTitle: "Queue is clear", clearCopy: "There are no listings waiting for review.", needsReview: "Needs review", rentMissing: "Rent missing", perMonth: "/mo",
    },
    listingDetail: {
      eyebrow: "Moderation review", submittedBy: "Submitted by {name} · {role}", back: "Back to queue",
      approvedNotice: "Previous listing approved. Continue with this review.", rejectedNotice: "Previous listing returned to its owner. Continue with this review.",
      attentionAria: "Review attention summary", phone: "Phone", roleBadge: "Role badge", reports: "Reports", noReports: "No prior reports", priorReportOne: "{count} prior report", priorReportMany: "{count} prior reports",
      location: "Location", exactPin: "Exact pin present", pinMissing: "Pin missing", media: "Media", photoOne: "{count} photo", photoMany: "{count} photos", description: "Description", detailed: "Detailed", shortCopy: "Review short copy",
      details: "Listing details", detailsHint: "Check completeness and consistency before publishing.", type: "Type", rent: "Monthly rent", deposit: "Deposit", available: "Available from", bedrooms: "Bedrooms", bathrooms: "Bathrooms", size: "Size", floor: "Floor", furnishing: "Furnishing", gender: "Gender preference",
      tenantAmenities: "Tenant fit & amenities", tenantHint: "Verify the structured preferences match the description.", tenantTypes: "Tenant types", amenities: "Amenities", utilities: "Utilities included",
      locationTitle: "Location", locationHint: "Confirm the pin matches the stated address.", iframe: "Submitted property location",
      mediaTitle: "Media", mediaHint: "Check that photos clearly represent the property.", mediaAlt: "Submitted property", mediaUnavailable: "Media unavailable", queueAria: "Review queue navigation",
    },
    decision: {
      title: "Decision", hint: "Approval publishes immediately. Rejection requires a reason.", notes: "Reviewer notes", placeholder: "Required when rejecting. Optional when approving.", requireReject: "Add a short reason before rejecting the listing.", reject: "Reject with notes", rejecting: "Rejecting…", approve: "Approve listing", approveNext: "Approve & next", approving: "Approving…",
    },
    reports: {
      title: "Listing reports", intro: "Review renter-submitted safety and accuracy reports. Hiding a listing removes it from public search immediately.", hidden: "Listing hidden and report closed.", closed: "Report closed and decision recorded.", openOne: "{count} open report", openMany: "{count} open reports", oldest: "Oldest reports appear first.", clearTitle: "No open reports", clearCopy: "The trust and safety queue is clear.", openStatus: "Open report",
      reasons: { fake_listing: "Fake or misleading", wrong_location: "Wrong location", unavailable: "Already unavailable", scam_suspicion: "Possible scam", discrimination: "Discrimination", inappropriate_content: "Inappropriate content", duplicate: "Duplicate listing", other: "Other" } as Record<string, string>,
    },
    reportDetail: {
      eyebrow: "Trust & safety review", reportFrom: "Report from {name} · {date}", back: "Back to reports", hiddenNotice: "Previous listing was hidden and its report closed.", closedNotice: "Previous report was closed. Continue with this review.",
      report: "Report", reportHint: "Review the renter's reason and supporting details.", reason: "Reason", reporterRole: "Reporter role", details: "Details", noDetails: "No additional details were provided.",
      current: "Current listing", currentHint: "Check the current public state before deciding.", status: "Status", type: "Type", rent: "Rent", address: "Address", openPublic: "Open public listing", queueAria: "Report queue navigation",
    },
    reportActions: {
      title: "Resolve report", hint: "Decisions are recorded in the audit trail.", notes: "Moderator notes", placeholder: "Required when hiding a listing.", requireHide: "Add a short moderator note before hiding the listing.", dismiss: "Dismiss report", resolve: "Resolve", resolveNext: "Resolve & next", hide: "Hide listing", hideNext: "Hide listing & next",
    },
    accounts: {
      title: "Account verification", intro: "Review owner and agent trust signals. Role badges are NearBasha moderation signals, not proof of legal identity or property ownership.", verifiedNotice: "Account badge issued and synced to live listings.", revokedNotice: "Account badge revoked and removed from live listings.", withoutOne: "{count} account without a role badge", withoutMany: "{count} accounts without a role badge", totalOne: "{count} owner/agent account in total.", totalMany: "{count} owner/agent accounts in total.", emptyTitle: "No owner or agent accounts yet", emptyCopy: "Eligible accounts will appear here once they sign up.", joined: "{role} · joined {date}", noRoleBadge: "No role badge", reviewHint: "Check the available account signals before issuing or revoking a role badge. The badge must never be presented as government-ID or legal-ownership verification.",
    },
    profileActions: {
      note: "Moderator note", revokePlaceholder: "Required when revoking a badge.", verifyPlaceholder: "Optional internal context for this review.", self: "Self-verification is disabled. Another moderator must review this account.", revokeNote: "Add a short moderator note before revoking this badge.", revoke: "Revoke badge", issue: "Issue verified role badge", selfError: "You cannot issue or revoke a verification badge on your own account.", already: "This account is already verified.", notVerified: "This account is not currently verified.", roleOnly: "Only owner or agent accounts can receive a verified-role badge.", moderatorRequired: "Moderator access is required for this action.", generic: "Could not update this account's verification status. Refresh and try again.",
    },
  },
  bn: {
    nav: { aria: "মডারেশন কর্মক্ষেত্র", listings: "লিস্টিং রিভিউ", reports: "রিপোর্ট", accounts: "অ্যাকাউন্ট", dashboard: "ড্যাশবোর্ড" },
    common: {
      moderation: "মডারেশন", trustSafety: "আস্থা ও নিরাপত্তা", trustModeration: "আস্থা মডারেশন",
      untitled: "শিরোনামহীন লিস্টিং", reportedListing: "রিপোর্ট করা লিস্টিং", noAddress: "ঠিকানা নেই", typeMissing: "ধরন নেই",
      owner: "মালিক", agent: "এজেন্ট", user: "ব্যবহারকারী", unnamedOwner: "নামহীন মালিক", unnamedAccount: "নামহীন অ্যাকাউন্ট", nearbashaUser: "একজন NearBasha ব্যবহারকারী",
      previous: "আগেরটি", next: "পরেরটি", of: "{total}-এর মধ্যে {current}", phoneVerified: "ফোন যাচাইকৃত", phoneNotVerified: "ফোন যাচাই হয়নি",
      roleVerified: "যাচাইকৃত {role} ভূমিকা", roleNotVerified: "{role} ভূমিকা যাচাই হয়নি", legalDisclaimer: "NearBasha আস্থা ব্যাজ প্ল্যাটফর্ম মডারেশন সংকেত; এটি সরকারি পরিচয়, আইনি সম্পত্তির মালিকানা বা ভাড়া দেওয়ার অধিকার প্রমাণ করে না।",
    },
    listings: {
      title: "রিভিউ কিউ", intro: "একটি অপারেশনাল কর্মক্ষেত্র থেকে লিস্টিং, নিরাপত্তা রিপোর্ট ও অ্যাকাউন্ট আস্থা রিভিউ করুন।",
      approved: "লিস্টিং অনুমোদিত হয়েছে এবং ১৪ দিনের জন্য প্রকাশিত হয়েছে।", rejected: "রিভিউয়ার নোটসহ লিস্টিং মালিককে ফেরত দেওয়া হয়েছে।",
      waitingOne: "{count}টি লিস্টিং অপেক্ষায়", waitingMany: "{count}টি লিস্টিং অপেক্ষায়", oldest: "সবচেয়ে পুরোনো সাবমিশন আগে দেখানো হয়।",
      clearTitle: "কিউ খালি", clearCopy: "রিভিউয়ের অপেক্ষায় কোনো লিস্টিং নেই।", needsReview: "রিভিউ দরকার", rentMissing: "ভাড়া নেই", perMonth: "/মাস",
    },
    listingDetail: {
      eyebrow: "মডারেশন রিভিউ", submittedBy: "জমা দিয়েছেন {name} · {role}", back: "কিউতে ফিরুন",
      approvedNotice: "আগের লিস্টিং অনুমোদিত হয়েছে। এই রিভিউ চালিয়ে যান।", rejectedNotice: "আগের লিস্টিং মালিককে ফেরত দেওয়া হয়েছে। এই রিভিউ চালিয়ে যান।",
      attentionAria: "রিভিউ নজরদারি সারাংশ", phone: "ফোন", roleBadge: "ভূমিকা ব্যাজ", reports: "রিপোর্ট", noReports: "আগের রিপোর্ট নেই", priorReportOne: "আগের {count}টি রিপোর্ট", priorReportMany: "আগের {count}টি রিপোর্ট",
      location: "লোকেশন", exactPin: "সঠিক পিন আছে", pinMissing: "পিন নেই", media: "মিডিয়া", photoOne: "{count}টি ছবি", photoMany: "{count}টি ছবি", description: "বিবরণ", detailed: "বিস্তারিত", shortCopy: "ছোট বিবরণ রিভিউ করুন",
      details: "লিস্টিং বিস্তারিত", detailsHint: "প্রকাশের আগে সম্পূর্ণতা ও সামঞ্জস্য যাচাই করুন।", type: "ধরন", rent: "মাসিক ভাড়া", deposit: "জামানত", available: "উপলভ্য", bedrooms: "বেডরুম", bathrooms: "বাথরুম", size: "আকার", floor: "তলা", furnishing: "ফার্নিশিং", gender: "লিঙ্গ পছন্দ",
      tenantAmenities: "ভাড়াটিয়া-মিল ও সুবিধা", tenantHint: "গঠনগত পছন্দগুলো বিবরণের সঙ্গে মেলে কি না দেখুন।", tenantTypes: "ভাড়াটিয়ার ধরন", amenities: "সুবিধা", utilities: "অন্তর্ভুক্ত ইউটিলিটি",
      locationTitle: "লোকেশন", locationHint: "পিনটি লিখিত ঠিকানার সঙ্গে মেলে কি না নিশ্চিত করুন।", iframe: "জমা দেওয়া প্রপার্টির লোকেশন",
      mediaTitle: "মিডিয়া", mediaHint: "ছবিগুলো প্রপার্টিটিকে স্পষ্টভাবে উপস্থাপন করে কি না দেখুন।", mediaAlt: "জমা দেওয়া প্রপার্টি", mediaUnavailable: "মিডিয়া পাওয়া যাচ্ছে না", queueAria: "রিভিউ কিউ নেভিগেশন",
    },
    decision: {
      title: "সিদ্ধান্ত", hint: "অনুমোদন করলে সঙ্গে সঙ্গে প্রকাশিত হবে। প্রত্যাখ্যানে কারণ আবশ্যক।", notes: "রিভিউয়ার নোট", placeholder: "প্রত্যাখ্যানের সময় আবশ্যক। অনুমোদনে ঐচ্ছিক।", requireReject: "লিস্টিং প্রত্যাখ্যানের আগে সংক্ষিপ্ত কারণ লিখুন।", reject: "নোটসহ প্রত্যাখ্যান", rejecting: "প্রত্যাখ্যান হচ্ছে…", approve: "লিস্টিং অনুমোদন", approveNext: "অনুমোদন ও পরেরটি", approving: "অনুমোদন হচ্ছে…",
    },
    reports: {
      title: "লিস্টিং রিপোর্ট", intro: "ভাড়াটিয়ার জমা দেওয়া নিরাপত্তা ও নির্ভুলতা রিপোর্ট রিভিউ করুন। লিস্টিং লুকালে সঙ্গে সঙ্গে পাবলিক সার্চ থেকে সরবে।", hidden: "লিস্টিং লুকানো হয়েছে এবং রিপোর্ট বন্ধ হয়েছে।", closed: "রিপোর্ট বন্ধ হয়েছে এবং সিদ্ধান্ত রেকর্ড হয়েছে।", openOne: "{count}টি খোলা রিপোর্ট", openMany: "{count}টি খোলা রিপোর্ট", oldest: "সবচেয়ে পুরোনো রিপোর্ট আগে দেখানো হয়।", clearTitle: "খোলা রিপোর্ট নেই", clearCopy: "আস্থা ও নিরাপত্তা কিউ খালি।", openStatus: "খোলা রিপোর্ট",
      reasons: { fake_listing: "ভুয়া বা বিভ্রান্তিকর", wrong_location: "ভুল লোকেশন", unavailable: "ইতিমধ্যে অনুপলভ্য", scam_suspicion: "প্রতারণার সন্দেহ", discrimination: "বৈষম্য", inappropriate_content: "অনুপযুক্ত কনটেন্ট", duplicate: "ডুপ্লিকেট লিস্টিং", other: "অন্যান্য" } as Record<string, string>,
    },
    reportDetail: {
      eyebrow: "আস্থা ও নিরাপত্তা রিভিউ", reportFrom: "রিপোর্ট করেছেন {name} · {date}", back: "রিপোর্টে ফিরুন", hiddenNotice: "আগের লিস্টিং লুকানো হয়েছে এবং রিপোর্ট বন্ধ হয়েছে।", closedNotice: "আগের রিপোর্ট বন্ধ হয়েছে। এই রিভিউ চালিয়ে যান।",
      report: "রিপোর্ট", reportHint: "ভাড়াটিয়ার কারণ ও সহায়ক বিস্তারিত দেখুন।", reason: "কারণ", reporterRole: "রিপোর্টকারীর ভূমিকা", details: "বিস্তারিত", noDetails: "অতিরিক্ত বিস্তারিত দেওয়া হয়নি।",
      current: "বর্তমান লিস্টিং", currentHint: "সিদ্ধান্তের আগে বর্তমান পাবলিক অবস্থা দেখুন।", status: "অবস্থা", type: "ধরন", rent: "ভাড়া", address: "ঠিকানা", openPublic: "পাবলিক লিস্টিং খুলুন", queueAria: "রিপোর্ট কিউ নেভিগেশন",
    },
    reportActions: {
      title: "রিপোর্ট সমাধান", hint: "সিদ্ধান্ত অডিট ট্রেইলে রেকর্ড হয়।", notes: "মডারেটর নোট", placeholder: "লিস্টিং লুকানোর সময় আবশ্যক।", requireHide: "লিস্টিং লুকানোর আগে সংক্ষিপ্ত মডারেটর নোট লিখুন।", dismiss: "রিপোর্ট বাতিল", resolve: "সমাধান", resolveNext: "সমাধান ও পরেরটি", hide: "লিস্টিং লুকান", hideNext: "লুকান ও পরেরটি",
    },
    accounts: {
      title: "অ্যাকাউন্ট যাচাই", intro: "মালিক ও এজেন্টের আস্থা সংকেত রিভিউ করুন। ভূমিকা ব্যাজ NearBasha মডারেশন সংকেত; এটি আইনি পরিচয় বা সম্পত্তির মালিকানার প্রমাণ নয়।", verifiedNotice: "অ্যাকাউন্ট ব্যাজ দেওয়া হয়েছে এবং লাইভ লিস্টিংয়ে সিঙ্ক হয়েছে।", revokedNotice: "অ্যাকাউন্ট ব্যাজ বাতিল হয়েছে এবং লাইভ লিস্টিং থেকে সরেছে।", withoutOne: "ভূমিকা ব্যাজ ছাড়া {count}টি অ্যাকাউন্ট", withoutMany: "ভূমিকা ব্যাজ ছাড়া {count}টি অ্যাকাউন্ট", totalOne: "মোট {count}টি মালিক/এজেন্ট অ্যাকাউন্ট।", totalMany: "মোট {count}টি মালিক/এজেন্ট অ্যাকাউন্ট।", emptyTitle: "এখনও মালিক বা এজেন্ট অ্যাকাউন্ট নেই", emptyCopy: "যোগ্য অ্যাকাউন্ট সাইন আপ করলে এখানে দেখা যাবে।", joined: "{role} · যোগ দিয়েছেন {date}", noRoleBadge: "ভূমিকা ব্যাজ নেই", reviewHint: "ব্যাজ দেওয়া বা বাতিলের আগে উপলভ্য অ্যাকাউন্ট সংকেত দেখুন। ব্যাজকে কখনো সরকারি পরিচয় বা আইনি মালিকানা যাচাই হিসেবে উপস্থাপন করা যাবে না।",
    },
    profileActions: {
      note: "মডারেটর নোট", revokePlaceholder: "ব্যাজ বাতিলের সময় আবশ্যক।", verifyPlaceholder: "এই রিভিউয়ের জন্য ঐচ্ছিক অভ্যন্তরীণ প্রসঙ্গ।", self: "নিজের অ্যাকাউন্ট নিজে যাচাই করা যাবে না। অন্য মডারেটরকে রিভিউ করতে হবে।", revokeNote: "ব্যাজ বাতিলের আগে সংক্ষিপ্ত মডারেটর নোট লিখুন।", revoke: "ব্যাজ বাতিল", issue: "যাচাইকৃত ভূমিকা ব্যাজ দিন", selfError: "নিজের অ্যাকাউন্টে যাচাই ব্যাজ দেওয়া বা বাতিল করা যাবে না।", already: "এই অ্যাকাউন্ট ইতিমধ্যে যাচাইকৃত।", notVerified: "এই অ্যাকাউন্ট বর্তমানে যাচাইকৃত নয়।", roleOnly: "শুধু মালিক বা এজেন্ট অ্যাকাউন্ট যাচাইকৃত-ভূমিকা ব্যাজ পেতে পারে।", moderatorRequired: "এই কাজের জন্য মডারেটর অ্যাক্সেস দরকার।", generic: "অ্যাকাউন্ট যাচাই অবস্থা হালনাগাদ করা যায়নি। রিফ্রেশ করে আবার চেষ্টা করুন।",
    },
  },
} as const;

export type ModerationCopy = (typeof moderationCopy)[Locale];
export function getModerationCopy(locale: Locale) { return moderationCopy[locale]; }
export function formatModerationText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}
