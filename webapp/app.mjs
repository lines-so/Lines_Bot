const telegram = window.Telegram?.WebApp;
telegram?.ready();
telegram?.expand();

function syncTheme() {
  document.documentElement.classList.toggle("dark", telegram?.colorScheme === "dark");
  const background = getComputedStyle(document.documentElement).getPropertyValue("--chrome").trim();
  if (telegram?.isVersionAtLeast?.("6.1")) telegram.setBackgroundColor(background);
  if (telegram?.isVersionAtLeast?.("6.9")) telegram.setHeaderColor(background);
}
syncTheme();
telegram?.onEvent?.("themeChanged", syncTheme);
const view = document.querySelector("#view");
const status = document.querySelector("#status");
let page = 0;
let photoUrls = [];
let botName;

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function notice(text = "") {
  status.textContent = text;
  status.hidden = !text;
}

function begin(title) {
  page += 1;
  photoUrls.forEach((url) => URL.revokeObjectURL(url));
  photoUrls = [];
  notice();
  view.className = "stack";
  view.replaceChildren(element("h1", title));
  return page;
}

async function request(path, options = {}) {
  const headers = { "X-Telegram-Init-Data": telegram?.initData ?? "" };
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api/${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "ارتباط با ایده بان برقرار نشد. دوباره امتحان کنید.");
  }
  return response;
}

async function api(path, method = "GET", body) {
  const response = await request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  return response.json();
}

function button(text, action, primary = false) {
  const node = element("button", text, { type: "button", class: primary ? "primary" : "" });
  node.addEventListener("click", async () => {
    node.disabled = true;
    notice();
    try { await action(); } catch (error) { notice(error.message); } finally { node.disabled = false; }
  });
  return node;
}

function row(...nodes) {
  const node = element("div", "", { class: "row" });
  node.append(...nodes);
  return node;
}

function field(label, input) {
  const node = element("label", label);
  node.append(input);
  return node;
}

function input(value, max, placeholder = "") {
  const node = element("input", "", { maxlength: max, placeholder });
  node.value = value;
  return node;
}

async function openChat(branchId) {
  botName ??= (await api("bot")).username;
  const url = `https://t.me/${botName}?start=b_${branchId}`;
  telegram.openTelegramLink(url);
}

async function showList() {
  const current = begin("ایده های من");
  const search = input("", 120, "جستجو در عنوان، متن یا برچسب");
  search.setAttribute("aria-label", "جستجوی ایده ها");
  const list = element("div", "", { class: "idea-grid" });
  const summary = element("p", "", { class: "muted result-count", "aria-live": "polite" });
  const intro = element("p", "جرقه هایت را ثبت کن و هر ایده را از همان جایی که رها کردی ادامه بده.", { class: "muted" });
  const tools = row(button("ایده جدید", showNewIdea, true), button("ترکیب دو ایده", showMerge));
  view.append(intro, tools, element("div", "", { class: "divider" }), search, summary, list);
  let revision = 0;
  let timer;
  async function load() {
    const version = ++revision;
    const ideas = await api(`ideas?q=${encodeURIComponent(search.value)}`);
    if (current !== page || version !== revision) return;
    list.replaceChildren();
    summary.textContent = `${new Intl.NumberFormat("fa").format(ideas.length)} ایده`;
    if (!ideas.length) list.append(element("p", search.value ? "ایده ای پیدا نشد." : "برای ثبت اولین جرقه، «ایده جدید» را بزنید.", { class: "card empty muted" }));
    for (const idea of ideas) {
      const card = element("article", "", { class: "card idea-card" });
      card.append(element("h2", idea.title));
      if (idea.preview && idea.preview !== idea.title) card.append(element("p", idea.preview, { class: "preview muted" }));
      const labels = [idea.medium, ...idea.tags.split(/[,،]/u)].map((label) => label.trim()).filter(Boolean);
      if (labels.length) card.append(row(...labels.map((label) => element("span", label, { class: "badge" }))));
      card.append(button("باز کردن ایده", () => showIdea(idea.id)));
      list.append(card);
    }
  }
  search.addEventListener("input", () => {
    revision += 1;
    clearTimeout(timer);
    timer = setTimeout(() => load().catch((error) => { if (current === page) notice(error.message); }), 180);
  });
  await load();
}

