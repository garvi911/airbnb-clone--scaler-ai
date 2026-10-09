import { test, expect } from "@playwright/test";

test("browse, search, favorite, book, view trips, and host CRUD", async ({
  page,
  request,
}) => {
  const previous = await (
    await request.get("/api/me/listings", { headers: { "X-User-Id": "1" } })
  ).json();
  for (const listing of previous)
    if (listing.title.startsWith("Browser test garden"))
      await request.delete(`/api/listings/${listing.id}`, {
        headers: { "X-User-Id": "1" },
      });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".listing-card")).toHaveCount(12);
  await page.locator(".listing-card").last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll(".listing-card img")).every(
      (i) => (i as HTMLImageElement).naturalWidth > 0,
    ),
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/explore-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Filters", exact: false }).click();
  await page.getByRole("button", { name: "Villa", exact: true }).click();
  await page.getByRole("button", { name: "Show homes" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(12);
  await page.getByLabel("Search destinations").fill("Goa");
  await page.getByRole("button", { name: "Search homes" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  const favorite = page.locator(".listing-card").first().getByRole("button");
  if ((await favorite.getAttribute("aria-pressed")) === "true")
    await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.goto("/wishlists");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.locator(".listing-card").first().getByRole("button").click();
  await expect(
    page.getByText("Your next adventure starts with a heart"),
  ).toBeVisible();
  // Create a dedicated listing so the test never conflicts with demo reservations.
  await page.goto("/host/listings/new");
  await page.getByLabel("Listing title").fill("Browser test garden home");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A welcoming garden home created by the browser workflow test, with a comfortable living room and a peaceful terrace.",
    );
  await page.getByLabel("Location", { exact: true }).fill("Pune, Maharashtra");
  await page.getByLabel("Nightly price").fill("4500");
  await page
    .getByLabel("Photo URLs")
    .fill(
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    );
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page).toHaveURL("/host");
  const row = page
    .locator(".host-listing")
    .filter({ hasText: "Browser test garden home" });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Listing title").fill("Browser test garden retreat");
  await page.getByRole("button", { name: "Save changes" }).click();
  const edited = page
    .locator(".host-listing")
    .filter({ hasText: "Browser test garden retreat" });
  await edited
    .getByRole("link", { name: "Browser test garden retreat" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/listings\/\d+$/);
  const listingPath = new URL(page.url()).pathname;
  await expect(
    page
      .getByRole("heading", {
        name: "Browser test garden retreat",
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/detail-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Check availability", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Next month", exact: true }).click();
  const enabled = dialog.locator(
    ".month-0 .calendar-grid button:not([disabled])",
  );
  await enabled.nth(3).click();
  await enabled.nth(6).click();
  await dialog.getByRole("button", { name: "Save dates" }).click();
  await expect(
    page.getByRole("button", { name: "Reserve", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Reserve", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm and book" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/checkout-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirm and book", exact: true })
    .click();
  await expect(page.getByText("RESERVATION CONFIRMED")).toBeVisible();
  await page.reload();
  await expect(page.getByText("RESERVATION CONFIRMED")).toBeVisible();
  await page.getByRole("link", { name: "View my trips" }).click();
  await expect(page.getByText("Browser test garden retreat")).toBeVisible();
  await page.goto(listingPath);
  await expect(page.locator(".reservation")).toBeVisible();
  await page.goto("/host");
  await page
    .getByRole("button", { name: "Reservations", exact: false })
    .click();
  await expect(
    page.locator("td").filter({ hasText: "Browser test garden retreat" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Your listings", exact: false })
    .click();
  await page
    .getByRole("button", {
      name: "Delete Browser test garden retreat",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete listing", exact: true })
    .click();
  await expect(
    page
      .locator(".host-listing")
      .filter({ hasText: "Browser test garden retreat" }),
  ).toHaveCount(0);
  await page.goto("/trips");
  await expect(page.getByText("Browser test garden retreat")).toBeVisible();
  expect(errors).toEqual([]);
});

test("narrow-screen browse and pagination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".listing-card")).toHaveCount(12);
  await page.screenshot({
    path: "test-results/explore-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".listing-card")).toHaveCount(12);
});
