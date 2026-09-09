/**
 * Online booking page — calendar, slots, form
 * Runs on /foglalas (foglalas.html)
 * Slots from GET /api/slots; bookings via POST /api/bookings
 */
(function () {
  "use strict";

  const page = document.getElementById("foglalas");
  const daysEl = document.getElementById("booking-days");
  const weekdaysEl = document.getElementById("booking-weekdays");
  const monthLabel = document.getElementById("booking-month-label");
  const slotsList = document.getElementById("booking-slots-list");
  const selectedDateEl = document.getElementById("booking-selected-date");
  const form = document.getElementById("booking-form");
  const submitBtn = document.getElementById("booking-submit");
  const successEl = document.getElementById("booking-success");
  const errorEl = document.getElementById("booking-error");
  const prevBtn = document.getElementById("booking-prev-month");
  const nextBtn = document.getElementById("booking-next-month");
  const yearEl = document.getElementById("booking-year");

  if (!page || !daysEl) return;

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selectedDateKey = null;
  let selectedSlot = null;
  /** @type {Record<string, Array<object>>} */
  let scheduleByDate = {};
  let submitting = false;

  function booking() {
    return window.__content?.booking || null;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function dateKey(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  function formatHuDate(key) {
    if (!key) return "";
    const [y, m, d] = key.split("-").map(Number);
    const months = booking()?.months || [];
    const monthName = (months[m - 1] || "").toLowerCase();
    return `${y}. ${monthName} ${d}.`;
  }

  function setFormMessage(type, text) {
    if (successEl) {
      successEl.hidden = type !== "success";
      if (type === "success" && text) successEl.textContent = text;
    }
    if (errorEl) {
      errorEl.hidden = type !== "error";
      if (type === "error" && text) errorEl.textContent = text;
    }
  }

  function groupSlots(slots) {
    const map = {};
    (slots || []).forEach((slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    });
    return map;
  }

  async function loadSlots() {
    const res = await fetch("/api/slots");
    if (!res.ok) throw new Error("slots_failed");
    const data = await res.json();
    scheduleByDate = groupSlots(data.slots || []);
  }

  function renderWeekdays() {
    const days = booking()?.weekdays || [];
    weekdaysEl.replaceChildren();
    days.forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });
  }

  function renderMonthLabel() {
    const months = booking()?.months || [];
    const name = months[viewMonth] || "";
    monthLabel.innerHTML = `${name} <span class="year">${viewYear}</span>`;
  }

  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    let startOffset = first.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();

    daysEl.replaceChildren();
    renderMonthLabel();

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booking-day";

      let y = viewYear;
      let m = viewMonth;
      let d;

      if (i < startOffset) {
        d = prevDays - startOffset + i + 1;
        m = viewMonth - 1;
        if (m < 0) {
          m = 11;
          y -= 1;
        }
        btn.classList.add("booking-day--muted");
      } else if (i >= startOffset + daysInMonth) {
        d = i - (startOffset + daysInMonth) + 1;
        m = viewMonth + 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
        btn.classList.add("booking-day--muted");
      } else {
        d = i - startOffset + 1;
      }

      const key = dateKey(y, m, d);
      const hasSlots = Array.isArray(scheduleByDate[key]) && scheduleByDate[key].length > 0;
      const weekday = new Date(y, m, d).getDay();
      btn.textContent = String(d);
      btn.dataset.date = key;

      if (weekday === 0 || weekday === 6) {
        btn.classList.add("booking-day--weekend");
      }

      if (hasSlots) {
        btn.classList.add("booking-day--available");
        btn.addEventListener("click", () => selectDate(key));
      } else {
        btn.disabled = true;
      }

      if (key === selectedDateKey) {
        btn.classList.add("booking-day--selected");
      }

      daysEl.appendChild(btn);
    }
  }

  function clockSvg() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6v6l4 2"/></svg>`;
  }

  function usersSvg() {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  }

  function updateSubmitState() {
    const b = booking();
    if (!submitBtn || !b) return;

    if (submitting) {
      submitBtn.disabled = true;
      submitBtn.textContent = b.form.submitBusy;
      return;
    }

    const ready = Boolean(selectedSlot);
    submitBtn.disabled = !ready;
    submitBtn.textContent = ready ? b.form.submitReady : b.form.submitIdle;
  }

  function selectDate(key) {
    selectedDateKey = key;
    selectedSlot = null;
    setFormMessage(null);

    const slots = scheduleByDate[key] || [];
    const openSlots = slots.filter((slot) => !slot.full);
    if (openSlots.length === 1) {
      const only = openSlots[0];
      selectedSlot = {
        date: key,
        time: only.time,
        title: only.title,
      };
    }

    renderCalendar();
    renderSlots();
    updateSubmitState();
  }

  function renderSlots() {
    const b = booking();
    if (!slotsList || !b) return;

    selectedDateEl.textContent = formatHuDate(selectedDateKey);
    slotsList.replaceChildren();

    const slots = scheduleByDate[selectedDateKey] || [];
    if (!slots.length) {
      const empty = document.createElement("p");
      empty.className = "booking-slots__empty";
      empty.textContent = b.slotsEmpty;
      slotsList.appendChild(empty);
      return;
    }

    slots.forEach((slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booking-slot";
      if (slot.full) btn.disabled = true;

      const isSelected =
        selectedSlot &&
        selectedSlot.date === selectedDateKey &&
        selectedSlot.time === slot.time;
      if (isSelected) btn.classList.add("booking-slot--selected");

      const spotsHtml = slot.full
        ? `<span class="booking-slot__spots booking-slot__spots--full">${b.fullLabel}</span>`
        : `<span class="booking-slot__spots">${usersSvg()}${slot.spotsLeft} ${b.spotsSuffix}</span>`;

      btn.innerHTML = `
        <div class="booking-slot__meta">
          <div class="booking-slot__row">${clockSvg()} ${slot.time} · ${slot.title}</div>
          <p class="booking-slot__instructor">${b.instructorPrefix} ${slot.instructor}</p>
        </div>
        ${spotsHtml}
      `;

      if (!slot.full) {
        btn.addEventListener("click", () => {
          selectedSlot = {
            date: selectedDateKey,
            time: slot.time,
            title: slot.title,
          };
          setFormMessage(null);
          renderSlots();
          updateSubmitState();
        });
      }

      slotsList.appendChild(btn);
    });
  }

  function renderInfoCards() {
    const mount = document.querySelector("[data-content-list='booking.info']");
    const items = booking()?.info;
    if (!mount || !Array.isArray(items)) return;

    mount.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "booking-info__card";
      const h = document.createElement("h3");
      h.textContent = item.title || "";
      const p = document.createElement("p");
      p.textContent = item.text || "";
      card.append(h, p);
      mount.appendChild(card);
    });
  }

  function pickDefaultDate() {
    const keys = Object.keys(scheduleByDate).sort();
    if (!keys.length) {
      renderCalendar();
      renderSlots();
      return;
    }

    const inView = keys.find((k) => {
      const [y, m] = k.split("-").map(Number);
      return y === viewYear && m === viewMonth + 1;
    });

    if (inView) {
      selectDate(inView);
      return;
    }

    const [y, m] = keys[0].split("-").map(Number);
    viewYear = y;
    viewMonth = m - 1;
    selectDate(keys[0]);
  }

  async function initBookingUI() {
    if (!booking()) return;

    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    renderWeekdays();
    renderInfoCards();
    updateSubmitState();

    if (slotsList) {
      const loading = document.createElement("p");
      loading.className = "booking-slots__empty";
      loading.textContent = booking().slotsLoading || "…";
      slotsList.replaceChildren(loading);
    }

    try {
      await loadSlots();
      pickDefaultDate();
    } catch (err) {
      console.error(err);
      scheduleByDate = {};
      renderCalendar();
      if (slotsList) {
        const empty = document.createElement("p");
        empty.className = "booking-slots__empty";
        empty.textContent = booking().slotsError || "";
        slotsList.replaceChildren(empty);
      }
    }
  }

  prevBtn?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  nextBtn?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !selectedSlot || !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const b = booking();
    const fd = new FormData(form);
    const payload = {
      date: selectedSlot.date,
      time: selectedSlot.time,
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
    };

    submitting = true;
    updateSubmitState();
    setFormMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessages = {
          full: b?.form?.errorFull,
          invalid_name: b?.form?.errorName,
          invalid_phone: b?.form?.errorPhone,
          invalid_email: b?.form?.errorEmail,
          invalid_slot: b?.form?.errorSlot,
        };
        const msg =
          errorMessages[data.error] ||
          b?.form?.errorInvalid ||
          b?.form?.errorGeneric;
        setFormMessage("error", msg || "Error");
        if (data.error === "full" || data.error === "invalid_slot") {
          await loadSlots();
          renderCalendar();
          renderSlots();
          selectedSlot = null;
        }
        return;
      }

      setFormMessage("success", b?.form?.success || "");
      form.reset();
      selectedSlot = null;
      await loadSlots();
      renderCalendar();
      renderSlots();
    } catch (err) {
      console.error(err);
      const timedOut = err && err.name === "AbortError";
      setFormMessage(
        "error",
        timedOut
          ? b?.form?.errorTimeout ||
              "A foglalás túl sokáig tartott. Frissítsd az oldalt, és nézd meg, sikerült-e."
          : b?.form?.errorGeneric || "Error"
      );
    } finally {
      clearTimeout(timeoutId);
      submitting = false;
      updateSubmitState();
    }
  });

  function onReady() {
    initBookingUI();
  }

  if (window.__content?.booking) {
    onReady();
  } else {
    document.addEventListener("content:ready", onReady, { once: true });
  }
})();
