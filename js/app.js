const invitation = document.getElementById("invitation");
const invitationMusic = document.getElementById("invitationMusic");
const musicToggle = document.getElementById("musicToggle");
const scenes = [
  document.getElementById("firstScene"),
  document.getElementById("secondScene"),
  document.getElementById("thirdScene"),
  document.getElementById("rsvpScene")
];
const openCurtain = document.getElementById("openCurtain");
const nextScene = document.getElementById("nextScene");
const backScene = document.getElementById("backScene");
const showEvent = document.getElementById("showEvent");
const backToInvitation = document.getElementById("backToInvitation");
const showLocation = document.getElementById("showLocation");
const backToDate = document.getElementById("backToDate");
const showRsvp = document.getElementById("showRsvp");
const backToLocation = document.getElementById("backToLocation");
const rsvpForm = document.getElementById("rsvpForm");
const rsvpStatus = document.getElementById("rsvpStatus");
const rsvpSubmit = document.getElementById("rsvpSubmit");
const guestName = document.getElementById("guestName");
const guestCount = document.getElementById("guestCount");
const guestCountField = document.getElementById("guestCountField");
const thankYouDialog = document.getElementById("thankYouDialog");
const thankYouTitle = document.getElementById("thankYouTitle");
const thankYouMessage = document.getElementById("thankYouMessage");
const closeThankYou = document.getElementById("closeThankYou");
const dateView = document.getElementById("dateView");
const locationView = document.getElementById("locationView");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

let opening = false;
let changing = false;
let currentScene = 0;
let locationOpen = false;
let ready = false;
let submitting = false;
let submitted = false;
let wantsMusic = false;

function updateMusicButton() {
  const playing = !invitationMusic.paused;
  const label = playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى";
  musicToggle.setAttribute("aria-label", label);
  musicToggle.setAttribute("aria-pressed", String(playing));
  musicToggle.title = label;
  musicToggle.classList.toggle("is-playing", playing);
}

async function setMusicPlaying(shouldPlay) {
  wantsMusic = shouldPlay;
  if (!shouldPlay) {
    invitationMusic.pause();
    updateMusicButton();
    return;
  }
  try {
    invitationMusic.volume = 0.38;
    await invitationMusic.play();
    if (!wantsMusic) invitationMusic.pause();
  } catch {
    wantsMusic = false;
    invitationMusic.pause();
  }
  updateMusicButton();
}

function updateButtons() {
  nextScene.disabled = changing || !ready || currentScene !== 0;
  backScene.disabled = changing || currentScene !== 1;
  showEvent.disabled = changing || currentScene !== 1;
  backToInvitation.disabled = changing || currentScene !== 2 || locationOpen;
  showLocation.disabled = changing || currentScene !== 2 || locationOpen;
  backToDate.disabled = changing || currentScene !== 2 || !locationOpen;
  showRsvp.disabled = changing || currentScene !== 2 || !locationOpen;
  backToLocation.disabled = changing || currentScene !== 3;
}

async function revealInvitation() {
  if (opening) return;
  opening = true;
  openCurtain.disabled = true;
  // استدعاء play داخل نقرة الزائر يسمح بالتشغيل في المتصفحات التي تمنع التشغيل التلقائي.
  void setMusicPlaying(true);
  invitation.classList.add("is-opening");

  await delay(reduceMotion ? 0 : 2600);
  invitation.classList.add("is-butterfly-landed");
  await delay(reduceMotion ? 0 : 250);
  invitation.classList.add("is-curtain-open", "is-open");
  await delay(reduceMotion ? 0 : 1050);
  ready = true;
  invitation.classList.add("is-ready");
  updateButtons();
}

async function goToScene(target) {
  if (changing || !ready || target === currentScene || target < 0 || target >= scenes.length) return;
  changing = true;
  updateButtons();
  invitation.classList.add("is-scene-changing");

  await delay(reduceMotion ? 0 : 280);
  currentScene = target;
  if (target < 2) {
    locationOpen = false;
    dateView.setAttribute("aria-hidden", "false");
    locationView.setAttribute("aria-hidden", "true");
  }
  invitation.classList.toggle("show-second", target >= 1);
  invitation.classList.toggle("show-event", target === 2);
  invitation.classList.toggle("show-rsvp", target === 3);
  scenes.forEach((scene, index) => {
    scene.setAttribute("aria-hidden", String(index !== target));
  });

  await delay(reduceMotion ? 0 : 520);
  invitation.classList.remove("is-scene-changing");
  await delay(reduceMotion ? 0 : 620);
  changing = false;
  updateButtons();
  [nextScene, showEvent, locationOpen ? showRsvp : showLocation, guestName][target].focus();
}

function updateAttendance() {
  const attending = rsvpForm.elements.attendance.value === "yes";
  guestCountField.hidden = !attending;
  guestCount.disabled = !attending;
  guestCount.required = attending;
  if (attending && guestCount.value === "") guestCount.value = "0";
}

