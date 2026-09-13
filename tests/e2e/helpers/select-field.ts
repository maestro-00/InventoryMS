import { expect, type Page } from "@playwright/test";

export type SelectFieldChoice = string | { label: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Chooses a value on either a native `<select>` or a Radix Select combobox.
 * Playwright's `selectOption` only works with native selects; catalogue and
 * inventory forms render Radix triggers.
 */
export async function selectFieldOption(
  page: Page,
  fieldLabel: string | RegExp,
  option: SelectFieldChoice,
) {
  const trigger = page.getByLabel(fieldLabel);
  await expect(trigger).toBeVisible({ timeout: 15_000 });

  const isNativeSelect = await trigger.evaluate(
    (element) => element.tagName.toLowerCase() === "select",
  );
  if (isNativeSelect) {
    if (typeof option === "string") {
      await trigger.selectOption(option);
    } else {
      await trigger.selectOption({ label: option.label });
    }
    return;
  }

  await trigger.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();

  const needle = typeof option === "string" ? option : option.label;
  const byName = listbox.getByRole("option", {
    name: new RegExp(escapeRegExp(needle), "i"),
  });
  if ((await byName.count()) > 0) {
    await byName.first().click();
    return;
  }

  const byValue = listbox.locator(
    `[data-option-value="${needle}"], [data-value="${needle}"]`,
  );
  await expect(byValue.first()).toBeVisible();
  await byValue.first().click();
}
