const popoverTimers = new WeakMap();

function init() {
  const waitlistForms = document.querySelectorAll(".waitlist-form");

  waitlistForms.forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const errorEl = form.querySelector("[data-waitlist-error]");
    const popover = form.querySelector("[data-waitlist-popover]");

    form.addEventListener("submit", handleWaitlistSubmit);

    input.addEventListener("input", () => setFormError(errorEl, ""));
    input.addEventListener("focus", () => hidePopover(popover));
  });
}

function setSubmitButtonLoading(button, isLoading) {
  button.setAttribute("aria-busy", isLoading ? "true" : "false");
  button.disabled = isLoading;
}

function hidePopover(popover) {
  const existingTimer = popoverTimers.get(popover);
  if (existingTimer) {
    clearTimeout(existingTimer);
    popoverTimers.delete(popover);
  }
  popover.classList.add("hidden");
}

function showPopover(popover) {
  hidePopover(popover);
  popover.classList.remove("hidden");

  const timerId = setTimeout(() => {
    popover.classList.add("hidden");
    popoverTimers.delete(popover);
  }, 4000);

  popoverTimers.set(popover, timerId);
}

function setFormError(errorEl, message) {
  if (!message) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

async function handleWaitlistSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const emailInput = form.querySelector('input[type="email"]');
  const submitButton = form.querySelector("[data-waitlist-submit]");
  const popover = form.querySelector("[data-waitlist-popover]");
  const errorEl = form.querySelector("[data-waitlist-error]");
  const email = emailInput.value.trim();

  if (submitButton.getAttribute("aria-busy") === "true") {
    return;
  }

  setFormError(errorEl, "");
  hidePopover(popover);
  setSubmitButtonLoading(submitButton, true);

  try {
    const res = await fetch("/api/waitlist-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      form.reset();
      showPopover(popover);
      return;
    }

    setFormError(
      errorEl,
      data.message || "Could not join the waitlist. Please try again."
    );
  } catch (e) {
    setFormError(errorEl, "Network error. Please try again.");
  } finally {
    setSubmitButtonLoading(submitButton, false);
  }
}

if (document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