function showThankYou(name, attending) {
  thankYouDialog.classList.toggle("is-celebrating", attending);
  thankYouTitle.textContent = attending ? "شكرًا لتأكيد حضورك" : "شكرًا لإبلاغنا";
  thankYouMessage.textContent = attending
    ? `سعداء بمشاركتك فرحتنا يا ${name}. ننتظرك بكل محبة!`
    : `شكرًا لردّك يا ${name}. سنفتقد حضورك ونتمنى لك كل الخير.`;
  thankYouDialog.showModal();
  closeThankYou.focus();
}

async function submitRsvp(event) {
  event.preventDefault();
  if (submitting || submitted) return;

  const name = guestName.value.trim();
  const attendance = rsvpForm.elements.attendance.value;
  const count = attendance === "yes" ? Number(guestCount.value) : 0;
  if (!name || !["yes", "no"].includes(attendance) ||
      (attendance === "yes" && (!Number.isInteger(count) || count < 0 || count > 9))) {
    rsvpStatus.dataset.state = "error";
    rsvpStatus.textContent = "تحقق من الاسم وعدد الحاضرين قبل الإرسال.";
    return;
  }

  const localServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const endpoint = rsvpForm.dataset.formspreeEndpoint?.trim() || "";
  const validEndpoint = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint);
  if (window.location.protocol === "file:" || (!localServer && !validEndpoint)) {
    rsvpStatus.dataset.state = "error";
    rsvpStatus.textContent = "استقبال الردود غير مفعّل بعد. يُرجى التواصل مع أصحاب الدعوة.";
    return;
  }

  submitting = true;
  rsvpSubmit.disabled = true;
  rsvpSubmit.textContent = "جارٍ الإرسال…";
  rsvpStatus.textContent = "";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = localServer
      ? await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, attendance, count }),
        signal: controller.signal
      })
      : await fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new URLSearchParams({
          guestName: name,
          attendance: attendance === "yes" ? "سيحضر" : "يعتذر",
          guestCount: String(count),
          totalGuests: String(attendance === "yes" ? count + 1 : 0)
        }),
        signal: controller.signal
      });
    if (!response.ok) throw new Error("Request failed");
    submitted = true;
    rsvpStatus.dataset.state = "success";
    rsvpStatus.textContent = attendance === "yes"
      ? "شكرًا لك، تم تسجيل حضوركم بنجاح."
      : "شكرًا لإبلاغنا، تم تسجيل اعتذاركم.";
    rsvpSubmit.textContent = "تم تسجيل الرد ✓";
  } catch {
    rsvpStatus.dataset.state = "error";
    rsvpStatus.textContent = "تعذّر إرسال الرد. تأكد من اتصالك ثم حاول مجددًا.";
    rsvpSubmit.textContent = "إعادة المحاولة";
  } finally {
    window.clearTimeout(timeout);
    submitting = false;
    rsvpSubmit.disabled = submitted;
  }
  if (submitted) showThankYou(name, attendance === "yes");
}

async function changeEventView(openLocation) {
  if (changing || currentScene !== 2 || locationOpen === openLocation) return;
  changing = true;
  updateButtons();
  invitation.classList.add("is-location-changing");
  await delay(reduceMotion ? 0 : 230);

  locationOpen = openLocation;
  dateView.setAttribute("aria-hidden", String(openLocation));
  locationView.setAttribute("aria-hidden", String(!openLocation));
  invitation.classList.remove("is-location-changing");
  await delay(reduceMotion ? 0 : 430);

  changing = false;
  updateButtons();
  (openLocation ? backToDate : showLocation).focus();
}

openCurtain.addEventListener("click", revealInvitation);
musicToggle.addEventListener("click", () => {
  void setMusicPlaying(invitationMusic.paused);
});
invitationMusic.addEventListener("ended", updateMusicButton);
invitationMusic.addEventListener("error", () => {
  wantsMusic = false;
  updateMusicButton();
  musicToggle.title = "تعذّر تشغيل الموسيقى";
});
nextScene.addEventListener("click", () => goToScene(1));
backScene.addEventListener("click", () => goToScene(0));
showEvent.addEventListener("click", () => goToScene(2));
backToInvitation.addEventListener("click", () => goToScene(1));
showLocation.addEventListener("click", () => changeEventView(true));
backToDate.addEventListener("click", () => changeEventView(false));
showRsvp.addEventListener("click", () => goToScene(3));
backToLocation.addEventListener("click", () => goToScene(2));
rsvpForm.addEventListener("change", updateAttendance);
rsvpForm.addEventListener("submit", submitRsvp);
closeThankYou.addEventListener("click", () => thankYouDialog.close());
thankYouDialog.addEventListener("close", () => backToLocation.focus());
updateAttendance();
updateButtons();