function showNewIdea() {
  const current = begin("ایده جدید");
  const form = element("form", "", { class: "card stack" });
  const title = input("", 120, "یک عنوان کوتاه");
  title.required = true;
  const text = element("textarea", "", { required: "", maxlength: "16000", placeholder: "جرقه ایده ات را بنویس." });
  const submit = element("button", "ذخیره ایده", { type: "submit", class: "primary" });

  form.append(field("عنوان", title), field("متن ایده", text),
    row(submit, button("انصراف", showList)));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    if (!title.value.trim() || !text.value.trim()) {
      notice("عنوان و متن ایده را وارد کنید.");
      return;
    }

    submit.disabled = true;
    notice();
    try {
      const idea = await api("ideas", "POST", { title: title.value, text: text.value });
      if (current === page) await showIdea(idea.id);
    } catch (error) {
      notice(error.message);
    } finally {
      submit.disabled = false;
    }
  });
  view.append(form);
  title.focus();
}

function branchSelect(idea, value) {
  const select = element("select", "", { "aria-label": "شاخه" });
  for (const branch of idea.branches) select.append(element("option", branch.name, { value: branch.id }));
  if (value) select.value = value;
  return select;
}

function entryCard(entry, current) {
  const card = element("article", "", { class: "card" });
  if (entry.body) card.append(element("p", entry.body));
  if (entry.has_photo) {
    const placeholder = element("small", "در حال بارگیری تصویر…");
    card.append(placeholder);
    request(`photo/${entry.id}`).then((response) => response.blob()).then((blob) => {
      if (current !== page || !card.isConnected) return;
      const url = URL.createObjectURL(blob);
      photoUrls.push(url);
      placeholder.replaceWith(element("img", "", { src: url, alt: "تصویر جرقه" }));
    }).catch(() => { placeholder.textContent = "تصویر در دسترس نیست."; });
  }
  return card;
}

async function showIdea(id, branchId) {
  const current = begin("ایده");
  const idea = await api(`ideas/${id}`);
  if (current !== page) return;
  view.firstChild.textContent = idea.title;
  const select = branchSelect(idea, branchId);
  const branch = idea.branches.find((item) => item.id === select.value);
  const title = input(idea.title, 120);
  const tags = input(idea.tags, 250, "مثلا خاطره، شهر");
  const medium = input(idea.medium, 80, "مثلا موسیقی یا بازی");
  const details = element("details", "", { class: "card" });
  details.append(element("summary", "ویرایش عنوان و دسته بندی"), field("عنوان", title), field("برچسب ها", tags), field("قالب پیشنهادی (اختیاری)", medium),
    button("ذخیره", async () => {
      await api(`ideas/${id}`, "PATCH", { title: title.value, tags: tags.value, medium: medium.value });
      await showIdea(id, branch.id);
    }));
  view.append(row(button("دفتر ایده ها", showList), button("ادامه در چت", () => openChat(branch.id), true)), details);
  if (idea.sources.length) view.append(row(element("small", "ترکیب شده از"), ...idea.sources.map((source) => button(source.title, () => showIdea(source.id)))));
  select.addEventListener("change", () => showIdea(id, select.value).catch((error) => notice(error.message)));
  const name = input(branch.name, 80);
  const branchPanel = element("section", "", { class: "card stack branch-panel" });
  branchPanel.append(field("شاخه فعال", select), field("نام شاخه", name), button("ذخیره نام شاخه", async () => {
    await api(`branches/${branch.id}`, "PATCH", { name: name.value });
    await showIdea(id, branch.id);
  }));
  view.append(branchPanel, element("h2", "جرقه های این شاخه", { class: "section-title" }));
  const entries = await api(`branches/${branch.id}`);
  if (current !== page) return;
  if (!entries.length) view.append(element("p", "این شاخه هنوز جرقه ای ندارد.", { class: "muted" }));
  for (const entry of entries) {
    const card = entryCard(entry, current);
    if (entry.branch_id !== branch.id) card.prepend(element("small", "از مسیر مشترک", { class: "badge" }));
    card.append(button("ادامه در شاخه جدید", async () => {
      const fork = await api(`branches/${branch.id}/fork`, "POST", { entryId: entry.id });
      await showIdea(id, fork.id);
    }));
    view.append(card);
  }
}

