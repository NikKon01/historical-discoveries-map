/* ==========================================================================
   Мини-игра «Лента времени»: расставьте карточки открытий по хронологии,
   выбирая, раньше или позже уже выложенных они произошли.
   (использует глобальные discoveries, explorersInfo, shuffleArr из features.js)
   ========================================================================== */

const TG_COUNT = 6; // сколько карточек нужно расставить (плюс одна стартовая)
let tg = null;

function tgImg(d) {
  const i = explorersInfo[d.explorer];
  return i && i.image ? i.image : null;
}

function tgCardHTML(d, opts = {}) {
  const img = tgImg(d);
  const top = opts.hideYear ? `<span class="tg-q">?</span>` : `<span class="tg-year">${d.year}</span>`;
  const flash = opts.flash ? " " + opts.flash : "";
  const bg = img ? `style="background-image:url('${img}')"` : "";
  return `<div class="tg-card${img ? "" : " tg-card-noimg"}${flash}">
      <div class="tg-card-img" ${bg}>${top}</div>
      <div class="tg-card-body">
        <div class="tg-card-title">${d.title}</div>
        <div class="tg-card-expl">${d.explorer}</div>
      </div>
    </div>`;
}

function tgStart() {
  if (typeof clearActiveRoute === "function") clearActiveRoute();
  // выбираем карточки с уникальными годами, чтобы позиция была однозначной
  const uniq = [];
  const seen = new Set();
  for (const d of shuffleArr(discoveries)) {
    if (!seen.has(d.year)) { seen.add(d.year); uniq.push(d); }
  }
  const pick = uniq.slice(0, TG_COUNT + 1);
  tg = { placed: [{ ...pick[0] }], deck: pick.slice(1), mistakes: 0, current: null, busy: false };
  tg.current = tg.deck.shift();
  document.getElementById("tgModal").classList.remove("hidden");
  tgRenderAll();
}

function tgClose() {
  tg = null;
  document.getElementById("tgModal").classList.add("hidden");
}

function tgRenderAll() {
  // текущая карточка (год скрыт)
  document.getElementById("tgCurrent").innerHTML = tg.current
    ? `<div class="tg-current-label">Куда поставить эту карточку?</div>${tgCardHTML(tg.current, { hideYear: true })}`
    : "";

  // лента с промежутками-кнопками
  const tl = document.getElementById("tgTimeline");
  const canPlace = !!tg.current && !tg.busy;
  let html = "";
  for (let i = 0; i <= tg.placed.length; i++) {
    html += `<button class="tg-slot" data-i="${i}" ${canPlace ? "" : "disabled"} title="Поставить сюда">＋</button>`;
    if (i < tg.placed.length) {
      const p = tg.placed[i];
      html += tgCardHTML(p, { flash: p.justOk === true ? "ok" : p.justOk === false ? "wrong" : "" });
    }
  }
  tl.innerHTML = html;
  tl.querySelectorAll(".tg-slot").forEach((b) => b.addEventListener("click", () => tgPlace(+b.dataset.i)));

  // статус
  document.getElementById("tgStat").textContent =
    `Ошибок: ${tg.mistakes} · Осталось: ${tg.deck.length + (tg.current ? 1 : 0)}`;
}

function tgPlace(slot) {
  if (!tg.current || tg.busy) return;
  const y = tg.current.year;
  const correct = tg.placed.filter((p) => p.year < y).length; // верный индекс вставки
  const ok = slot === correct;
  if (!ok) tg.mistakes++;

  // вставляем на правильное место, чтобы лента оставалась хронологической
  tg.placed.splice(correct, 0, { ...tg.current, justOk: ok });
  tg.current = null;
  tg.busy = true;
  tgRenderAll(); // показываем год и вспышку (зелёная/красная)

  setTimeout(() => {
    tg.placed.forEach((p) => delete p.justOk);
    tg.busy = false;
    tg.current = tg.deck.shift() || null;
    if (!tg.current) tgResult();
    else tgRenderAll();
  }, 1100);
}

function tgResult() {
  const n = TG_COUNT;
  const s = tg.mistakes;
  let verdict = "Поздравляем!";
  if (s === 0) verdict = "Безупречно! Идеальное чувство истории! ⏳";
  else if (s <= 1) verdict = "Отличный результат!";
  else if (s <= 3) verdict = "Неплохо!";
  else verdict = "Потренируйтесь ещё!";
  document.getElementById("tgCurrent").innerHTML =
    `<div class="tg-result">${verdict}<br><span class="tg-score">Ошибок: ${s} из ${n}</span>
       <button id="tgReplay" class="tg-replay">🔁 Играть снова</button></div>`;
  document.getElementById("tgReplay").addEventListener("click", tgStart);
}

(function initTimelineGame() {
  const btn = document.getElementById("tgBtn");
  const modal = document.getElementById("tgModal");
  if (!btn || !modal) return;
  btn.addEventListener("click", tgStart);
  document.getElementById("tgClose").addEventListener("click", tgClose);
})();
