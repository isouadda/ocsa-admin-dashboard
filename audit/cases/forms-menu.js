// Forms is in the menu for anyone the Forms page opens for.
//
// Since Step 125 the forms API lets a supervisor list filed reports, and the Forms page opens on that
// answer and shows anyone but an admin the Filed forms tab alone. The sidebar draws Forms by the same
// test the page uses. The supervisor the API lets in sees it and opens Filed forms from it; the
// supervisor holding only manage_permissions, whom the API turns away, does not see it.
"use strict";

const SIDEBAR = "div[style*='position: fixed'][style*='border-right']";

async function run({ d, results }) {
  const forms = d.say("Forms");
  const filed = d.say("Filed forms");

  await d.signOutHard();
  await d.signIn("supervisor");
  await d.expandSidebar();
  const nav = await d.visibleNavItems();
  const entry = d.page.locator(SIDEBAR).locator("button", { hasText: forms }).first();
  const listed = nav.indexOf(forms) >= 0 && (await entry.count()) > 0;
  let opened = false;
  if (listed) {
    await entry.click({ timeout: 5000 }).catch(() => {});
    await d.settle(400);
    const hash = await d.page.evaluate(() => window.location.hash);
    opened = hash.indexOf("#forms") === 0 && (await d.bodyHas(filed));
  }
  results.check("page", "page/forms/in-the-menu/supervisor", listed && opened,
    !listed ? "the sidebar draws no " + forms + " for a supervisor the forms API lets in: " + nav.join(" | ")
      : "pressing " + forms + " did not open " + filed);

  await d.signOutHard();
  await d.signIn("capability");
  await d.expandSidebar();
  const nav2 = await d.visibleNavItems();
  results.check("page", "page/forms/not-in-the-menu/capability", nav2.indexOf(forms) < 0,
    "the sidebar draws " + forms + " for a person the forms API turns away");
}

module.exports = { run };
