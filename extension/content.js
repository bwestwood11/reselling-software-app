// Content script — injected into https://www.mercari.com/sell/*
// Reads the job ID from the URL hash, fetches the payload, fills the form.

(function () {
  "use strict";

  // ── Condition mapping ───────────────────────────────────────────────────────
  const CONDITION_MAP = {
    NEW_WITH_TAGS: "Brand new",
    NEW_WITHOUT_TAGS: "Like new",
    VERY_GOOD: "Good",
    GOOD: "Fair",
    SATISFACTORY: "Poor",
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function getJobIdFromHash() {
    const match = location.hash.match(/relist-job=([^&]+)/);
    return match ? match[1] : null;
  }

  // Set value on a React-controlled input/textarea without React fighting us
  function setNativeValue(element, value) {
    const nativeInputValue = Object.getOwnPropertyDescriptor(
      element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    );
    if (nativeInputValue && nativeInputValue.set) {
      nativeInputValue.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Wait for an element matching selector to appear (MutationObserver + timeout)
  function waitForElement(selector, timeout = 15_000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for: ${selector}`));
      }, timeout);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Click a button or element after it appears
  async function clickWhenReady(selector, timeout = 10_000) {
    const el = await waitForElement(selector, timeout);
    el.click();
    return el;
  }

  // Fill a visible text input that has a placeholder or aria-label matching label
  async function fillField(labelOrSelector, value, timeout = 10_000) {
    let el;
    try {
      // Try direct selector first
      el = await waitForElement(labelOrSelector, timeout);
    } catch {
      return false;
    }
    setNativeValue(el, value);
    await sleep(150);
    return true;
  }

  // Upload photos via DataTransfer — works with React file inputs
  async function uploadPhotos(urls) {
    if (!urls || urls.length === 0) return;

    // Fetch all images as Blobs
    const files = [];
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i]);
        const blob = await res.blob();
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        files.push(new File([blob], `photo_${i}.${ext}`, { type: blob.type }));
      } catch {
        // Skip unreachable images
      }
    }

    if (files.length === 0) return;

    // Find the file input (Mercari uses <input type="file">)
    let fileInput;
    try {
      fileInput = await waitForElement('input[type="file"]', 8_000);
    } catch {
      return;
    }

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    Object.defineProperty(fileInput, "files", { value: dt.files, writable: false });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(500);
  }

  // Select a condition option from Mercari's condition selector
  async function selectCondition(conditionLabel) {
    if (!conditionLabel) return;
    // Mercari renders condition as clickable tiles or a dropdown
    // Look for a button/label whose text matches
    const buttons = document.querySelectorAll('[data-testid*="condition"], [class*="condition"]');
    for (const btn of buttons) {
      if (btn.textContent.trim().toLowerCase() === conditionLabel.toLowerCase()) {
        btn.click();
        await sleep(200);
        return;
      }
    }
    // Fallback: look for any element with matching text in the form area
    const allClickable = document.querySelectorAll("button, [role='button'], [role='radio']");
    for (const el of allClickable) {
      if (el.textContent.trim().toLowerCase() === conditionLabel.toLowerCase()) {
        el.click();
        await sleep(200);
        return;
      }
    }
  }

  // ── Main fill routine ─────────────────────────────────────────────────────────

  async function fillForm(payload) {
    const { title, description, price, condition, images = [] } = payload;

    // Step 1 — photos (first section on Mercari's new listing flow)
    try {
      await uploadPhotos(images);
      await sleep(800);
    } catch {
      // Non-fatal
    }

    // Step 2 — title
    if (title) {
      await fillField(
        'input[placeholder*="title" i], input[aria-label*="title" i], input[name="name"]',
        title
      );
    }

    // Step 3 — description
    if (description) {
      await fillField(
        'textarea[placeholder*="description" i], textarea[aria-label*="description" i], textarea[name="description"]',
        description
      );
    }

    // Step 4 — condition
    if (condition) {
      const conditionLabel = CONDITION_MAP[condition] ?? condition;
      await selectCondition(conditionLabel);
    }

    // Step 5 — price (Mercari shows price near end)
    if (price !== undefined && price !== null) {
      await fillField(
        'input[placeholder*="price" i], input[aria-label*="price" i], input[name="price"]',
        String(price)
      );
    }

    await sleep(300);
    showBanner("Form filled by ReList. Review and submit when ready.");
  }

  // ── Status banner ─────────────────────────────────────────────────────────────

  function showBanner(message, isError = false) {
    const existing = document.getElementById("relist-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "relist-banner";
    banner.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 999999;
      padding: 12px 18px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      background: ${isError ? "#ef4444" : "#f97316"};
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      max-width: 320px;
      line-height: 1.4;
      cursor: pointer;
    `;
    banner.textContent = `ReList: ${message}`;
    banner.addEventListener("click", () => banner.remove());
    document.body.appendChild(banner);

    if (!isError) {
      setTimeout(() => banner?.remove(), 12_000);
    }
  }

  // ── Entry point ───────────────────────────────────────────────────────────────

  async function init() {
    const jobId = getJobIdFromHash();
    if (!jobId) return;

    showBanner("Loading job data…");

    let job;
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "GET_JOB", jobId }, (res) => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(res);
        });
      });
      job = response?.job;
    } catch (err) {
      showBanner("Could not load job: " + err.message, true);
      return;
    }

    if (!job) {
      showBanner("Job not found or already processed.", true);
      return;
    }

    // Wait for the sell form to be present
    try {
      await waitForElement("form, [data-testid='sell-form'], main", 20_000);
    } catch {
      chrome.runtime.sendMessage({
        type: "JOB_FAILED",
        jobId: job.id,
        errorMessage: "Mercari sell page did not load in time",
      });
      showBanner("Sell page didn't load. Job marked as failed.", true);
      return;
    }

    await sleep(1_000);

    try {
      await fillForm(job.payload);

      // Job stays PROCESSING — the extension reports COMPLETED only after the
      // user manually submits and we detect the resulting navigation.
      observeCompletion(job.id);
    } catch (err) {
      chrome.runtime.sendMessage({
        type: "JOB_FAILED",
        jobId: job.id,
        errorMessage: err.message ?? "Fill error",
      });
      showBanner("Error filling form: " + err.message, true);
    }
  }

  // Detect successful submission by watching for URL change away from /sell
  function observeCompletion(jobId) {
    let reported = false;
    const checkUrl = () => {
      if (reported) return;
      if (!location.href.includes("/sell")) {
        reported = true;
        // Try to extract Mercari listing ID from redirect URL (e.g. /item/m12345678/)
        const match = location.href.match(/\/item\/(m\d+)\//);
        chrome.runtime.sendMessage({
          type: "JOB_COMPLETED",
          jobId,
          externalId: match ? match[1] : null,
        });
      }
    };

    // Poll for navigation (content scripts don't get navigation events directly)
    const interval = setInterval(() => {
      checkUrl();
      if (reported) clearInterval(interval);
    }, 1_000);

    // Give up after 30 min
    setTimeout(() => clearInterval(interval), 30 * 60 * 1_000);
  }

  // Delay init slightly to let the React app mount
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1_500));
  } else {
    setTimeout(init, 1_500);
  }
})();
