import type { Locale } from "@/i18n/config";

const en = {
  editPage: {
    eyebrow: "Owner workspace · Edit listing",
    title: "Edit listing",
    description: "Review one renter-facing step at a time. Changes stay private until the listing passes moderation again.",
  },
  workflow: {
    createAria: "Listing creation workflow",
    editAria: "Listing editing workflow",
    createStepsAria: "Listing creation steps",
    editStepsAria: "Listing editing steps",
    createListing: "Create listing",
    editListing: "Edit listing",
    stepOf: "Step {step} of {total}",
    ready: "{complete}/{total} ready",
    back: "Back",
    continue: "Continue",
    hint: "Save a draft anytime. Submission checks apply when you send the listing for review.",
    steps: [
      { label: "Basics & rent", short: "Basics" },
      { label: "Home details", short: "Details" },
      { label: "Renter fit", short: "Renter fit" },
      { label: "Exact map pin", short: "Location" },
      { label: "Photos & video", short: "Media" },
    ],
  },
  readiness: {
    aria: "Listing readiness",
    eyebrow: "Listing readiness",
    readyTitle: "Ready for the review checks",
    progressTitle: "{complete}/{total} submission essentials complete",
    intro: "Finish the essentials, then use the renter-confidence prompts to reduce avoidable questions and mismatched enquiries.",
    scoreAria: "{complete} of {total} essentials complete",
    essentials: "essentials",
    required: "Required for review",
    helpful: "Helps renters decide faster",
    checks: {
      basics: ["Clear listing basics", "Add a useful title, property type, monthly rent, and availability date."],
      tenant: ["Tenant fit selected", "Choose who the home is suitable for so mismatched renters can filter it out."],
      pin: ["Exact entrance pin", "Place the map pin on the actual building entrance or gate."],
      photo: ["At least one property photo", "A real photo is required before the listing can be reviewed."],
      address: ["Specific address / landmark", "Road, block, nearby landmark, or building name helps renters recognize the location before contacting you."],
      rooms: ["Room count", "Bedrooms and bathrooms are among the fastest ways renters compare full-home listings."],
      floorLiftUpper: ["Floor and lift clarity", "For an upper-floor home, confirm whether a lift is available."],
      floorLift: ["Floor and lift clarity", "Add the floor when it matters, and select Lift if the building has one."],
      waterSecurity: ["Water and security details", "Select Water supply and Security/CCTV when available, or explain any important limitations in the description."],
      extras: ["Monthly extras are clear", "Say what is included in rent and clarify service charge or utility costs to reduce repetitive calls."],
      description: ["Useful description", "Mention building rules, transport/landmarks, move-in conditions, and anything a renter should know before visiting."],
    },
  },
} as const;

type OwnerEditorCopy = {
  editPage: { [K in keyof typeof en.editPage]: string };
  workflow: {
    [K in Exclude<keyof typeof en.workflow, "steps">]: string;
  } & { steps: ReadonlyArray<{ label: string; short: string }> };
  readiness: {
    [K in Exclude<keyof typeof en.readiness, "checks">]: string;
  } & {
    checks: { [K in keyof typeof en.readiness.checks]: readonly [string, string] };
  };
};

