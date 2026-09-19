import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const reject = (source, text, message) => { if (source.includes(text)) failures.push(message); };

const savedPage = read("src/app/saved/page.tsx");
const savedWorkspace = read("src/components/saved-homes-workspace.tsx");
const savedCss = read("src/components/saved-homes-workspace.module.css");
const savedRouteCss = read("src/app/saved/saved-workspace-redesign.css");
const inbox = read("src/components/messages-inbox-pane.tsx");
const thread = read("src/app/messages/[id]/page.tsx");
const messagesCss = read("src/app/messages/messages-workspace-redesign.css");
const dashboard = read("src/app/dashboard/page.tsx");
const dashboardCss = read("src/app/dashboard/dashboard-workspace-redesign.css");
const nav = read("src/components/product-navigation.tsx");

expect(savedPage, "data-saved-mobile-page", "Saved route mobile marker");
expect(savedWorkspace, "data-saved-mobile-workspace", "Saved workspace mobile marker");
expect(savedWorkspace, "value == null ? copy.notSpecified", "Saved comparison must use explicit missing-value copy");
reject(savedWorkspace, 'value == null ? "—"', "Saved comparison must not fabricate dash values");
expect(savedCss, "var(--mobile-app-bottom-action-offset", "Saved compare tray must clear persistent app navigation");
expect(savedCss, "var(--mobile-app-tabbar-height", "Saved selection padding must reserve tab-bar space");
expect(savedRouteCss, "top: calc(var(--mobile-app-topbar-height", "Saved section switcher must sit below the mobile top bar");
expect(savedRouteCss, "grid-template-columns: repeat(3, minmax(0, 1fr))", "Saved mobile summary metrics must stay compact");

expect(inbox, "data-messages-mobile-inbox", "Messages inbox mobile marker");
expect(thread, "data-messages-mobile-thread", "Message thread mobile marker");
expect(messagesCss, "height: calc(100dvh - var(--mobile-app-topbar-height, 58px) - var(--mobile-app-tabbar-height, 64px))", "Messages inbox must reserve both app bars");
expect(messagesCss, ".messages-thread-route .messages-workspace-shell", "Contextual thread app-height layout");
expect(messagesCss, ".messages-thread-pane .message-composer", "Mobile thread composer ownership");
expect(thread, "const inboxHref = messageInboxHref({ page, query, unreadOnly });", "Thread Back must preserve inbox organization state");

expect(dashboard, "data-account-mobile-workspace", "Account mobile workspace marker");
expect(dashboardCss, "[data-account-mobile-workspace] .dashboard-next-action", "Account next-action mobile treatment");
expect(dashboardCss, "grid-template-columns: repeat(2, minmax(0, 1fr))", "Account mobile metrics must be scannable two-up");
expect(dashboardCss, "[data-account-mobile-workspace] .dashboard-account-tools", "Account tools mobile treatment");
expect(dashboard, "RenterPreferenceForm", "Account must retain renter-default editing");

expect(nav, "{ key: \"saved\", href: \"/saved\"", "Saved remains a primary mobile tab");
expect(nav, "{ key: \"messages\", href: \"/messages\"", "Messages remains a primary mobile tab");
expect(nav, 'const accountHref = authenticated ? "/dashboard" : "/login";', "Account tab must keep authenticated destination");
expect(nav, '/^\\/messages\\/[^/]+$/.test(pathname)', "Conversation thread must suppress global mobile tabs");

if (failures.length) {
  console.error("Task 6 mobile renter workspaces QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Task 6 mobile renter workspaces QA passed: Saved, Messages, Account, tab clearance, thread continuity, and renter-default contracts are intact.");
