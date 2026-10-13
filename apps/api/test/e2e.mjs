// End-to-end checks against a running API and a seeded database. No mocks.
//
//   1. Apply the migrations and run `pnpm --filter @skolara/api prisma:seed`.
//   2. Start the API with TRUST_PROXY=1, so each request below can present its
//      own client address and the suite is not throttled as one client.
//   3. node apps/api/test/e2e.mjs            (API_URL overrides the address)
//
// It writes to the database it is pointed at. Never run it against production.
const API = process.env.API_URL ?? 'http://localhost:4000'; const PW = 'changeme123';
let n = 0; const fails = []; const run = Date.now().toString(36);
const call = async (method, path, { token, body, ip } = {}) => {
  const res = await fetch(API + path, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip ?? `10.${(n >> 8) & 255}.${n & 255}.${Math.floor(Math.random() * 250) + 1}`, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  n++; const data = await res.json().catch(() => null);
  return { status: res.status, data };
};
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + JSON.stringify(detail)?.slice(0, 300)}`); if (!ok) fails.push(name); };
const expect = async (name, promise, status, test) => { const r = await promise; check(name, r.status === status && (!test || test(r.data)), { status: r.status, data: r.data }); return r.data; };
const login = async (email, subdomain, password = PW) => (await call('POST', '/auth/login', { body: { email, password, subdomain } }));

// --- public
await expect('public school lookup returns name and colour only', call('GET', '/schools/public/demo'), 200, d => typeof d.name === 'string' && d.name.length > 0 && Object.keys(d).sort().join() === 'logoUrl,name,primaryColor,subdomain');
await expect('unknown school code is 404', call('GET', '/schools/public/nosuchschool'), 404);
await expect('malformed school code is 404', call('GET', "/schools/public/x'%20or%201=1--"), 404);
await expect('unauthenticated request is refused', call('GET', '/students'), 401);
await expect('forged token is refused', call('GET', '/students', { token: 'x.eyJzdWIiOiIxIiwicm9sZSI6IlNDSE9PTF9BRE1JTiJ9.y' }), 401);

// --- sign in
const admin = (await login('principal@demo.skolara.app', 'demo')).data; check('admin signs in', Boolean(admin?.accessToken), admin);
const teacher = (await login('teacher1@demo.skolara.app', 'demo')).data; check('teacher signs in', Boolean(teacher?.accessToken), teacher);
const parent = (await login('bilal.ali@example.com', 'demo')).data; check('parent signs in', Boolean(parent?.accessToken), parent);
const sup = (await login('admin@skolara.app', undefined)).data; check('platform admin signs in', Boolean(sup?.accessToken), sup);
check('wrong password is refused', (await login('principal@demo.skolara.app', 'demo', 'wrongpassword')).status === 401);
check('sql injection in email is refused by validation', (await login("' OR 1=1 --", 'demo')).status === 400);
const A = admin.accessToken, T = teacher.accessToken, P = parent.accessToken, SID = admin.user.schoolId;

// --- people and classes
const classes = await expect('admin lists classes', call('GET', '/classes', { token: A }), 200, d => d.length >= 2);
const newClass = await expect('admin creates a class', call('POST', '/classes', { token: A, body: { schoolId: SID, name: '9', section: `T${run}`, academicYear: '2026-2027', classTeacherId: null } }), 201, d => d.id);
await expect('duplicate class is a conflict', call('POST', '/classes', { token: A, body: { schoolId: SID, name: '9', section: `T${run}`, academicYear: '2026-2027', classTeacherId: null } }), 409);
const stu = await expect('admin admits a student', call('POST', '/students', { token: A, body: { schoolId: SID, email: `s${run}@test.pk`, password: 'temp-pass-123', firstName: 'Test', lastName: 'Student', admissionNumber: `E2E-${run}`, dateOfBirth: '2014-03-12', classId: newClass.id, parentUserIds: [] } }), 201, d => d.id);
await expect('admin cannot admit into another school id', call('POST', '/students', { token: A, body: { schoolId: '11111111-1111-4111-8111-111111111111', email: `x${run}@test.pk`, password: 'temp-pass-123', firstName: 'X', lastName: 'Y', admissionNumber: `X-${run}`, dateOfBirth: '2014-03-12', parentUserIds: [] } }), 403);
const par = await expect('admin invites a parent', call('POST', '/users', { token: A, body: { schoolId: SID, role: 'PARENT', email: `p${run}@test.pk`, password: 'temp-pass-123', firstName: 'Test', lastName: 'Parent' } }), 201, d => d.id);
await expect('admin links the parent to the student', call('POST', `/students/${stu.id}/parents`, { token: A, body: { parentUserId: par.id } }), 201);
const teachers = await expect('admin lists teachers', call('GET', '/teachers', { token: A }), 200, d => d.length >= 2);
const t1 = teachers.find(t => t.user.email === 'teacher1@demo.skolara.app');
await expect('admin assigns teacher 1 to the new class', call('POST', `/classes/${newClass.id}/teachers`, { token: A, body: { teacherUserId: t1.userId } }), 201, d => d.some(x => x.id === t1.userId));
await expect('admin sees the whole school roster', call('GET', '/students', { token: A }), 200, d => d.some(s => s.id === stu.id));
await expect('teacher loads the roster of an assigned class', call('GET', `/students?classId=${newClass.id}`, { token: T }), 200, d => d.length === 1);
await expect('teacher cannot load the whole school', call('GET', '/students', { token: T }), 403);
const T2 = (await login('teacher2@demo.skolara.app', 'demo')).data.accessToken;
await expect('unassigned teacher cannot load the roster', call('GET', `/students?classId=${newClass.id}`, { token: T2 }), 403);
await expect('parent cannot list students', call('GET', `/students?classId=${newClass.id}`, { token: P }), 403);
const NP = (await login(`p${run}@test.pk`, 'demo', 'temp-pass-123')).data.accessToken;
const NS = (await login(`s${run}@test.pk`, 'demo', 'temp-pass-123')).data.accessToken;
await expect('new parent sees exactly their linked child', call('GET', '/students/mine', { token: NP }), 200, d => d.length === 1 && d[0].id === stu.id);
await expect('student account sees only itself', call('GET', '/students/mine', { token: NS }), 200, d => d.length === 1 && d[0].id === stu.id);

// --- fees
const past = new Date(Date.now() - 5 * 864e5).toISOString();
await expect('bulk billing a class creates one invoice per student', call('POST', '/invoices/bulk', { token: A, body: { classId: newClass.id, term: `Fee ${run}`, amountDue: 6500.5, dueDate: past } }), 201, d => d.created === 1 && d.skipped === 0);
await expect('running it again bills nobody twice', call('POST', '/invoices/bulk', { token: A, body: { classId: newClass.id, term: `Fee ${run}`, amountDue: 6500.5, dueDate: past } }), 201, d => d.created === 0 && d.skipped === 1);
await expect('negative amount is refused', call('POST', '/invoices/bulk', { token: A, body: { classId: newClass.id, term: 'x', amountDue: -5, dueDate: past } }), 400);
await expect('teacher cannot bill', call('POST', '/invoices/bulk', { token: T, body: { term: 'x', amountDue: 5, dueDate: past } }), 403);
const list = await expect('invoice list filters by class with totals', call('GET', `/invoices?classId=${newClass.id}&status=OVERDUE`, { token: A }), 200, d => d.invoices.length === 1 && d.totals.overdue === 6500.5 && d.invoices[0].overdue === true);
await expect('bad status filter is refused', call('GET', '/invoices?status=DROP', { token: A }), 400);
await expect('defaulters include the student with a reachable parent', call('GET', '/invoices/defaulters', { token: A }), 200, d => d.some(x => x.studentId === stu.id && x.parentCount === 1 && x.overdueAmount === 6500.5));
await expect('fee reminder is sent to the family', call('POST', '/invoices/reminders', { token: A, body: { studentIds: [stu.id] } }), 200, d => d.reminded === 1);
await expect('the parent finds the reminder in their inbox', call('GET', '/notifications', { token: NP }), 200, d => d.unreadCount >= 1 && d.items.some(i => i.data?.type === 'FEE_REMINDER'));
const inv = list.invoices[0];
await expect('parent reads their own child\'s invoices', call('GET', `/invoices/student/${stu.id}`, { token: NP }), 200, d => d.length === 1);
await expect('another parent cannot read them', call('GET', `/invoices/student/${stu.id}`, { token: P }), 403);
await expect('payment with a javascript: screenshot is refused', call('POST', `/payments/student/${stu.id}`, { token: NP, body: { invoiceId: inv.id, amountClaimed: 6500.5, screenshotUrl: 'javascript:alert(1)' } }), 400);
await expect('another parent cannot pay for this child', call('POST', `/payments/student/${stu.id}`, { token: P, body: { invoiceId: inv.id, amountClaimed: 6500.5, screenshotUrl: 'https://files.example.com/r.png' } }), 403);
const pay = await expect('parent submits a payment', call('POST', `/payments/student/${stu.id}`, { token: NP, body: { invoiceId: inv.id, amountClaimed: 6500.5, screenshotUrl: 'https://files.example.com/r.png' } }), 201, d => d.status === 'PENDING_VERIFICATION');
await expect('it appears in the admin queue', call('GET', '/payments/queue?status=PENDING_VERIFICATION', { token: A }), 200, d => d.some(x => x.id === pay.id));
await expect('parent cannot verify their own payment', call('PATCH', `/payments/${pay.id}/review`, { token: NP, body: { status: 'VERIFIED' } }), 403);
await expect('admin verifies the payment', call('PATCH', `/payments/${pay.id}/review`, { token: A, body: { status: 'VERIFIED' } }), 200, d => d.status === 'VERIFIED');
await expect('the invoice is now paid', call('GET', `/invoices/student/${stu.id}`, { token: NP }), 200, d => d[0].status === 'PAID' && Number(d[0].amountPaid) === 6500.5);
await expect('verifying twice is refused', call('PATCH', `/payments/${pay.id}/review`, { token: A, body: { status: 'VERIFIED' } }), 400).then(async () => expect('amount paid is unchanged', call('GET', `/invoices/student/${stu.id}`, { token: NP }), 200, d => Number(d[0].amountPaid) === 6500.5));
await expect('the parent is told the payment was verified', call('GET', '/notifications', { token: NP }), 200, d => d.items.some(i => i.data?.type === 'PAYMENT'));

// --- attendance
const today = new Date().toISOString().slice(0, 10);
await expect('teacher marks the register', call('POST', '/attendance', { token: T, body: { classId: newClass.id, date: today, markedOffline: false, entries: [{ studentId: stu.id, status: 'ABSENT' }] } }), 201);
await expect('unassigned teacher cannot mark it', call('POST', '/attendance', { token: T2, body: { classId: newClass.id, date: today, markedOffline: false, entries: [{ studentId: stu.id, status: 'PRESENT' }] } }), 403);
await expect('marking again replaces rather than duplicates', call('POST', '/attendance', { token: T, body: { classId: newClass.id, date: today, markedOffline: false, entries: [{ studentId: stu.id, status: 'ABSENT' }] } }), 201).then(() => expect('one record for the day', call('GET', `/attendance/class/${newClass.id}?date=${today}`, { token: T }), 200, d => d.length === 1 && d[0].status === 'ABSENT'));
await expect('school day summary counts the class as marked', call('GET', `/attendance/school-day?date=${today}`, { token: A }), 200, d => d.classes.find(c => c.classId === newClass.id)?.marked === true);
await expect('parent sees the absence', call('GET', `/attendance/student/${stu.id}`, { token: NP }), 200, d => d[0]?.status === 'ABSENT');
await expect('parent is notified of the absence', call('GET', '/notifications', { token: NP }), 200, d => d.items.some(i => i.data?.type === 'ATTENDANCE'));
await expect('another parent cannot see it', call('GET', `/attendance/student/${stu.id}`, { token: P }), 403);

// --- exams and marks
const exam = await expect('teacher schedules an exam', call('POST', '/exams', { token: T, body: { classId: newClass.id, name: 'Midterm', term: `Term ${run}`, examType: 'Midterm', scheduledDate: today } }), 201, d => d.id);
const sheet = { classId: newClass.id, subject: 'Mathematics', term: `Term ${run}`, examType: 'Midterm', maxMarks: 50, entries: [{ studentId: stu.id, marksObtained: 41.5 }] };
await expect('teacher saves a mark sheet', call('POST', '/grades/bulk', { token: T, body: sheet }), 201, d => d.saved === 1);
await expect('marks above the maximum are refused', call('POST', '/grades/bulk', { token: T, body: { ...sheet, entries: [{ studentId: stu.id, marksObtained: 51 }] } }), 400);
await expect('unassigned teacher cannot save marks', call('POST', '/grades/bulk', { token: T2, body: sheet }), 403);
await expect('a student from another class is refused', call('POST', '/grades/bulk', { token: A, body: { ...sheet, classId: classes[0].id } }), 404);
await expect('saving again updates instead of duplicating', call('POST', '/grades/bulk', { token: T, body: { ...sheet, entries: [{ studentId: stu.id, marksObtained: 44 }] } }), 201).then(() => expect('parent sees the latest mark once', call('GET', `/grades/student/${stu.id}`, { token: NP }), 200, d => d.length === 1 && Number(d[0].marksObtained) === 44));
await expect('rank list shows the student', call('GET', `/exams/${exam.id}/rank-list`, { token: T }), 200, d => d.length === 1 && d[0].rank === 1 && d[0].percentage === 88);

// --- notices and inbox
await expect('admin publishes a notice to the class', call('POST', '/notices', { token: A, body: { title: `Trip ${run}`, body: 'Bring the slip by Wednesday.', audience: 'CLASS', classId: newClass.id } }), 201);
await expect('a notice with a 2000-character title is refused', call('POST', '/notices', { token: A, body: { title: 'x'.repeat(2000), body: 'b', audience: 'ALL' } }), 400);
await expect('teacher cannot publish notices', call('POST', '/notices', { token: T, body: { title: 't', body: 'b', audience: 'ALL' } }), 403);
await expect('the class parent sees the notice', call('GET', '/notices', { token: NP }), 200, d => d.some(x => x.title === `Trip ${run}`));
await expect('a parent in another class does not', call('GET', '/notices', { token: P }), 200, d => !d.some(x => x.title === `Trip ${run}`));
const box = await expect('the parent got a notification for it', call('GET', '/notifications', { token: NP }), 200, d => d.items.some(i => i.data?.type === 'NOTICE'));
await expect('another user cannot mark it read', call('POST', '/notifications/read', { token: P, body: { ids: [box.items[0].id] } }), 200, d => d.updated === 0);
await expect('marking all read clears the count', call('POST', '/notifications/read', { token: NP, body: {} }), 200, d => d.updated >= 3).then(() => expect('unread count is zero', call('GET', '/notifications/unread-count', { token: NP }), 200, d => d.unreadCount === 0));

// --- finance
const month = today.slice(0, 7);
await expect('teacher cannot see finance', call('GET', '/finance/overview', { token: T }), 403);
await expect('parent cannot see finance', call('GET', '/finance/expenses', { token: P }), 403);
const cat = await expect('admin adds a budget category', call('POST', '/finance/categories', { token: A, body: { name: `Events ${run}` } }), 201, d => d.id);
await expect('same name in another case is a conflict', call('POST', '/finance/categories', { token: A, body: { name: `events ${run}` } }), 409);
await expect('admin sets its budget', call('PUT', '/finance/budget', { token: A, body: { month, lines: [{ categoryId: cat.id, amount: 10000 }] } }), 200, d => d.updated === 1);
await expect('a budget for an unknown category is refused', call('PUT', '/finance/budget', { token: A, body: { month, lines: [{ categoryId: '11111111-1111-4111-8111-111111111111', amount: 1 }] } }), 404);
const e1 = await expect('an expense inside budget is approved at once', call('POST', '/finance/expenses', { token: A, body: { categoryId: cat.id, payee: 'Tent hire', amount: 6000, spentOn: `${month}-02` } }), 201, d => d.status === 'APPROVED');
const e2 = await expect('an expense over budget waits', call('POST', '/finance/expenses', { token: A, body: { categoryId: cat.id, payee: 'Caterer', amount: 7000.25, spentOn: `${month}-03`, billUrl: 'https://files.example.com/bill.pdf' } }), 201, d => d.status === 'PENDING');
await expect('a javascript: bill link is refused', call('POST', '/finance/expenses', { token: A, body: { categoryId: cat.id, payee: 'x', amount: 1, spentOn: `${month}-03`, billUrl: 'javascript:alert(1)' } }), 400);
await expect('an impossible date is refused', call('POST', '/finance/expenses', { token: A, body: { categoryId: cat.id, payee: 'x', amount: 1, spentOn: '2026-02-30' } }), 400);
await expect('admins are notified of the waiting expense', call('GET', '/notifications', { token: A }), 200, d => d.items.some(i => i.data?.type === 'EXPENSE'));
await expect('overview counts approved spending only', call('GET', `/finance/overview?month=${month}`, { token: A }), 200, d => { const c = d.categories.find(x => x.categoryId === cat.id); return c.budget === 10000 && c.spent === 6000 && c.pending === 7000.25; });
await expect('declining needs a reason', call('POST', `/finance/expenses/${e2.id}/review`, { token: A, body: { decision: 'DECLINED' } }), 400);
await expect('admin approves the waiting expense', call('POST', `/finance/expenses/${e2.id}/review`, { token: A, body: { decision: 'APPROVED' } }), 201, d => d.status === 'APPROVED');
await expect('a decided expense cannot be decided again', call('POST', `/finance/expenses/${e2.id}/review`, { token: A, body: { decision: 'DECLINED', note: 'no' } }), 409);
await expect('a decided expense cannot be deleted', call('DELETE', `/finance/expenses/${e1.id}`, { token: A }), 404);
await expect('overview now shows the category over budget with exact paisa', call('GET', `/finance/overview?month=${month}`, { token: A }), 200, d => { const c = d.categories.find(x => x.categoryId === cat.id); return c.spent === 13000.25 && c.pending === 0 && d.income >= 6500.5 && d.trend.length === 6; });
await expect('a bad month is refused', call('GET', '/finance/overview?month=2026-13', { token: A }), 400);

// --- tenant isolation with a second school
const code = `e2e-${run}`;
const reg = await expect('a second school registers', call('POST', '/schools/register', { body: { name: 'Second School', subdomain: code, plan: 'BASIC', adminFirstName: 'Other', adminLastName: 'Admin', adminEmail: `o${run}@other.pk`, adminPassword: 'other-pass-123' } }), 201, d => d.id);
await expect('it is invisible to the public lookup until approved', call('GET', `/schools/public/${code}`), 404);
check('its admin cannot sign in before approval', (await login(`o${run}@other.pk`, code, 'other-pass-123')).status !== 201 && true);
await expect('a school admin cannot approve schools', call('PATCH', `/schools/${reg.id}/approve`, { token: A }), 403);
await expect('the platform admin approves it', call('PATCH', `/schools/${reg.id}/approve`, { token: sup.accessToken }), 200);
await expect('now the public lookup finds it', call('GET', `/schools/public/${code}`), 200);
const O = (await login(`o${run}@other.pk`, code, 'other-pass-123')).data?.accessToken; check('its admin signs in', Boolean(O));
await expect('school 2 cannot read a school 1 student', call('GET', `/students/${stu.id}`, { token: O }), 404);
await expect('school 2 cannot read school 1 invoices', call('GET', `/invoices/student/${stu.id}`, { token: O }), 403);
await expect('school 2 sees none of school 1\'s students', call('GET', '/students', { token: O }), 200, d => d.length === 0);
await expect('school 2 sees none of school 1\'s invoices', call('GET', '/invoices', { token: O }), 200, d => d.invoices.length === 0);
await expect('school 2 cannot review a school 1 expense', call('POST', `/finance/expenses/${e1.id}/review`, { token: O, body: { decision: 'APPROVED' } }), 404);
await expect('school 2 cannot bill a school 1 class', call('POST', '/invoices/bulk', { token: O, body: { classId: newClass.id, term: 'x', amountDue: 5, dueDate: past } }), 404);
await expect('school 2 cannot mark a school 1 register', call('POST', '/attendance', { token: O, body: { classId: newClass.id, date: today, markedOffline: false, entries: [{ studentId: stu.id, status: 'PRESENT' }] } }), 404);
await expect('school 2 cannot remind school 1 families', call('POST', '/invoices/reminders', { token: O, body: { studentIds: [stu.id] } }), 200, d => d.reminded === 0);
await expect('school 2 finance starts empty with its own starter categories', call('GET', '/finance/overview', { token: O }), 200, d => d.spent === 0 && d.income === 0 && d.categories.length === 7);
await expect('the same email cannot sign in to the wrong school', login(`o${run}@other.pk`, 'demo', 'other-pass-123'), 401);

// --- accounts and sessions
await expect('admin cannot deactivate themself', call('PATCH', `/users/${admin.user.id}/active`, { token: A, body: { isActive: false } }), 400);
const np = (await login(`p${run}@test.pk`, 'demo', 'temp-pass-123')).data;
await expect('admin deactivates the test parent', call('PATCH', `/users/${par.id}/active`, { token: A, body: { isActive: false } }), 200);
await expect('their refresh token no longer works', call('POST', '/auth/refresh', { body: { refreshToken: np.refreshToken } }), 401);
check('they cannot sign in again', (await login(`p${run}@test.pk`, 'demo', 'temp-pass-123')).status === 401);
const r1 = await call('POST', '/auth/refresh', { body: { refreshToken: teacher.refreshToken } }); check('refresh rotates the token', r1.status === 201 || r1.status === 200, r1);
await expect('a used refresh token cannot be replayed', call('POST', '/auth/refresh', { body: { refreshToken: teacher.refreshToken } }), 401);

// --- lockout and rate limiting
let locked = false; for (let i = 0; i < 7; i++) { const r = await login(`s${run}@test.pk`, 'demo', 'bad-password-' + i); if (r.status === 429 || /locked|too many/i.test(JSON.stringify(r.data))) locked = true; }
check('repeated wrong passwords lock the account', locked);
check('the right password is refused while locked', (await login(`s${run}@test.pk`, 'demo', 'temp-pass-123')).status !== 201);
let throttled = false; for (let i = 0; i < 40; i++) { const r = await call('GET', '/schools/public/demo', { ip: '203.0.113.9' }); if (r.status === 429) { throttled = true; break; } }
check('one client hammering the public lookup is throttled', throttled);

console.log(`\n${n} requests, ${fails.length} failed`); if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
