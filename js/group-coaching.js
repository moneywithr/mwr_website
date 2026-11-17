// Gruppen-Coaching: fragt den Platz-Zähler (Cloudflare Worker) ab und
// aktualisiert Badge/CTA. Schlägt der Abruf fehl, bleibt der statische
// Text aus dem HTML stehen (z. B. "5 Plätze") – kein Blocker für die Seite.
(function () {
  // TODO: nach dem Deploy des Workers hier die echte URL eintragen,
  // siehe cloudflare/group-coaching-seats/README.md
  const SEATS_API = "";

  if (!SEATS_API) return;

  const badge = document.querySelector(".seats-badge");
  const ctaButtons = document.querySelectorAll(".coaching-btn");
  const seatsLine = document.querySelector(".program-list li:last-child span:last-child");

  fetch(SEATS_API + "/seats")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      if (!data || typeof data.remaining !== "number") return;

      if (data.soldOut) {
        if (badge) badge.textContent = Site.t("groupCoachingSoldOutBadge");
        if (seatsLine) seatsLine.textContent = Site.t("groupCoachingSoldOutBadge");
        ctaButtons.forEach((btn) => {
          btn.setAttribute("aria-disabled", "true");
          btn.classList.add("coaching-btn-disabled");
          btn.addEventListener("click", (e) => e.preventDefault());
          const span = btn.querySelector("span");
          if (span) span.textContent = Site.t("groupCoachingSoldOutCta");
        });
        return;
      }

      const remainingText = Site.t("groupCoachingSeatsRemaining").replace("{n}", data.remaining);
      if (badge) badge.textContent = remainingText;
      if (seatsLine) seatsLine.textContent = remainingText;
    })
    .catch(() => {
      // Abruf fehlgeschlagen (Worker nicht erreichbar o.ä.) – statischer Text bleibt stehen.
    });
})();
