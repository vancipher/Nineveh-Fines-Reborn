/**
 * Official 59 violation types — wording from the Excel template (59مخالفة sheet).
 */
export const SEED_VIOLATIONS = [
  { index: 1, excelRow: 3, nameAr: 'عدم الامتثال للإشارة الضوئية أو إشارة رجل المرور التنظيمية', nameEn: 'Failure to obey traffic light or officer signal' },
  { index: 2, excelRow: 4, nameAr: 'قيادة مركبة بإهمال ورعونة', nameEn: 'Reckless/negligent driving' },
  { index: 3, excelRow: 5, nameAr: 'قيادة مركبة بسرعة تزيد عن السرعة المقررة قانوناً', nameEn: 'Exceeding the legal speed limit' },
  { index: 4, excelRow: 6, nameAr: 'مخالفة قواعد السير والمرور على الطرق السريعة', nameEn: 'Violation of highway traffic rules' },
  { index: 5, excelRow: 7, nameAr: 'السير عكس الاتجاه', nameEn: 'Driving against traffic flow' },
  { index: 6, excelRow: 8, nameAr: 'الزجاج المضلل والستائر', nameEn: 'Tinted glass / curtains' },
  { index: 7, excelRow: 9, nameAr: 'عدم تثبيت لوحات مفردة أو مزدوجة (بدون لوحة تسجيل)', nameEn: 'Missing registration plates' },
  { index: 8, excelRow: 10, nameAr: 'عدم وضع غطاء الحمولة', nameEn: 'Uncovered load' },
  { index: 9, excelRow: 11, nameAr: 'ارتفاع الحمولة', nameEn: 'Load exceeds legal height' },
  { index: 10, excelRow: 12, nameAr: 'عدم مراجعة البائع أو المشتري لنقل ملكية المركبة خلال (30) يوم', nameEn: 'Failure to transfer ownership within 30 days' },
  { index: 11, excelRow: 13, nameAr: 'تنظيم أكثر من عقد واحد للمركبة ذاتها من قبل البائع', nameEn: 'Multiple sale contracts for the same vehicle' },
  { index: 12, excelRow: 14, nameAr: 'قيادة مركبة بإجازة سوق غير مختصة بنوع المركبة', nameEn: 'Driving with a license for a different vehicle class' },
  { index: 13, excelRow: 15, nameAr: 'عدم (حمل إجازة السوق أو السنوية) أو الامتناع عن إعطائها', nameEn: 'Failure to carry or present driving/annual license' },
  { index: 14, excelRow: 16, nameAr: 'عدم (تجديد إجازة السوق أو السنوية) بعد مرور (30) يوم', nameEn: 'Failure to renew license within 30 days' },
  { index: 15, excelRow: 17, nameAr: 'عدم مراجعة دائرة التسجيل لتسجيل المركبة بعد (30) يوم على كتاب البيع أو التسجيل', nameEn: 'Failure to register vehicle within 30 days of sale' },
  { index: 16, excelRow: 18, nameAr: 'الوقوف الممنوع', nameEn: 'Illegal parking' },
  { index: 17, excelRow: 19, nameAr: 'عدم إعطاء الأسبقية للمشاة في منطقة العبور', nameEn: 'Failure to yield to pedestrians at crossing' },
  { index: 18, excelRow: 20, nameAr: 'عدم ارتداء حزام الأمان (للسائق أو الراكب الذي بجانبه) أو جلوس الأطفال دون سن (8) سنوات في المقعد الأمامي للسيارة', nameEn: 'Seatbelt / child in front seat violation' },
  { index: 19, excelRow: 21, nameAr: 'استعمال الضوء العالي', nameEn: 'Improper use of high beams' },
  { index: 20, excelRow: 22, nameAr: 'استعمال جهاز التنبيه الهوائي أو آخر غير متواجد في المنشأ', nameEn: 'Non-standard air horn' },
  { index: 21, excelRow: 23, nameAr: 'الاجتياز الخاطئ من جهة اليمين', nameEn: 'Improper passing on the right' },
  { index: 22, excelRow: 24, nameAr: 'وضع ملصقات زينة', nameEn: 'Decorative stickers' },
  { index: 23, excelRow: 25, nameAr: 'نقل ركاب على جوانب العجلة أو جزء خارجي منها أو أكثر من استيعابها', nameEn: 'Carrying passengers unsafely / overcapacity' },
  { index: 24, excelRow: 26, nameAr: 'قيادة الدراجات النارية التي سعة محركها تقل عن (40 cc) في الشوارع الرئيسية', nameEn: 'Under-40cc motorcycles on main streets' },
  { index: 25, excelRow: 27, nameAr: 'مخالفة العلامات المرورية الشاخصة أو الأرضية', nameEn: 'Disregarding road signs / markings' },
  { index: 26, excelRow: 28, nameAr: 'عدم التنبيه بالإشارة قبل مسافة كافية عند الاستدارة أو الوقوف', nameEn: 'Failure to signal before turning or stopping' },
  { index: 27, excelRow: 29, nameAr: 'تحريك المركبة قبل التأكد من خلو جهة المرور من المركبات', nameEn: 'Moving off without checking for traffic' },
  { index: 28, excelRow: 30, nameAr: 'قيادة (عجلة حمل أو زراعية أو إنشائية أو الدراجات النارية المحورة) التي تسير على الجانب الأيسر من الطريق', nameEn: 'Heavy/agricultural/modified-bike driving on the left lane' },
  { index: 29, excelRow: 31, nameAr: 'التسبب بالازدحام لأي سبب كان', nameEn: 'Causing traffic congestion' },
  { index: 30, excelRow: 32, nameAr: 'رمي النفايات والأوراق والسكائر في الشوارع', nameEn: 'Littering on the road' },
  { index: 31, excelRow: 33, nameAr: 'تجاوز عدد ركاب الحافلة للعدد المرخص به', nameEn: 'Bus exceeding licensed capacity' },
  { index: 32, excelRow: 34, nameAr: 'إخراج الرؤوس والأبدان من النوافذ في الحافلة', nameEn: 'Head/body outside bus windows' },
  { index: 33, excelRow: 35, nameAr: 'عدم إنارة الحافلة من الداخل بين غروب الشمس وشروقها وعند الضرورة', nameEn: 'Bus interior unlit at night' },
  { index: 34, excelRow: 36, nameAr: 'الوقوف لأخذ الركاب أو إنزالهم في الأماكن غير المخصصة للوقوف', nameEn: 'Stopping for passengers in non-designated areas' },
  { index: 35, excelRow: 37, nameAr: 'التحدث مع الركاب أثناء سير الحافلة أو الوقوف بجانب السائق', nameEn: 'Driver talking with passengers / standing beside driver' },
  { index: 36, excelRow: 38, nameAr: 'رفض ركوب على استعداد لدفع التعريفة المقررة إذا لم تكن المركبة مستكملة عدد الركاب المرخص به', nameEn: 'Refusing a paying passenger below capacity' },
  { index: 37, excelRow: 39, nameAr: 'عدم تثبيت إعلان يوضح عدد الأشخاص المرخص به وأن المركبة للأجرة', nameEn: 'Missing capacity / for-hire notice' },
  { index: 38, excelRow: 40, nameAr: 'عدم تفتيش الحافلة وعدم تسليم الأمانة إلى أقرب مركز شرطة خلال (24) ساعة', nameEn: 'Failure to inspect bus / deliver lost items within 24h' },
  { index: 39, excelRow: 41, nameAr: 'الأشخاص أثناء عبور الشارع من غير المناطق المخصصة للعبور', nameEn: 'Pedestrians crossing outside designated areas' },
  { index: 40, excelRow: 42, nameAr: 'استعمال الهاتف النقال أثناء القيادة', nameEn: 'Using mobile phone while driving' },
  { index: 41, excelRow: 43, nameAr: 'عدم وضوح لوحات', nameEn: 'Illegible plates' },
  { index: 42, excelRow: 44, nameAr: 'الاستدارة من مكان ممنوع', nameEn: 'Turning from a prohibited point' },
  { index: 43, excelRow: 45, nameAr: 'عدم التوقف عند الخروج من شارع فرعي إلى رئيسي', nameEn: 'Failure to stop exiting side street' },
  { index: 44, excelRow: 46, nameAr: 'الوقوف في جهة اليمين ومنع انسيابية حركة المرور', nameEn: 'Right-side parking obstructing traffic' },
  { index: 45, excelRow: 47, nameAr: 'عدم توفر شروط المتانة والأمان', nameEn: 'Vehicle fails safety/strength requirements' },
  { index: 46, excelRow: 48, nameAr: 'قيادة مركبة دون السن القانوني (الأحداث)', nameEn: 'Under-age driving (minors)' },
  { index: 47, excelRow: 49, nameAr: 'بيان رقم (5) لسنة 2024 دخول المركبات الحمل للعاصمة', nameEn: 'Statement 5/2024 — heavy vehicles entering the capital' },
  { index: 48, excelRow: 50, nameAr: 'م.ب (3) لسنة 2011 مطفأة حريق', nameEn: 'Ministerial order 3/2011 — fire extinguisher' },
  { index: 49, excelRow: 51, nameAr: 'م.ب (3) لسنة 2011 مثلث فسفوري', nameEn: 'Ministerial order 3/2011 — reflective triangle' },
  { index: 50, excelRow: 52, nameAr: 'م.ب (3) لسنة 2024 منع التدخين داخل وسائط النقل', nameEn: 'Ministerial order 3/2024 — smoking in transport' },
  { index: 51, excelRow: 53, nameAr: 'م.ب (3) لسنة 2019 استخدام المركبات الخصوصي كأجرة', nameEn: 'Ministerial order 3/2019 — private vehicle used as taxi' },
  { index: 52, excelRow: 54, nameAr: 'م.ب (10) لسنة 2019 لا يجوز تحوير المركبة أو إبدال هيكلها أو شاصيها', nameEn: 'Ministerial order 10/2019 — no modification of chassis/body' },
  { index: 53, excelRow: 55, nameAr: 'م.ب (11) لسنة 2019 منع تركيب ونصب اللافتات الضوئية أو الصافرات', nameEn: 'Ministerial order 11/2019 — no light bars / sirens' },
  { index: 54, excelRow: 56, nameAr: 'م.ب (12) لسنة 2019 منع استخدام مركبة مصفحة أو مدرعة', nameEn: 'Ministerial order 12/2019 — no armored vehicles' },
  { index: 55, excelRow: 57, nameAr: 'مخالفة مقررات اللجنة العليا للصحة والسلامة والوطنية (حظر تجوال)', nameEn: 'Violation of Higher Health Committee resolutions (curfew)' },
  { index: 56, excelRow: 58, nameAr: 'مخالفة بيان رقم (5) لسنة 2020 (الزوجي الفردي)', nameEn: 'Statement 5/2020 violation (odd/even plates)' },
  { index: 57, excelRow: 59, nameAr: 'حجز مركبات الفحص المؤقت', nameEn: 'Temporary-inspection vehicle impound' },
  { index: 58, excelRow: 60, nameAr: 'م.ب رقم (1) لسنة 2012 قيادة الدراجات النارية من الساعة 6 مساءً لغاية 6 صباحاً. استقلال الدراجة النارية من قبل شخصين', nameEn: 'Order 1/2012 — night motorcycle driving / two-up riding' },
  { index: 59, excelRow: 61, nameAr: 'بيان رقم (4) يمنع وقوف المركبات على الأرصفة', nameEn: 'Statement 4 — no parking on sidewalks' },
] as const;

