# مراجعة المشروع: ثغرات أمنية وتحسينات مقترحة

تاريخ المراجعة: 2026-10-18
نطاق المراجعة: كامل `src/` (~1044 سطر، 22 ملف)، `test/`، `package.json`، `docs/DESIGN.md`، و`npm audit`.
الخلاصة: الكود عمومًا مكتوب بعناية أمنية واضحة (escape افتراضي، CSP-friendly، لا `eval`، لا global state في الجدول)، وهذا امتداد مباشر لعمل `DESIGN.md` §3 اللي قفل عشر عيوب من الـ legacy kernel. المشاكل المتبقية صغيرة العدد لكن بعضها حقيقي ومثبت بالاختبار.

---

## 1. ثغرات أمنية (بترتيب الأولوية)

### 1.1 تجاوز حماية CSV/Excel Formula Injection عبر مسافة بادئة — **مؤكدة** 🔴

**الملف:** [src/table/export.js:4-7](../src/table/export.js#L4)

```js
export function neutralizeFormula(value) {
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
```

الفحص بيعتمد على أول حرف بالظبط. أي قيمة أول حرف فيها مسافة عادية ثم `=` أو `+` أو `-` أو `@` **بتعدي الفحص** لأنها مش بادئة بأحد الحروف المحظورة مباشرة:

```js
neutralizeFormula(' =1+1')   // => " =1+1"   (لم تُحيَّد!)
neutralizeFormula('=1+1')    // => "'=1+1"   (محمية بشكل صحيح)
```

Excel وLibreOffice وGoogle Sheets بيقصّوا (`trim`) المسافات البادئة قبل ما يقرروا إن الخلية formula أو لأ في غالبية الإصدارات والإعدادات. يعني أي بيانات قادمة من مستخدم خارجي (اسم، ملاحظة، عنوان...) تتخزن في الـ API وتترجع في جدول فيه export، لو بدأت بمسافة ثم `=HYPERLINK(...)` أو `=cmd|'/c calc'!A1` ممكن تتفذ عند فتح الملف في Excel — وده بالضبط الثغرة (CSV Injection / OWASP) اللي `DESIGN.md` §3.2 قال إنها اتقفلت، لكنها لسه مفتوحة جزئيًا.

**الإصلاح المقترح:**
```js
export function neutralizeFormula(value) {
  const s = String(value);
  return /^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
```
(تحيّد القيمة لو أول حرف غير-فراغ فيها خطر، بدل أول حرف حرفيًا — مع الحفاظ على القيمة الأصلية كما هي بعد العلامة `'`).

**الاختبار الناقص:** [test/export.test.js](../test/export.test.js) مغطّي الحالة البسيطة بس مش حالة `' =1+1'`، `'\n=1+1'`. يُفضّل إضافتها حتى ما ترجعش الثغرة تاني مستقبلاً (regression test).

---

### 1.2 العقد الضمني لـ "trusted HTML" في `render`/`content` — فخ استخدام (XSS بالاستخدام الخاطئ) 🟡

**الملفات:** [src/table/data-table.js:45](../src/table/data-table.js#L45) (`column.render`)، [src/ui/modal.js:18](../src/ui/modal.js#L18) (`content`)، [src/actions/sort-modal.js](../src/actions/sort-modal.js)، [src/table/data-table.js:70-72](../src/table/data-table.js#L70) (`getPaginationInfo().info`)

المكتبة بتوثّق إن أي HTML بيترجع من `render()` أو بيتمرر في `content`/`info` هو **trusted** ومفيش escape تاني عليه (زي `dangerouslySetInnerHTML` في React). ده قرار تصميم سليم ومكتوب في `DESIGN.md`، لكنه "escape hatch" سهل الاستخدام الخاطئ: أي مطوّر يكتب:

```js
{ key: 'bio', render: (v) => `<div>${v}</div>` }   // v بدون escape!
```

هيرجّع بالظبط نفس الـ stored-XSS اللي المكتبة اتعملت أصلاً عشان تقفله. ده مش باگ في كود المكتبة نفسها، لكنه نقطة ضعف احتمالية عالية في أي فريق هيستخدمها بدون انتباه كافي للتوثيق.

**مقترحات لتقليل الخطر (مش إلزامية لإغلاق المكتبة نفسها، لكنها hardening):**
- إضافة تحذير بارز في الـ README بجانب كل مثال فيه `render` (موجود جزئيًا، ممكن يتقوّى بمثال "خطأ شائع" واضح).
- دالة مساعدة زي `escapeHtml`/`html` موجودة بالفعل — يُفضّل كل أمثلة `render` في README/HOW-TO-USE تستخدم ` html\`<div>${v}</div>\` ` بدل template literal عادي، عشان المثال نفسه يكون "secure by default" وميبقاش نموذج يتنسخ غلط.
- اختياري: دالة `createDataTable` ممكن تدعم (في وضع dev فقط) فحص بسيط إن ناتج `render` typeof string وعليه `console.warn` لو شكله بيحتوي على tag مباشر من قيمة الصف بدون escape — ده معقد نسبيًا وممكن يتأجل.

---

### 1.3 اعتماد تطوير (`vitest`) فيه ثغرة RCE حرجة عبر `tinypool` — 🟡 (Dev-only)

**المصدر:** `npm audit`

```
tinypool 1.1.1 (مثبّت) — Severity: critical
Prototype Pollution gadget in worker options → Remote Code Execution
GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr

@vitest/mocker — Severity: moderate
Path Traversal / Arbitrary File Read via Redirect Mock
GHSA-82fw-gwwq-j7x9
```

`vitest@3.2.7` (المثبّت ضمن `^3.0.0` في `package.json`) بيثبّت `tinypool@^1.1.1` وهي نسخة متأثرة. التصحيح الرسمي بيتطلب الترقية لـ `vitest@4.x` (breaking change لإعدادات/API الاختبار).

**الخطورة الفعلية:** محدودة لأنها `devDependency` فقط (مش بتتشحن في `dist/` ولا في `files` الخاصة بـ npm package)، والاستغلال يتطلب التحكم في worker options تبع tinypool — سيناريو غير مباشر في الاستخدام العادي لـ vitest. **لكن** لو فيه CI بيشغّل اختبارات على PRs من مصادر خارجية غير موثوقة، الخطر يرتفع.

**المقترح:** جدولة ترقية `vitest` لـ v4 (أو متابعة صدور تصحيح متوافق مع v3)، وتفعيل `npm audit` كخطوة فى CI (قسم 2.4 تحت) عشان يتكشف تلقائيًا بدل ما يتلاقي بالصدفة.

---

### 1.4 ملاحظات أمنية ثانوية (مُراجَعة ومقبولة، مذكورة للتوثيق فقط)

هذه نقاط فحصتها تحديدًا لأنها أماكن شائعة للثغرات، وطلعت **سليمة**:
- `escapeHtml`/`html` (`src/core/dom.js`): يغطي `& < > " '` وكل استخدامات attributes بتحط القيمة جوه quotes — سليم.
- `safeUrl()`: بيرفض `javascript:`/`vbscript:` ضمنيًا (مش من القائمة البيضاء)، ويسمح فقط بـ `http(s)`, root-relative, و`data:image/*` محدد الأنواع. سليم، مع ملاحظة بسيطة: السماح بـ `data:image/svg+xml` كـ `<img src>` آمن في المتصفحات الحديثة (SVG جوه `<img>` ما بينفذش `<script>`)، لكن لو القيمة دي هتُستخدم يومًا في سياق تاني (زي `<object>` أو فتح مباشر) ممكن تبقى خطر — مش مشكلة حاليًا لأن الاستخدام الوحيد هو `<img>`.
- `exportPrint` (`src/table/export.js`): بيفتح نافذة فاضية (`win.open('', '_blank')`) مش URL خارجي، فمفيش مخاطر reverse-tabnabbing، والعنوان والبيانات متعمل لهم escape.
- `createHttpClient`: `credentials: 'same-origin'` افتراضيًا (قرار آمن)، مفيش CSRF token مدمج تلقائيًا لكنه قابل للحقن عبر `headers` — هذا تصميم صحيح طالما الموثّق بيستخدمه صح (مذكور في المثال الرسمي بالفعل).

---

## 2. تحسينات مقترحة (غير أمنية)

### 2.1 لا يوجد CI (GitHub Actions)
مفيش `.github/workflows/`. حاليًا الاختبارات (60 اختبار، كلها عدّت ✅) و`npm audit` بيتشغّلوا يدويًا بس. يُنصح بإضافة workflow بسيط:
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm audit --audit-level=high
```
ده كان هيمسك ثغرة §1.3 تلقائيًا، وهيمنع رجوع أي regression زي §1.1 لو اتضافله test.

### 2.2 لا يوجد ESLint/Prettier
مفيش أي ملف lint config. الكود متسق أسلوبيًا بشكل يدوي حاليًا، لكن مع زيادة المساهمين هيبقى صعب الحفاظ على التناسق (خصوصًا قواعد زي "ممنوع innerHTML بدون escape" اللي ممكن تتحول لـ lint rule مخصصة تمنع رجوع ثغرة §1.2 تلقائيًا).

### 2.3 عدم وجود أنواع TypeScript أو JSDoc typedefs كاملة
المشروع JS خالص بدون `.d.ts`. بما إن `DESIGN.md` بيذكر نية النشر كـ npm package لمشاريع admin مستقبلية، إضافة `.d.ts` (حتى لو مولّدة من JSDoc عبر `tsc --emitDeclarationOnly`) هتحسّن تجربة أي فريق هيستخدم المكتبة بإكمال تلقائي في المحرر وتوضيح العقد (زي "render يرجع trusted HTML").

### 2.4 حالة النشر (`private: true`, `UNLICENSED`)
موثّقة بالفعل في `DESIGN.md` §6 و`README.md` كقرار مؤقت. فقط تذكير: لو هتتحوّل فعليًا لـ GitHub Packages، لازم ضبط `publishConfig.registry` وإزالة `private` و`UNLICENSED` قبل أول `npm publish` (مذكور بالفعل، بس سهل يتنسى).

> **تم (#7).** `private: true` اتشالت، و`publishConfig.registry` بقى
> `https://npm.pkg.github.com`، والرخصة اتحسمت كرخصة **مملوكة لـ Maatify**
> (`"license": "SEE LICENSE IN LICENSE"` + ملف `LICENSE`) — مش مفتوحة المصدر.
> `publishConfig.registry` هو اللي بيمنع نشر مكتبة مملوكة على npm العام بالغلط،
> بما إن `private: true` كانت هتمنع النشر على GitHub Packages نفسه.

### 2.5 `i18n` state عالمي (module-level)
`src/core/i18n.js` بيستخدم متغيّر `messages` واحد على مستوى الموديول. لو صفحة واحدة فيها أكتر من `createCrudPage`/`createDataTable` بلغتين مختلفتين في نفس الوقت (نادر لكن وارد في تطبيقات متعددة الـ widgets)، آخر `setMessages()` بيكسب على الكل. مش باگ حاليًا (الاستخدام الموثّق هو صفحة = لغة واحدة)، لكن يستاهل سطر توضيح في التوثيق إن `setMessages` عالمية مش per-instance.

### 2.6 `createDataTable` بيرجع `null` بصمت عند config خاطئ
لو `container`/`columns`/`fetchPage` ناقصين، بيعمل `notify('danger', ...)` ويرجّع `null` (شايفه في [src/table/data-table.js:35-38](../src/table/data-table.js#L35)). المستهلك لازم يعمل null-check يدوي، وده سهل النسيان (`table.load()` هيرمي error مربك لو `table` كان `null`). اقتراح: توثيق واضح في JSDoc (TS consumers هيستفادوا من `| null` return type لو اتضافت الـ types من §2.3)، أو رمي `throw` بدل الإرجاع الصامت كخيار.

### 2.7 ملف `legacy/kernel/` لسه موجود في المستودع
ده الكود الأصلي اللي فيه كل العيوب العشرة الموثّقة في `DESIGN.md` §3 (stored-XSS, CSV injection, global state...). مش بيتشحن في `npm package` (`files` في `package.json` مقتصرة على `dist`/`src`/`README.md`) فمفيش خطر مباشر، لكن يستاهل:
- تعليق واضح أعلى كل ملف فيه (أو `README.md` جوه `legacy/kernel/`) إنه **مرجع تاريخي فقط ومينفعش يتستخدم مباشرة في إنتاج** — تجنبًا لأي حد يرجع ينسخ منه كود بالغلط.
- التأكد إنه فعلاً مستبعد من أي build خطوة مستقبلية.

### 2.8 لا يوجد coverage threshold في `vitest.config.js`
`vitest.config.js` بسيط جدًا (بدون `coverage`). بما إن الاختبارات الحالية ممتازة (60 اختبار بتغطي كل موديول)، إضافة `coverage: { provider: 'v8', thresholds: { lines: 80 } }` هتمنع أي انحدار تدريجي في التغطية مع نمو المكتبة.

---

## 3. ملخص الأولويات

| # | البند | النوع | الخطورة | الجهد |
|---|---|---|---|---|
| 1.1 | تجاوز CSV/Excel formula injection بمسافة بادئة | ثغرة مؤكدة | عالية | دقيقة واحدة (سطر regex) |
| 1.3 | `tinypool`/`@vitest/mocker` RCE/path-traversal (dev) | ثغرة في اعتماد تطوير | متوسطة (dev-only) | ترقية vitest لاحقًا |
| 2.1 | إضافة CI (tests + `npm audit`) | تحسين | — | ~15 دقيقة |
| 1.2 | توضيح/تقوية عقد "trusted HTML" في الأمثلة | hardening توثيقي | متوسطة (استخدام خاطئ) | ~30 دقيقة |
| 2.6 | `createDataTable` يرجع `null` بصمت | DX | منخفضة | ~10 دقائق |
| 2.2/2.3/2.8 | ESLint, types, coverage threshold | جودة كود | منخفضة | تراكمي |
| 2.5 | i18n state عالمي | توثيق فقط | منخفضة جدًا | سطر في README |
| 2.7 | تعليق تحذيري على `legacy/kernel/` | نظافة مستودع | منخفضة جدًا | ~5 دقائق |

**التوصية:** إصلاح §1.1 فورًا (سطر كود واحد + test)، ثم إضافة CI بسيط (§2.1) عشان يمسك أي حاجة زيها تلقائيًا مستقبلاً، والباقي حسب الأولوية والوقت المتاح.
