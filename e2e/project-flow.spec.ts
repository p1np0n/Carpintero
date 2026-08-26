import { test, expect } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

test("crear proyecto → agregar columna y módulo → ver cutlist actualizado", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.waitForURL(/\/proyectos\/[^/]+$/);

  // The default new project starts with one column already; add a second one.
  await page.getByRole("button", { name: "Columna" }).click();
  await expect(page.locator("input[type=number]").first()).toBeVisible();

  // Select the first module in the elevation editor and switch it to "Cajón".
  const firstModule = page.locator("button", { hasText: /Estante|Puertas dobles/ }).first();
  await firstModule.click();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Cajón" }).click();

  await page.getByRole("tab", { name: "Lista de corte" }).click();
  await expect(page.getByText(/piezas/)).toBeVisible();
  await expect(page.locator("table")).toContainText("Frente de cajón");
});