const bn: OwnerEditorCopy = {
  editPage: {
    eyebrow: "মালিক ওয়ার্কস্পেস · লিস্টিং এডিট",
    title: "লিস্টিং এডিট করুন",
    description: "ভাড়াটিয়ার সামনে দেখা প্রতিটি ধাপ পর্যালোচনা করুন। আবার মডারেশন পাস না করা পর্যন্ত পরিবর্তনগুলো ব্যক্তিগত থাকবে।",
  },
  workflow: {
    createAria: "লিস্টিং তৈরির ধাপ",
    editAria: "লিস্টিং এডিটের ধাপ",
    createStepsAria: "লিস্টিং তৈরির ধাপসমূহ",
    editStepsAria: "লিস্টিং এডিটের ধাপসমূহ",
    createListing: "লিস্টিং তৈরি করুন",
    editListing: "লিস্টিং এডিট করুন",
    stepOf: "ধাপ {step} / {total}",
    ready: "{total}টির মধ্যে {complete}টি প্রস্তুত",
    back: "পেছনে",
    continue: "পরের ধাপ",
    hint: "যেকোনো সময় ড্রাফট সেভ করতে পারেন। রিভিউয়ের জন্য পাঠানোর সময় সাবমিশন যাচাই হবে।",
    steps: [
      { label: "মৌলিক তথ্য ও ভাড়া", short: "মৌলিক" },
      { label: "বাসার বিস্তারিত", short: "বিস্তারিত" },
      { label: "ভাড়াটিয়া-মিল", short: "ভাড়াটিয়া-মিল" },
      { label: "সঠিক ম্যাপ পিন", short: "লোকেশন" },
      { label: "ছবি ও ভিডিও", short: "মিডিয়া" },
    ],
  },
  readiness: {
    aria: "লিস্টিং প্রস্তুতি",
    eyebrow: "লিস্টিং প্রস্তুতি",
    readyTitle: "রিভিউ যাচাইয়ের জন্য প্রস্তুত",
    progressTitle: "সাবমিশনের {total}টির মধ্যে {complete}টি জরুরি কাজ সম্পন্ন",
    intro: "জরুরি কাজগুলো শেষ করুন, তারপর ভাড়াটিয়ার আস্থা বাড়ানোর পরামর্শ ব্যবহার করে অপ্রয়োজনীয় প্রশ্ন ও ভুল-মিলের যোগাযোগ কমান।",
    scoreAria: "{total}টি জরুরি কাজের মধ্যে {complete}টি সম্পন্ন",
    essentials: "জরুরি",
    required: "রিভিউয়ের জন্য আবশ্যক",
    helpful: "ভাড়াটিয়াকে দ্রুত সিদ্ধান্ত নিতে সাহায্য করে",
    checks: {
      basics: ["লিস্টিংয়ের মৌলিক তথ্য পরিষ্কার", "উপযোগী শিরোনাম, প্রপার্টির ধরন, মাসিক ভাড়া ও উপলভ্যতার তারিখ দিন।"],
      tenant: ["ভাড়াটিয়া-মিল বাছাই করা", "বাসাটি কার জন্য উপযুক্ত তা বেছে দিন, যাতে অমিল ভাড়াটিয়া ফিল্টার করতে পারে।"],
      pin: ["সঠিক প্রবেশপথের পিন", "ম্যাপ পিনটি ভবনের আসল প্রবেশপথ বা গেটে বসান।"],
      photo: ["অন্তত একটি প্রপার্টির ছবি", "রিভিউয়ের আগে একটি আসল ছবি আবশ্যক।"],
      address: ["নির্দিষ্ট ঠিকানা / ল্যান্ডমার্ক", "রাস্তা, ব্লক, কাছের ল্যান্ডমার্ক বা ভবনের নাম যোগাযোগের আগে লোকেশন চিনতে সাহায্য করে।"],
      rooms: ["রুমের সংখ্যা", "পূর্ণ বাসা তুলনার দ্রুততম উপায়গুলোর মধ্যে বেডরুম ও বাথরুমের সংখ্যা অন্যতম।"],
      floorLiftUpper: ["ফ্লোর ও লিফট পরিষ্কার", "উপরের ফ্লোরের বাসা হলে লিফট আছে কি না নিশ্চিত করুন।"],
      floorLift: ["ফ্লোর ও লিফট পরিষ্কার", "প্রয়োজন হলে ফ্লোর লিখুন এবং ভবনে লিফট থাকলে Lift নির্বাচন করুন।"],
      waterSecurity: ["পানি ও নিরাপত্তার তথ্য", "পানি সরবরাহ ও Security/CCTV থাকলে নির্বাচন করুন, না হলে গুরুত্বপূর্ণ সীমাবদ্ধতা বিবরণে লিখুন।"],
      extras: ["মাসিক অতিরিক্ত খরচ পরিষ্কার", "ভাড়ায় কী অন্তর্ভুক্ত এবং সার্ভিস চার্জ বা ইউটিলিটি খরচ পরিষ্কার করুন, যাতে একই প্রশ্ন বারবার না আসে।"],
      description: ["উপযোগী বিবরণ", "ভবনের নিয়ম, যাতায়াত/ল্যান্ডমার্ক, ওঠার শর্ত এবং দেখার আগে জানা দরকার এমন তথ্য লিখুন।"],
    },
  },
};

export function getOwnerEditorCopy(locale: Locale): OwnerEditorCopy {
  return locale === "bn" ? bn : en;
}