/** Internal-only row for محطة الأوزان المحورية (not one of the 59 violation types). */
export const AWZAN_AGGREGATE_VIOLATION = {
  index: 60,
  excelRow: 62,
  nameAr: 'إجمالي مخالفات الأوزان المحورية',
  nameEn: 'Axle weight station — total',
} as const;

export const AXLE_WEIGHT_SECTOR_SLUG = 'awzan';

/** Official sector names on the per-sector totals report (photo layout). */
export const SECTOR_REPORT_NAMES: Record<string, string> = {
  aysar: 'قاطع مرور الموصل الايسر',
  ayman: 'قاطع مرور الموصل الايمن',
  sharq: 'قاطع مرور شرق نينوى/طرق خارجية',
  gharb: 'قاطع مرور غرب نينوى/طرق خارجية',
  telafar: 'قاطع مرور تلعفر',
  sinjar: 'قاطع مرور سنجار',
  rabia: 'قاطع مرور ربيعة',
  qayyara: 'قاطع مرور القيارة',
  zammar: 'قاطع مرور زمار',
  hamdaniya: 'قاطع مرور الحمدانية',
  awzan: 'شعبة الاوزان المحورية',
};

export const SEED_SECTORS = [
  { slug: 'aysar', nameAr: 'الأيسر', nameEn: 'Al-Aysar (Left)', countCol: 'C', amountCol: 'D', sortOrder: 1 },
  { slug: 'ayman', nameAr: 'الأيمن', nameEn: 'Al-Ayman (Right)', countCol: 'E', amountCol: 'F', sortOrder: 2 },
  { slug: 'sharq', nameAr: 'شرق نينوى', nameEn: 'East Nineveh', countCol: 'G', amountCol: 'H', sortOrder: 3 },
  { slug: 'gharb', nameAr: 'غرب نينوى', nameEn: 'West Nineveh', countCol: 'I', amountCol: 'J', sortOrder: 4 },
  { slug: 'telafar', nameAr: 'تلعفر', nameEn: 'Tal Afar', countCol: 'K', amountCol: 'L', sortOrder: 5 },
  { slug: 'sinjar', nameAr: 'سنجار', nameEn: 'Sinjar', countCol: 'M', amountCol: 'N', sortOrder: 6 },
  { slug: 'rabia', nameAr: 'ربيعة', nameEn: 'Rabia', countCol: 'O', amountCol: 'P', sortOrder: 7 },
  { slug: 'qayyara', nameAr: 'القيارة', nameEn: 'Al-Qayyara', countCol: 'Q', amountCol: 'R', sortOrder: 8 },
  { slug: 'zammar', nameAr: 'زمار', nameEn: 'Zammar', countCol: 'S', amountCol: 'T', sortOrder: 9 },
  { slug: 'hamdaniya', nameAr: 'الحمدانية', nameEn: 'Al-Hamdaniya', countCol: 'U', amountCol: 'V', sortOrder: 10 },
  { slug: 'awzan', nameAr: 'الأوزان المحورية', nameEn: 'Axle Weights', countCol: 'W', amountCol: 'X', sortOrder: 11 },
] as const;

