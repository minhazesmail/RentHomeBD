import type { Locale } from "@/i18n/config";

type InformationCopy = {
  common: {
    onThisPage: string;
    browseHomes: string;
    backHome: string;
    readTerms: string;
    readPrivacy: string;
  };
  about: {
    eyebrow: string;
    title: string;
    intro: string;
    principlesAria: string;
    locationTitle: string;
    locationBody: string;
    compatibilityTitle: string;
    compatibilityBody: string;
    freshnessTitle: string;
    freshnessBody: string;
    privateTitle: string;
    privateBody: string;
    ctaEyebrow: string;
    ctaTitle: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    intro: string;
    noteLabel: string;
    noteTitle: string;
    noteBody: string;
    primarySafetyLabel: string;
    primarySafetyTitle: string;
    primarySafetyBody: string;
    findProperty: string;
    accountAccessLabel: string;
    accountAccessTitle: string;
    accountAccessBody: string;
    openSupportForm: string;
    privacyRequestsLabel: string;
    privacyRequestsTitle: string;
    privacyRequestsBody: string;
    supportEyebrow: string;
    supportTitle: string;
    continueEyebrow: string;
    continueTitle: string;
  };
  privacy: {
    eyebrow: string;
    title: string;
    intro: string;
    tocAria: string;
    sections: Record<
      string,
      { id: string; number: string; title: string; body: string }
    >;
  };
  terms: {
    eyebrow: string;
    title: string;
    intro: string;
    tocAria: string;
    sections: Record<
      string,
      { id: string; number: string; title: string; body: string }
    >;
  };
};

const en: InformationCopy = {
  common: {
    onThisPage: "On this page",
    browseHomes: "Browse homes",
    backHome: "Back home",
    readTerms: "Read terms",
    readPrivacy: "Read privacy",
  },
  about: {
    eyebrow: "About NearBasha",
    title: "A clearer way to find and list homes in Bangladesh.",
    intro:
      "NearBasha is a map-first rental marketplace designed to help renters discover homes by real location and help owners publish clearer, more compatible listings.",
    principlesAria: "Product principles",
    locationTitle: "Location first",
    locationBody:
      "Exact map pins, useful local context, and search that starts from where a renter actually wants to live.",
    compatibilityTitle: "Compatibility, not noise.",
    compatibilityBody:
      "Tenant-fit details make expectations clearer before a renter spends time on a property that was never suitable for them.",
    freshnessTitle: "Freshness built in.",
    freshnessBody:
      "Listings are moderated, refreshed, and time-bounded so the product can prioritize homes that are more likely to still be relevant.",
    privateTitle: "Private contact.",
    privateBody:
      "Messaging keeps renter–owner conversations inside NearBasha while trust and safety controls remain connected to the listing.",
    ctaEyebrow: "Start with the map",
    ctaTitle: "See how the product works in the real search experience.",
  },
  contact: {
    eyebrow: "Contact & support",
    title: "Get help even when you cannot sign in.",
    intro:
      "Use this form for account recovery, missing OTPs, data export or deletion requests, marketplace safety and other support. Listing-specific reports should still be sent from the property page when possible.",
    noteLabel: "Support",
    noteTitle: "Never send passwords or OTP codes.",
    noteBody:
      "We use the email you provide to follow up. Account deletion and data export requests require identity verification before action is taken.",
    primarySafetyLabel: "Primary safety route",
    primarySafetyTitle: "Report a listing from its property page",
    primarySafetyBody: "The exact property and report reason stay attached to the moderation queue.",
    findProperty: "Find the property",
    accountAccessLabel: "Account access",
    accountAccessTitle: "Locked out or missing an OTP?",
    accountAccessBody: "You do not need to be signed in to submit the support form below.",
    openSupportForm: "Open support form ↓",
    privacyRequestsLabel: "Privacy requests",
    privacyRequestsTitle: "Export or delete account data",
    privacyRequestsBody:
      "Choose the appropriate request type below. We verify ownership before fulfilling privacy-sensitive requests.",
    supportEyebrow: "Support request",
    supportTitle: "Tell us what you need help with.",
    continueEyebrow: "Continue browsing",
    continueTitle: "Return to the marketplace whenever you are ready.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "How NearBasha handles marketplace information.",
    intro:
      "NearBasha uses account, listing, location, verification, saved-search, moderation, and messaging data to provide the rental marketplace.",
    tocAria: "Privacy sections",
    sections: {
      marketplaceData: {
        id: "privacy-marketplace-data",
        number: "01",
        title: "Marketplace data",
        body: "Information connected to accounts, listings, saved searches, moderation, and messaging is used to operate the NearBasha experience and keep relevant product context connected across the marketplace.",
      },
      privateCommunication: {
        id: "privacy-private-communication",
        number: "02",
        title: "Private communication",
        body: "Private contact information and message content are not published as listing details. Messaging remains part of the signed-in marketplace experience.",
      },
      propertyLocation: {
        id: "privacy-property-location",
        number: "03",
        title: "Property location",
        body: "Exact property locations are shown as part of rental discovery when a listing is published, because location is a core part of NearBasha’s map-first search experience.",
      },
      trustModeration: {
        id: "privacy-trust-moderation",
        number: "04",
        title: "Trust and moderation",
        body: "Verification and moderation information may be used to display platform trust signals, review submissions, handle reports, and enforce marketplace rules.",
      },
    },
  },
  terms: {
    eyebrow: "Terms",
    title: "NearBasha marketplace terms.",
    intro:
      "NearBasha provides tools for rental discovery, listing publication, moderation, and private communication. Users remain responsible for the accuracy of information they submit and for independently verifying important rental details before making commitments.",
    tocAria: "Terms sections",
    sections: {
      marketplaceResponsibility: {
        id: "terms-marketplace-responsibility",
        number: "01",
        title: "Marketplace responsibility",
        body: "Owners, agents, and renters are responsible for the information and representations they provide through NearBasha.",
      },
      independentVerification: {
        id: "terms-independent-verification",
        number: "02",
        title: "Independent verification",
        body: "Users should independently verify a property, counterparty, payment details, and any other material rental information before paying money or making commitments.",
      },
      moderation: {
        id: "terms-moderation",
        number: "03",
        title: "Moderation",
        body: "Listings and accounts may be reviewed, restricted, hidden, rejected, or removed when they violate platform rules, become inaccurate, or create trust and safety concerns.",
      },
      platformRole: {
        id: "terms-platform-role",
        number: "04",
        title: "Platform role",
        body: "NearBasha provides marketplace and communication tools. Platform trust signals should not be interpreted as government identity verification, legal ownership verification, or a guarantee of a transaction.",
      },
    },
  },
};

