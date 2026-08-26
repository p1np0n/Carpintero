import { test, expect } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

test("publicar proyecto → verlo desde un link público de solo lectura", async ({ page, context }) => {
  await signUpAndLogIn(page);

  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.waitForURL(/\/proyectos\/[^/]+$/);

  await page.getByRole("button", { name: "Publicar" }).click();
  await page.getByRole("switch", { name: "Enlace público activo" }).click();
  await expect(page.getByRole("button", { name: "Publicado" })).toBeVisible();

  const link = await page.locator('input[readonly]').inputValue();
  expect(link).toContain("/p/");

  const publicPage = await context.newPage();
  await publicPage.goto(link);
  await expect(publicPage.getByText("Enlace público de solo lectura")).toBeVisible();
  // A logged-out visitor should not see any editing controls.
  await expect(publicPage.getByRole("button", { name: "Nuevo proyecto" })).toHaveCount(0);
});