export const IMPOUND_COLUMNS = {
  vehicles: { col: 'Z', labelAr: 'حجز مركبات', labelEn: 'Vehicle impound' },
  bikes: { col: 'AA', labelAr: 'حجز دراجات', labelEn: 'Motorcycle impound' },
} as const;

export const MAIN_SHEET_NAME = '59مخالفة';

/** First/last columns on 59مخالفة that may hold counts, amounts, or template leftovers. */
export const MAIN_SHEET_DATA_COLUMN_START = 'C';
/** Last data column on official template (includes Y totals + AB amount sum). */
export const MAIN_SHEET_DATA_COLUMN_END = 'AB';
export const MAIN_SHEET_GRAND_COUNT_COL = 'Y';
export const MAIN_SHEET_GRAND_AMOUNT_COL = 'AB';
/** Official template total row (row 65 in code was wrong; template uses 62). */
export const MAIN_SHEET_TOTAL_ROW = 62;

/** Column header labels on 59مخالفة row 1 (match Assets workbook). */
export const SECTOR_MAIN_SHEET_HEADERS: Record<string, { count: string; amount: string }> = {
  aysar: { count: 'الايسر', amount: 'الايسر مبالغ' },
  ayman: { count: 'الايمن', amount: 'الأيمن مبالغ' },
  sharq: { count: 'شرق نينوى', amount: 'شرق نينوى مبالغ' },
  gharb: { count: 'غرب نينوى', amount: 'غرب نينوى مبالغ' },
  telafar: { count: 'تلعفر', amount: 'تلعفر مبالغ' },
  sinjar: { count: 'سنجار', amount: 'سنجار مبالغ' },
  rabia: { count: 'ربيعة', amount: 'ربيعة مبالغ' },
  qayyara: { count: 'القيارة', amount: 'القيارة مبالغ' },
  zammar: { count: 'زمار', amount: 'زمار مبالغ' },
  hamdaniya: { count: 'الحمدانية', amount: 'الحمدانية مبالغ' },
  awzan: { count: ' الاوزان  ', amount: ' الاوزان  مبالغ' },
};

/** All sector count/amount + impound columns from the official template layout. */
export function mainSheetTemplateColumns(): string[] {
  const cols = new Set<string>();
  for (const s of SEED_SECTORS) {
    cols.add(s.countCol);
    cols.add(s.amountCol);
  }
  cols.add(IMPOUND_COLUMNS.vehicles.col);
  cols.add(IMPOUND_COLUMNS.bikes.col);
  cols.add(MAIN_SHEET_GRAND_COUNT_COL);
  cols.add(MAIN_SHEET_GRAND_AMOUNT_COL);
  return [...cols];
}