const bn: InformationCopy = {
  common: {
    onThisPage: "এই পাতায়",
    browseHomes: "বাসা ব্রাউজ করুন",
    backHome: "হোমে ফিরুন",
    readTerms: "শর্তাবলি পড়ুন",
    readPrivacy: "গোপনীয়তা পড়ুন",
  },
  about: {
    eyebrow: "NearBasha সম্পর্কে",
    title: "বাংলাদেশে বাসা খোঁজা ও তালিকাভুক্ত করার আরও পরিষ্কার উপায়।",
    intro:
      "NearBasha একটি ম্যাপ-প্রথম ভাড়াবাজার, যেখানে ভাড়াটিয়ারা আসল অবস্থান দেখে বাসা খুঁজে পান এবং মালিকরা আরও পরিষ্কার ও মানানসই লিস্টিং প্রকাশ করতে পারেন।",
    principlesAria: "প্রোডাক্ট নীতি",
    locationTitle: "লোকেশন আগে",
    locationBody:
      "সঠিক ম্যাপ পিন, উপযোগী স্থানীয় প্রসঙ্গ এবং যেখানে ভাড়াটিয়া সত্যিই থাকতে চান সেখান থেকেই শুরু হওয়া সার্চ।",
    compatibilityTitle: "মানানসই, অপ্রয়োজনীয় নয়।",
    compatibilityBody:
      "ভাড়াটিয়া-উপযোগিতার বিবরণ আগেই প্রত্যাশা পরিষ্কার করে, যাতে অনুপযোগী বাসায় সময় নষ্ট না হয়।",
    freshnessTitle: "ফ্রেশনেস অন্তর্ভুক্ত।",
    freshnessBody:
      "লিস্টিং মডারেট, রিফ্রেশ ও সময়সীমাবদ্ধ রাখা হয়, যাতে প্রাসঙ্গিক থাকার সম্ভাবনা বেশি এমন বাসাগুলোকে অগ্রাধিকার দেওয়া যায়।",
    privateTitle: "ব্যক্তিগত যোগাযোগ।",
    privateBody:
      "মেসেজিং NearBasha-র ভিতরে ভাড়াটিয়া–মালিকের কথোপকথন রাখে, আর আস্থা ও নিরাপত্তা নিয়ন্ত্রণ লিস্টিংয়ের সঙ্গেই যুক্ত থাকে।",
    ctaEyebrow: "ম্যাপ দিয়ে শুরু করুন",
    ctaTitle: "আসল সার্চ অভিজ্ঞতায় প্রোডাক্ট কীভাবে কাজ করে দেখুন।",
  },
  contact: {
    eyebrow: "যোগাযোগ ও সহায়তা",
    title: "সাইন ইন করতে না পারলেও সহায়তা নিন।",
    intro:
      "অ্যাকাউন্ট রিকভারি, অনুপস্থিত OTP, ডেটা এক্সপোর্ট বা মুছে ফেলা, মার্কেটপ্লেস নিরাপত্তা এবং অন্যান্য সহায়তার জন্য এই ফর্ম ব্যবহার করুন। নির্দিষ্ট লিস্টিংয়ের রিপোর্ট সম্ভব হলে সম্পত্তির পাতা থেকেই পাঠান।",
    noteLabel: "সহায়তা",
    noteTitle: "কখনো পাসওয়ার্ড বা OTP কোড পাঠাবেন না।",
    noteBody:
      "আপনি যে ইমেইল দেবেন, সেখানে আমরা ফলোআপ করব। অ্যাকাউন্ট মুছে ফেলা ও ডেটা এক্সপোর্টের অনুরোধে ব্যবস্থা নেওয়ার আগে পরিচয় যাচাই করা হয়।",
    primarySafetyLabel: "মূল নিরাপত্তা পথ",
    primarySafetyTitle: "সম্পত্তির পাতা থেকে লিস্টিং রিপোর্ট করুন",
    primarySafetyBody: "সঠিক সম্পত্তি ও রিপোর্টের কারণ মডারেশন কিউয়ের সঙ্গে যুক্ত থাকে।",
    findProperty: "সম্পত্তি খুঁজুন",
    accountAccessLabel: "অ্যাকাউন্ট অ্যাক্সেস",
    accountAccessTitle: "লক আউট, নাকি OTP পাচ্ছেন না?",
    accountAccessBody: "নিচের সহায়তা ফর্ম জমা দিতে সাইন ইন করার প্রয়োজন নেই।",
    openSupportForm: "সহায়তা ফর্ম খুলুন ↓",
    privacyRequestsLabel: "গোপনীয়তার অনুরোধ",
    privacyRequestsTitle: "অ্যাকাউন্ট ডেটা এক্সপোর্ট বা মুছে ফেলুন",
    privacyRequestsBody:
      "নিচে উপযুক্ত অনুরোধের ধরন বেছে নিন। গোপনীয়তা-সংবেদনশীল অনুরোধ পূরণের আগে মালিকানা যাচাই করা হয়।",
    supportEyebrow: "সহায়তার অনুরোধ",
    supportTitle: "কী বিষয়ে সহায়তা দরকার জানান।",
    continueEyebrow: "ব্রাউজ চালিয়ে যান",
    continueTitle: "প্রস্তুত হলে মার্কেটপ্লেসে ফিরে আসুন।",
  },
  privacy: {
    eyebrow: "গোপনীয়তা",
    title: "NearBasha মার্কেটপ্লেস তথ্য কীভাবে ব্যবহার করে।",
    intro:
      "NearBasha ভাড়াবাজার চালাতে অ্যাকাউন্ট, লিস্টিং, লোকেশন, ভেরিফিকেশন, সেভ করা সার্চ, মডারেশন ও মেসেজিং ডেটা ব্যবহার করে।",
    tocAria: "গোপনীয়তা বিভাগসমূহ",
    sections: {
      marketplaceData: {
        id: "privacy-marketplace-data",
        number: "01",
        title: "মার্কেটপ্লেস ডেটা",
        body: "অ্যাকাউন্ট, লিস্টিং, সেভ করা সার্চ, মডারেশন ও মেসেজিংয়ের সঙ্গে যুক্ত তথ্য NearBasha অভিজ্ঞতা চালাতে এবং মার্কেটপ্লেস জুড়ে প্রাসঙ্গিক প্রোডাক্ট প্রসঙ্গ রাখতে ব্যবহৃত হয়।",
      },
      privateCommunication: {
        id: "privacy-private-communication",
        number: "02",
        title: "ব্যক্তিগত যোগাযোগ",
        body: "ব্যক্তিগত যোগাযোগের তথ্য ও মেসেজের বিষয়বস্তু লিস্টিং বিবরণ হিসেবে প্রকাশ করা হয় না। মেসেজিং সাইন-ইন করা মার্কেটপ্লেস অভিজ্ঞতার অংশই থাকে।",
      },
      propertyLocation: {
        id: "privacy-property-location",
        number: "03",
        title: "সম্পত্তির অবস্থান",
        body: "লিস্টিং প্রকাশিত হলে ভাড়া খোঁজার অংশ হিসেবে সঠিক সম্পত্তির অবস্থান দেখানো হয়, কারণ লোকেশন NearBasha-র ম্যাপ-প্রথম সার্চ অভিজ্ঞতার মূল উপাদান।",
      },
      trustModeration: {
        id: "privacy-trust-moderation",
        number: "04",
        title: "আস্থা ও মডারেশন",
        body: "ভেরিফিকেশন ও মডারেশন তথ্য প্ল্যাটফর্মের আস্থার সংকেত দেখাতে, জমা পর্যালোচনা করতে, রিপোর্ট হ্যান্ডল করতে এবং মার্কেটপ্লেস নিয়ম প্রয়োগ করতে ব্যবহার করা যেতে পারে।",
      },
    },
  },
  terms: {
    eyebrow: "শর্তাবলি",
    title: "NearBasha মার্কেটপ্লেস শর্তাবলি।",
    intro:
      "NearBasha ভাড়া খোঁজা, লিস্টিং প্রকাশ, মডারেশন ও ব্যক্তিগত যোগাযোগের টুল সরবরাহ করে। জমা দেওয়া তথ্যের নির্ভুলতা এবং প্রতিশ্রুতির আগে গুরুত্বপূর্ণ ভাড়ার বিবরণ স্বাধীনভাবে যাচাই করার দায়িত্ব ব্যবহারকারীদের।",
    tocAria: "শর্তাবলির বিভাগসমূহ",
    sections: {
      marketplaceResponsibility: {
        id: "terms-marketplace-responsibility",
        number: "01",
        title: "মার্কেটপ্লেসের দায়িত্ব",
        body: "মালিক, এজেন্ট ও ভাড়াটিয়ারা NearBasha-র মাধ্যমে যে তথ্য ও উপস্থাপনা দেন, তার জন্য তাঁরা দায়ী।",
      },
      independentVerification: {
        id: "terms-independent-verification",
        number: "02",
        title: "স্বাধীন যাচাই",
        body: "টাকা দেওয়া বা প্রতিশ্রুতি দেওয়ার আগে ব্যবহারকারীদের সম্পত্তি, পক্ষ, পেমেন্ট বিবরণ এবং অন্যান্য গুরুত্বপূর্ণ ভাড়ার তথ্য স্বাধীনভাবে যাচাই করা উচিত।",
      },
      moderation: {
        id: "terms-moderation",
        number: "03",
        title: "মডারেশন",
        body: "প্ল্যাটফর্ম নিয়ম ভঙ্গ করলে, তথ্য ভুল হলে বা আস্থা ও নিরাপত্তার উদ্বেগ তৈরি হলে লিস্টিং ও অ্যাকাউন্ট পর্যালোচনা, সীমাবদ্ধ, লুকানো, প্রত্যাখ্যান বা সরিয়ে ফেলা হতে পারে।",
      },
      platformRole: {
        id: "terms-platform-role",
        number: "04",
        title: "প্ল্যাটফর্মের ভূমিকা",
        body: "NearBasha মার্কেটপ্লেস ও যোগাযোগের টুল সরবরাহ করে। প্ল্যাটফর্মের আস্থার সংকেতকে সরকারি পরিচয় যাচাই, আইনি মালিকানা যাচাই বা কোনো লেনদেনের গ্যারান্টি হিসেবে ব্যাখ্যা করা উচিত নয়।",
      },
    },
  },
};

export function getInformationCopy(locale: Locale): InformationCopy {
  return locale === "bn" ? bn : en;
}