async function showMerge() {
  const current = begin("ترکیب دو ایده");
  view.append(button("دفتر ایده ها", showList));
  const ideas = await api("ideas");
  if (current !== page) return;
  if (ideas.length < 2) {
    view.append(element("p", "برای ترکیب، ابتدا دو ایده ثبت کنید."));
    return;
  }
  const selections = [0, 1].map((index) => {
    const select = element("select", "", { "aria-label": index ? "ایده دوم" : "ایده اول" });
    for (const idea of ideas) select.append(element("option", idea.title, { value: idea.id }));
    select.selectedIndex = index;
    return select;
  });
  const sourceArea = element("div", "", { class: "stack" });
  let loadedSources;
  view.append(...selections.map((select, index) => field(index ? "ایده دوم" : "ایده اول", select)), button("باز کردن دو منبع", async () => {
    const ids = selections.map((select) => select.value);
    if (loadedSources && ids.every((id, index) => id === loadedSources[index])) return;
    if (loadedSources && !window.confirm("با تغییر منابع، پیش نویس ترکیب فعلی پاک می شود. ادامه می دهید؟")) {
      selections.forEach((select, index) => { select.value = loadedSources[index]; });
      return;
    }
    if (ids[0] === ids[1]) throw new Error("دو ایده متفاوت انتخاب کنید.");
    const sources = await Promise.all(ids.map((id) => api(`ideas/${id}`)));
    if (current !== page) return;
    sourceArea.replaceChildren();
    const panels = element("div", "", { class: "source-grid" });
    sourceArea.append(panels);
    const text = element("textarea", "", { maxlength: "16000", placeholder: "تکه های انتخابی را اینجا ویرایش و ترکیب کنید." });
    const title = input("", 120, "عنوان ایده جدید");
    const photos = new Set();
    for (const source of sources) {
      const panel = element("fieldset", "", { class: "stack" });
      const select = branchSelect(source);
      const cards = element("div", "", { class: "stack" });
      const sourcePhotos = new Set();
      let revision = 0;
      async function render() {
        const version = ++revision;
        const entries = await api(`branches/${select.value}`);
        if (current !== page || version !== revision) return;
        cards.replaceChildren();
        for (const entry of entries) {
          const card = entryCard(entry, current);
          if (entry.body) card.append(button("افزودن متن به پیش نویس", () => {
            const next = [text.value, entry.body].filter(Boolean).join("\n\n");
            if (next.length > 16000) throw new Error("متن ترکیب باید حداکثر ۱۶ هزار نویسه باشد.");
            text.value = next;
          }));
          if (entry.has_photo) {
            const checkbox = element("input", "", { type: "checkbox" });
            checkbox.checked = sourcePhotos.has(entry.id);
            checkbox.addEventListener("change", () => {
              if (checkbox.checked) {
                sourcePhotos.add(entry.id);
                photos.add(entry.id);
              } else {
                sourcePhotos.delete(entry.id);
                photos.delete(entry.id);
              }
            });
            card.append(field(" انتخاب تصویر ", checkbox));
          }
          cards.append(card);
        }
      }
      select.addEventListener("change", () => render().catch((error) => notice(error.message)));
      panel.append(element("legend", source.title), select, cards);
      panels.append(panel);
      await render();
    }
    const draft = element("section", "", { class: "card stack" });
    draft.append(element("h2", "پیش نویس ترکیب"), field("عنوان ایده تازه", title), field("متن ترکیب", text), button("ساخت ایده جدید", async () => {
      const idea = await api("ideas/merge", "POST", { sources: ids, title: title.value, text: text.value, photos: [...photos] });
      await showIdea(idea.id);
    }, true));
    sourceArea.append(draft);
    loadedSources = ids;
  }), sourceArea);
}

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  showList().catch((error) => notice(error.message));
});
if (telegram?.initData) showList().catch((error) => notice(error.message));
else {
  begin("ایده بان");
  notice("برای باز کردن دفتر شخصی، در چت ربات روی «دفتر ایده ها» بزنید.");
}
