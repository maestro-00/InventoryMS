import { fireEvent, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";

const EMPTY_RADIX_VALUE = "__select_empty__";

function toRadixValue(value: string): string {
  return value === "" ? EMPTY_RADIX_VALUE : value;
}

function optionValue(option: HTMLElement): string | null {
  const explicit = option.getAttribute("data-option-value");
  if (explicit !== null) {
    return explicit;
  }
  return option.getAttribute("data-value") ?? option.getAttribute("value") ?? null;
}

function matchesOption(
  option: HTMLElement,
  valueOrLabel: string,
  radixValue: string,
): boolean {
  const value = optionValue(option);
  if (value === radixValue || value === valueOrLabel) {
    return true;
  }
  if (valueOrLabel === "") {
    return value === EMPTY_RADIX_VALUE || value === "";
  }
  const text = option.textContent.trim();
  return text === valueOrLabel || text.includes(valueOrLabel);
}

async function listboxForCombobox(combobox: HTMLElement): Promise<HTMLElement> {
  const listboxId = combobox.getAttribute("aria-controls");
  if (listboxId) {
    return await waitFor(() => {
      const element = document.getElementById(listboxId);
      if (!element) {
        throw new Error(`Listbox #${listboxId} was not found`);
      }
      return element;
    });
  }
  return await screen.findByRole("listbox");
}

function closeOpenListboxIfNeeded(): void {
  if (screen.queryByRole("listbox")) {
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
  }
}

/**
 * Waits until a Radix Select has loaded options matching `optionName`, then closes it.
 * Replaces `findByRole("option")` waits that relied on native `<select>` children.
 */
export async function waitForRadixSelectOptions(
  combobox: HTMLElement,
  optionName: string | RegExp,
): Promise<void> {
  await userEvent.setup().click(combobox);
  await screen.findByRole("option", { name: optionName });
  closeOpenListboxIfNeeded();
}

/**
 * Opens a Radix Select combobox and chooses an option by native `value` or visible label.
 * Replaces `user.selectOptions`, which only works with native `<select>` elements.
 */
export async function selectRadixOption(
  user: UserEvent,
  combobox: HTMLElement,
  valueOrLabel: string,
): Promise<void> {
  await user.click(combobox);

  const listbox = await listboxForCombobox(combobox);
  const radixValue = toRadixValue(valueOrLabel);
  const options = within(listbox).getAllByRole("option");

  const match =
    valueOrLabel === ""
      ? options.find((option) => optionValue(option) === "")
      : options.find((option) => matchesOption(option, valueOrLabel, radixValue));

  if (!match) {
    throw new Error(
      `No Radix select option found for "${valueOrLabel}" (radix value "${radixValue}")`,
    );
  }

  await user.click(match);
  if (screen.queryByRole("listbox")) {
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
  }
}
