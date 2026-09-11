import type { Locale } from "@/i18n/config";

export type SupportCategory = "account_recovery" | "otp_delivery" | "data_export" | "account_deletion" | "safety_abuse" | "other";

type SupportCopy = {
  email: string;
  category: string;
  categories: Record<SupportCategory, string>;
  subject: string;
  details: string;
  detailsHelp: string;
  submit: string;
  sending: string;
  sent: string;
  error: string;
  manual: string;
  block: string;
  unblock: string;
  blocked: string;
  report: string;
  blockError: string;
};

const en: SupportCopy = {
  email: "Email for replies",
  category: "What do you need help with?",
  categories: {
    account_recovery: "Account access or recovery",
    otp_delivery: "OTP / verification delivery",
    data_export: "Request a copy of my data",
    account_deletion: "Request account deletion",
    safety_abuse: "Safety, harassment or chat abuse",
    other: "Something else",
  },
  subject: "Subject",
  details: "Tell us what happened",
  detailsHelp: "Do not include passwords, OTP codes or payment secrets. For recovery issues, describe the error and the email/phone you normally use.",
  submit: "Send support request",
  sending: "Sending…",
  sent: "Your request is recorded. Keep this reference:",
  error: "We could not submit the request. Please review the form and try again.",
  manual: "Data export and account deletion requests are manually verified before action is taken.",
  block: "Block user",
  unblock: "Unblock user",
  blocked: "Messaging is blocked in this conversation.",
  report: "Report safety issue",
  blockError: "Could not update the block right now.",
};

const bn: SupportCopy = {
  email: "উত্তরের জন্য ইমেইল",
  category: "কী বিষয়ে সহায়তা প্রয়োজন?",
  categories: {
    account_recovery: "অ্যাকাউন্ট অ্যাক্সেস বা রিকভারি",
    otp_delivery: "OTP / ভেরিফিকেশন পৌঁছানো",
    data_export: "আমার ডেটার কপি চাই",
    account_deletion: "অ্যাকাউন্ট মুছে দেওয়ার অনুরোধ",
    safety_abuse: "নিরাপত্তা, হয়রানি বা চ্যাট অপব্যবহার",
    other: "অন্য বিষয়",
  },
  subject: "বিষয়",
  details: "কী ঘটেছে তা লিখুন",
  detailsHelp: "পাসওয়ার্ড, OTP কোড বা পেমেন্টের গোপন তথ্য দেবেন না। রিকভারি সমস্যায় ত্রুটি এবং সাধারণত ব্যবহৃত ইমেইল/ফোনটি বর্ণনা করুন।",
  submit: "সহায়তার অনুরোধ পাঠান",
  sending: "পাঠানো হচ্ছে…",
  sent: "আপনার অনুরোধ নথিভুক্ত হয়েছে। এই রেফারেন্সটি রাখুন:",
  error: "অনুরোধ পাঠানো যায়নি। ফর্মটি দেখে আবার চেষ্টা করুন।",
  manual: "ডেটা এক্সপোর্ট ও অ্যাকাউন্ট মুছে দেওয়ার অনুরোধ কার্যকর করার আগে ম্যানুয়ালি যাচাই করা হয়।",
  block: "ব্যবহারকারীকে ব্লক করুন",
  unblock: "আনব্লক করুন",
  blocked: "এই কথোপকথনে মেসেজিং ব্লক করা আছে।",
  report: "নিরাপত্তা সমস্যা রিপোর্ট করুন",
  blockError: "এখন ব্লক সেটিং পরিবর্তন করা যায়নি।",
};

export function getSupportCopy(locale: Locale) { return locale === "bn" ? bn : en; }
