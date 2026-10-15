// kamus terjemahan id dan en, key harus sama persis dengan atribut data-i18n di html
// default teks di html sudah bahasa indonesia, ini isinya terjemahan inggris
export const dict = {
  en: {
    'nav.work': 'Work',
    'nav.skills': 'Skills',
    'nav.road': 'Journey',
    'nav.contact': 'Contact',
    'nav.menu': 'Index',
    'nav.close': 'Close',

    'cover.open': 'Open to work',
    'cover.role': 'Multi&#8209;disciplinary developer - Android native, web &amp; backend.',
    'cover.intro': 'I build Android apps with Kotlin and Jetpack Compose, and ship the web and backend behind them. Informatics Engineering graduate (2025), Bangkit Academy 2024 alumnus.',
    'cover.cta_work': 'See 16 projects',
    'cover.cta_cv': 'Download CV',
    'cover.caption': 'fig.&nbsp;1 - portrait of the author',
    'cover.scroll': 'Scroll down &#8595;',

    'work.title': 'Selected work',
    'work.meta': 'Selected work / 16 repositories',
    'work.snapcal_stamp': 'Thesis · Android + Web · Live',
    'work.snapcal_lede': 'AI-based calorie &amp; nutrition app: snap your food, the model detects what it is, and the calorie estimate can be corrected before it enters your log. Fully Compose on Android, with a live web version.',
    'work.snapcal_1': 'Food detection from a photo: local YOLO model, or Gemini &amp; Groq as AI services.',
    'work.snapcal_2': 'Results can be corrected manually: meal time, name, and weight.',
    'work.snapcal_3': 'AI nutritionist chat with conversation history.',
    'work.snapcal_4': 'Daily &amp; weekly intake summaries in charts.',
    'work.snapcal_5': 'Meal-history calendar + Firebase notifications.',
    'work.snapcal_link_android': 'Android code',
    'work.snapcal_link_web': 'Try the web version',
    'work.snapcal_link_backend': 'Backend',
    'work.lumimi_stamp': 'Desktop · Windows · Live2D',
    'work.lumimi_lede': 'A Live2D desktop companion - local model (offline) or cloud API: talk by text or voice, the character reacts to the conversation, then idles with chatter of its own. Three modes without restarting: AI VTuber for streaming, assistant panel, or a transparent desktop pet.',
    'work.lumimi_1': 'All Cubism 4/5 models supported, capabilities detected automatically.',
    'work.lumimi_2': 'LLM, TTS &amp; STT can run as a local model (offline) or cloud API - your choice. Local mode: no data leaves the machine.',
    'work.lumimi_3': 'Implementation AI-assisted.',
    'work.lumimi_link': 'Code on GitHub',
    'work.tier_android': 'Android native - Kotlin',
    'work.aturdana': 'Personal finance management: transactions, budgets, bill reminders.',
    'work.aturdana_tag': 'Kotlin · Personal finance',
    'work.listanime': 'Browse &amp; view anime details from the Jikan API. Multi-module dynamic feature, SQLCipher-encrypted database, DI with Koin.',
    'work.githubuser': 'Search GitHub users, view details &amp; followers, save favourites in Room, set the theme via DataStore.',
    'work.ngeresep': 'Native Android recipe app.',
    'work.tier_web': 'Web, backend &amp; exploration',
    'work.apotek_tag': 'Flutter · Dart · Provider · team collaboration',
    'work.mediacms_tag': 'Next.js · Headless CMS · editorial',
    'work.devlens_tag': 'JavaScript · Chrome &amp; Firefox extension',
    'work.portfoliov1_tag': 'Vue 3 · TypeScript · GSAP · interactive SPA',

    'spec.title': 'Specifications',
    'spec.meta': 'Spec sheet / tools of the trade',
    'spec.lang': 'Languages',
    'spec.mobile': 'Mobile',
    'spec.data': 'Data &amp; Backend',
    'spec.tools': 'Tools',
    'spec.design': 'Design',

    'road.title': 'Journey',
    'road.meta': '2019 → now',
    'road.2019_t': 'Engineering Intern - Hotel Aryaduta Suites Semanggi',
    'road.2019_d': 'Jul–Dec 2019. Preventive &amp; corrective maintenance of the hotel’s electrical systems and electronic equipment.',
    'road.2021_t': 'B.Eng. Informatics - Universitas Gunadarma',
    'road.2021_d': '2021–2025. Where my software-engineering foundation was built, from PHP to mobile.',
    'road.2022_t': 'Field Data Collection Officer - Statistics Indonesia (BPS)',
    'road.2022_d': 'Oct–Nov 2022, Regsosek 2022 in the Pondok Bambu area. Door-to-door field data collection, sharpening precision and discipline in following procedure.',
    'road.2024_t': 'Bangkit Academy - Android Development Path',
    'road.2024_d': 'Feb–Jul 2024, by Google, GoTo &amp; Traveloka. Intensive native-Android training. Capstone: <a href="https://github.com/farelyudapratama/SnapCal-MD">SnapCal-MD</a>, the predecessor of SnapCal.',
    'road.2025_t': 'Graduated &amp; opened a new chapter',
    'road.2025_d': 'Finished my B.Eng. and kept building my own products: SnapCal, Lumimi, and friends.',

    'contact.title': 'Let’s talk?',
    'contact.meta': 'Contact',
    'contact.lede': 'For full-time roles, contracts, project collaboration, or just to chat about Jetpack Compose. I reply fast over email.',
    'contact.copy': 'Copy',
    'contact.cv': 'CV (PDF) ↗',
    'contact.loc': 'East Jakarta, Indonesia · UTC+7 · +62&#8209;859&#8209;5904&#8209;5569',

    'work.zoom': 'View',
    'lightbox.open': 'Open project &#8599;',

    'footer.top': 'Back to top &#8593;',
  },
};

// teks label UI yang berubah dinamis saat tombol diklik (theme, copy button, toggle bahasa)
export const ui = {
  id: { themeDay: 'Siang', themeNight: 'Malam', copyDone: 'Tersalin ✓', langOther: 'EN' },
  en: { themeDay: 'Day', themeNight: 'Night', copyDone: 'Copied ✓', langOther: 'ID' },
};

// simpan teks default bahasa indonesia dari DOM dulu biar pas switch balik ke id bisa dipulihkan
let idSnapshot = null;

function snapshot() {
  if (idSnapshot) return;
  idSnapshot = {};
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    idSnapshot[el.getAttribute('data-i18n')] = el.innerHTML;
  });
}

export function applyLang(lang) {
  snapshot();
  const table = lang === 'id' ? idSnapshot : dict[lang];
  if (table) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (table[key] != null) el.innerHTML = table[key];
    });
  }
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
}