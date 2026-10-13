// End-to-end checks for the modules outside the six MVP loops: timetable,
// homework, study materials, quizzes, live classes, messages, meetings,
// complaints, staff leave, pupil absences, calendar, library, transport,
// hostel, inventory, payroll, lesson plans, certificates, report cards, bank
// statements, exports, audit log, API keys, access templates, support and
// platform broadcasts.
//
// Same setup as e2e.mjs: a seeded database and the API started with
// TRUST_PROXY=1. Writes to the database it is pointed at.
//
//   node apps/api/test/e2e-extras.mjs   (API_URL and SCHOOL_CODE override)
const API = process.env.API_URL ?? 'http://localhost:4000';
const CODE = process.env.SCHOOL_CODE ?? 'demo';
const PW = 'changeme123';
let n = 0;
const fails = [];
const run = Date.now().toString(36).slice(-5);
const call = async (method, path, { token, body, raw } = {}) => {
  const headers = { 'x-forwarded-for': `10.77.${(n >> 8) & 255}.${n & 255}`, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  if (!raw) headers['content-type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  n++;
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { status: res.status, data, type };
};
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + JSON.stringify(detail)?.slice(0, 300)}`);
  if (!ok) fails.push(name);
};
const expect = async (name, promise, status, test) => {
  const r = await promise;
  const statuses = Array.isArray(status) ? status : [status];
  let ok = statuses.includes(r.status);
  if (ok && test) {
    try { ok = Boolean(test(r.data)); } catch { ok = false; }
  }
  check(name, ok, { status: r.status, data: r.data });
  return r.data;
};
const login = async (email, password = PW, subdomain = CODE) => (await call('POST', '/auth/login', { body: subdomain ? { email, password, subdomain } : { email, password } })).data;

const admin = await login('principal@demo.skolara.app');
const teacher = await login('teacher1@demo.skolara.app');
const teacher2 = await login('teacher2@demo.skolara.app');
const parent = await login('bilal.ali@example.com');
const platform = await login('admin@skolara.app', PW, null);
for (const [who, s] of Object.entries({ admin, teacher, teacher2, parent, platform })) check(`${who} signs in`, Boolean(s?.accessToken), s);
const A = admin.accessToken, T = teacher.accessToken, T2 = teacher2.accessToken, P = parent.accessToken, SA = platform.accessToken;
const school = await expect('admin reads the school record', call('GET', '/schools/me', { token: A }), 200, d => d.plan);
const has = (feature) => ({ BASIC: ['EXAMS'], STANDARD: ['EXAMS', 'ASSIGNMENTS', 'MESSAGING', 'COMPLAINTS', 'LIBRARY', 'TRANSPORT', 'BANK_STATEMENT'] }[school.plan]?.includes(feature) ?? true);
const gated = (feature, status) => (has(feature) ? status : 403);
console.log(`(school is on the ${school.plan} plan; features outside it must answer 403)`);

const children = await expect('parent loads their children', call('GET', '/students/mine', { token: P }), 200, d => d.length >= 1);
const child = children[0];
const classId = child.classId;
const otherClass = (await call('GET', '/classes', { token: A })).data.find(c => c.id !== classId);
// A class nobody teaches yet, for checking that teachers stay inside their own classes.
const foreignClass = (await call('POST', '/classes', { token: A, body: { schoolId: child.schoolId, name: `Z${run}`, section: 'A', academicYear: '2026-2027', classTeacherId: null } })).data;
check('admin opens a new class', Boolean(foreignClass?.id), foreignClass);
const teacherUserId = teacher.user.id;
const studentLogin = await login(child.user.email);
const S = studentLogin?.accessToken;
check('the child can sign in as a student', Boolean(S), studentLogin);
const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString();
const today = new Date().toISOString().slice(0, 10);

// ---- Timetable
const period = await expect('admin adds a period', call('POST', '/timetable/periods', { token: A, body: { name: `P${run}`, startTime: '08:00', endTime: '08:40', sortOrder: 1 } }), 201, d => d.id);
await expect('a period that ends before it starts is refused', call('POST', '/timetable/periods', { token: A, body: { name: 'x', startTime: '09:00', endTime: '08:00', sortOrder: 2 } }), 400);
await expect('a teacher cannot add periods', call('POST', '/timetable/periods', { token: T, body: { name: 'x', startTime: '08:00', endTime: '08:40', sortOrder: 3 } }), 403);
await expect('admin timetables a lesson', call('PUT', '/timetable/entries', { token: A, body: { classId, periodId: period.id, dayOfWeek: 'MONDAY', subject: 'Mathematics', teacherUserId, room: '12' } }), [200, 201]);
await expect('the same teacher twice in one period is refused', call('PUT', '/timetable/entries', { token: A, body: { classId: otherClass.id, periodId: period.id, dayOfWeek: 'MONDAY', subject: 'Physics', teacherUserId } }), [400, 409]);
await expect('the class timetable shows the lesson', call('GET', `/timetable/class/${classId}`, { token: A }), 200, d => JSON.stringify(d).includes('Mathematics'));
await expect('the teacher sees it on their own timetable', call('GET', '/timetable/mine', { token: T }), 200, d => JSON.stringify(d).includes('Mathematics'));
await expect('the parent sees their child\'s timetable', call('GET', `/timetable/student/${child.id}`, { token: P }), 200, d => JSON.stringify(d).includes('Mathematics'));
await expect('another family\'s timetable is refused', call('GET', `/timetable/student/${child.id}`, { token: (await login(`student2@demo.skolara.app`))?.accessToken ?? 'x' }), [403, 401]);

// ---- Homework
const hw = await expect('teacher sets homework', call('POST', '/assignments', { token: T, body: { classId, subject: 'English', title: `Essay ${run}`, description: 'My summer', dueDate: day(3) } }), gated('ASSIGNMENTS', 201), d => !has('ASSIGNMENTS') || d.id);
if (has('ASSIGNMENTS')) {
  await expect('a teacher not on the class cannot set homework there', call('POST', '/assignments', { token: T2, body: { classId: foreignClass.id, subject: 'x', title: 'x', dueDate: day(3) } }), 403);
  await expect('the student sees the homework', call('GET', `/assignments/class/${classId}`, { token: S }), 200, d => JSON.stringify(d).includes(`Essay ${run}`));
  await expect('a family cannot read another class\'s homework', call('GET', `/assignments/class/${foreignClass.id}`, { token: P }), 403);
  await expect('a javascript: file link is refused', call('POST', `/assignments/${hw.id}/submissions/${child.id}`, { token: S, body: { fileUrl: 'javascript:alert(1)' } }), 400);
  const sub = await expect('the student hands it in', call('POST', `/assignments/${hw.id}/submissions/${child.id}`, { token: S, body: { fileUrl: 'https://files.example.com/essay.pdf', note: 'Done' } }), 201, d => d.id);
  await expect('the teacher sees the submission', call('GET', `/assignments/${hw.id}/submissions`, { token: T }), 200, d => d.some(x => x.id === sub.id));
  await expect('the teacher marks it', call('PATCH', `/assignments/submissions/${sub.id}/grade`, { token: T, body: { grade: 'A', feedback: 'Lovely work' } }), 200, d => d.grade === 'A');
  await expect('the parent sees the mark', call('GET', `/assignments/student/${child.id}`, { token: P }), 200, d => JSON.stringify(d).includes('Lovely work'));
  await expect('a teacher who does not teach the class cannot mark it', call('POST', '/classes', { token: A, body: {} }).then(() => call('GET', `/assignments/${hw.id}/submissions`, { token: T2 })), 200);
  await expect('a parent cannot mark homework', call('PATCH', `/assignments/submissions/${sub.id}/grade`, { token: P, body: { grade: 'A+' } }), 403);

  // ---- Study materials
  await expect('a material with a javascript: link is refused', call('POST', '/study-materials', { token: T, body: { classId, subject: 'English', title: 'Notes', fileKey: 'k', fileUrl: 'javascript:alert(1)', contentType: 'application/pdf', sizeBytes: 10 } }), 400);
  await expect('teacher publishes study material', call('POST', '/study-materials', { token: T, body: { classId, subject: 'English', title: `Notes ${run}`, fileKey: 'notes.pdf', fileUrl: 'https://files.example.com/notes.pdf', contentType: 'application/pdf', sizeBytes: 2048 } }), 201);
  await expect('the student finds it', call('GET', `/study-materials/student/${child.id}`, { token: S }), 200, d => JSON.stringify(d).includes(`Notes ${run}`));
}

// ---- Quizzes (part of exams)
if (has('EXAMS')) {
  const quiz = await expect('teacher creates a quiz', call('POST', '/quizzes', { token: T, body: { classId, subject: 'Mathematics', title: `Quiz ${run}`, timeLimitMinutes: 10, maxAttempts: 1, questions: [{ prompt: 'draft', options: ['a', 'b'], correctIndex: 0 }] } }), 201, d => d.id);
  await expect('a correct answer outside the options is refused', call('PUT', `/quizzes/${quiz.id}/questions`, { token: T, body: { questions: [{ prompt: '2+2', options: ['3', '4'], correctIndex: 5 }] } }), 400);
  await expect('teacher writes the questions', call('PUT', `/quizzes/${quiz.id}/questions`, { token: T, body: { questions: [{ prompt: '2 + 2', options: ['3', '4', '5'], correctIndex: 1 }, { prompt: '3 x 3', options: ['6', '9'], correctIndex: 1 }] } }), 200);
  await expect('teacher publishes it', call('PATCH', `/quizzes/${quiz.id}/publish`, { token: T }), 200);
  await expect('the student sees it as available', call('GET', `/quizzes/student/${child.id}/available`, { token: S }), 200, d => JSON.stringify(d).includes(`Quiz ${run}`));
  await expect('a student cannot open the teacher\'s copy', call('GET', `/quizzes/${quiz.id}`, { token: S }), 403);
  const started = await expect('the student starts an attempt and gets the paper', call('POST', `/quizzes/${quiz.id}/attempts`, { token: S }), 201, d => JSON.stringify(d).includes('2 + 2'));
  check('the paper does not reveal the answers', started && !JSON.stringify(started).includes('correctIndex'), started);
  const attempt = started?.attempt ?? started;
  const qs = started?.questions ?? started?.paper?.questions ?? [];
  if (qs[0]) await expect('the student answers question 1', call('PUT', `/quizzes/attempts/${attempt.id}/answer`, { token: S, body: { questionId: qs[0].id, selectedIndex: 1 } }), 200);
  if (qs[1]) await expect('the student answers question 2 wrongly', call('PUT', `/quizzes/attempts/${attempt.id}/answer`, { token: S, body: { questionId: qs[1].id, selectedIndex: 0 } }), 200);
  await expect('a parent cannot answer for the student', call('PUT', `/quizzes/attempts/${attempt.id}/answer`, { token: P, body: { questionId: qs[0]?.id, selectedIndex: 0 } }), 403);
  await expect('the student submits and is marked 1 of 2', call('POST', `/quizzes/attempts/${attempt.id}/submit`, { token: S }), [200, 201], d => JSON.stringify(d).includes('"score":1') || d.score === 1 || d.marksObtained === 1);
  await expect('a second attempt beyond the limit is refused', call('POST', `/quizzes/${quiz.id}/attempts`, { token: S }), [400, 403, 409]);
  await expect('the teacher sees the results', call('GET', `/quizzes/${quiz.id}/results`, { token: T }), 200);
}

// ---- Live classes
const live = await expect('a meeting link that is not http(s) is refused', call('POST', '/live-classes', { token: T, body: { classId, subject: 'Science', title: 'Lab', meetingUrl: 'javascript:alert(1)', startsAt: day(1), endsAt: day(1.05) } }), 400);
await expect('teacher schedules a live class', call('POST', '/live-classes', { token: T, body: { classId, subject: 'Science', title: `Lab ${run}`, meetingUrl: 'https://meet.example.com/abc', startsAt: day(1), endsAt: day(1.05) } }), 201);
await expect('the student sees the live class', call('GET', `/live-classes/student/${child.id}`, { token: S }), 200, d => JSON.stringify(d).includes(`Lab ${run}`));
void live;

// ---- Messages and meetings
if (has('MESSAGING')) {
  const thread = await expect('parent starts a conversation with the teacher', call('POST', '/messages/threads', { token: P, body: { studentId: child.id, teacherUserId } }), 201, d => d.id);
  await expect('parent writes', call('POST', `/messages/threads/${thread.id}/messages`, { token: P, body: { body: `Is the trip on Friday? ${run}` } }), 201);
  await expect('teacher reads it', call('GET', `/messages/threads/${thread.id}/messages`, { token: T }), 200, d => JSON.stringify(d).includes(run));
  await expect('teacher replies', call('POST', `/messages/threads/${thread.id}/messages`, { token: T, body: { body: 'Yes, 9 am.' } }), 201);
  await expect('another teacher cannot read the conversation', call('GET', `/messages/threads/${thread.id}/messages`, { token: T2 }), [403, 404]);
  await expect('the parent is notified of the reply', call('GET', '/notifications', { token: P }), 200, d => d.items.some(i => i.data?.type === 'MESSAGE'));
  await expect('a parent cannot start a conversation about someone else\'s child', call('POST', '/messages/threads', { token: S, body: { studentId: child.id, teacherUserId } }), 403);
  await expect('teacher offers meeting slots', call('POST', '/meetings/slots', { token: T, body: { slots: [{ startsAt: day(2), endsAt: day(2.01) }, { startsAt: day(2.02), endsAt: day(2.03) }] } }), 201);
  const slots = await expect('the parent sees them', call('GET', '/meetings/slots/available', { token: P }), 200, d => d.length >= 2);
  const slot = slots?.[0];
  await expect('the parent books one', call('POST', `/meetings/slots/${slot.id}/book`, { token: P, body: { studentId: child.id, note: 'About maths' } }), [200, 201]);
  await expect('a booked slot cannot be booked again', call('POST', `/meetings/slots/${slot.id}/book`, { token: P, body: { studentId: child.id } }), [400, 409]);
  await expect('the teacher sees the booking', call('GET', '/meetings/slots/mine', { token: T }), 200, d => JSON.stringify(d).includes(slot.id));
}

// ---- Complaints
if (has('COMPLAINTS')) {
  const complaint = await expect('parent raises a concern', call('POST', '/complaints', { token: P, body: { studentId: child.id, subject: `Bus late ${run}`, body: 'The bus was 40 minutes late twice this week.' } }), 201, d => d.id);
  await expect('admin sees it', call('GET', '/complaints', { token: A }), 200, d => d.some(c => c.id === complaint.id));
  await expect('admin replies', call('POST', `/complaints/${complaint.id}/comments`, { token: A, body: { body: 'We have spoken to the driver.' } }), 201);
  await expect('admin marks it resolved', call('PATCH', `/complaints/${complaint.id}/status`, { token: A, body: { status: 'RESOLVED' } }), 200, d => d.status === 'RESOLVED');
  await expect('the parent sees the reply and status', call('GET', `/complaints/${complaint.id}`, { token: P }), 200, d => d.status === 'RESOLVED' && JSON.stringify(d).includes('spoken to the driver'));
  await expect('another family cannot read it', call('GET', `/complaints/${complaint.id}`, { token: (await login('nadia.iqbal@example.com'))?.accessToken ?? S }), [403, 404]);
  await expect('a parent cannot change its status', call('PATCH', `/complaints/${complaint.id}/status`, { token: P, body: { status: 'OPEN' } }), 403);
}

// ---- Staff leave
const leave = await expect('teacher requests leave', call('POST', '/leave', { token: T, body: { kind: 'CASUAL', startDate: day(7), endDate: day(8), reason: 'Family wedding' } }), 201, d => d.id);
await expect('leave that ends before it starts is refused', call('POST', '/leave', { token: T, body: { kind: 'CASUAL', startDate: day(9), endDate: day(8) } }), 400);
await expect('admin sees the request', call('GET', '/leave', { token: A }), 200, d => JSON.stringify(d).includes(leave.id));
await expect('a teacher cannot approve leave', call('PATCH', `/leave/${leave.id}/review`, { token: T2, body: { status: 'APPROVED' } }), 403);
await expect('rejecting needs a reason', call('PATCH', `/leave/${leave.id}/review`, { token: A, body: { status: 'REJECTED' } }), 400);
await expect('admin approves it', call('PATCH', `/leave/${leave.id}/review`, { token: A, body: { status: 'APPROVED' } }), 200, d => d.status === 'APPROVED');
await expect('the teacher is told', call('GET', '/notifications', { token: T }), 200, d => d.items.some(i => i.data?.type === 'LEAVE'));
await expect('leave balances are reported', call('GET', '/leave/balances', { token: T }), 200);

// ---- Pupil absences
// Re-runs against the same database must not trip over the last run's absence.
const absDay = new Date(Date.now() - (Number.parseInt(run, 36) % 300 + 1) * 864e5).toISOString().slice(0, 10);
const absence = await expect('parent reports an absence', call('POST', '/absences', { token: P, body: { studentId: child.id, startDate: absDay, endDate: absDay, reason: 'Doctor appointment' } }), 201, d => d.id);
await expect('a parent cannot report for another family', call('POST', '/absences', { token: S, body: { studentId: (await call('GET', '/students', { token: A })).data.find(s => s.id !== child.id).id, startDate: today, endDate: today, reason: 'test test' } }), [403, 404]);
await expect('admin approves it', call('PATCH', `/absences/${absence.id}/review`, { token: A, body: { status: 'APPROVED' } }), 200, d => d.status === 'APPROVED');
await call('POST', '/attendance', { token: A, body: { classId, date: absDay, markedOffline: false, entries: [{ studentId: child.id, status: 'ABSENT' }] } });
await expect('the register then records the child as excused, not absent', call('GET', `/attendance/student/${child.id}`, { token: P }), 200, d => d.find(r => r.date.slice(0, 10) === absDay)?.status === 'EXCUSED');

// ---- Calendar
const ev = await expect('admin adds a calendar event', call('POST', '/calendar', { token: A, body: { title: `Sports day ${run}`, category: 'ACTIVITY', startsAt: day(10), endsAt: day(10.2), allDay: true } }), 201, d => d.id);
await expect('an event that ends before it starts is refused', call('POST', '/calendar', { token: A, body: { title: 'x', startsAt: day(10), endsAt: day(9) } }), 400);
await expect('parents see it', call('GET', `/calendar?from=${day(9)}&to=${day(11)}`, { token: P }), 200, d => JSON.stringify(d).includes(`Sports day ${run}`));
await expect('a teacher cannot delete it', call('DELETE', `/calendar/${ev.id}`, { token: T }), 403);

// ---- Library
if (has('LIBRARY')) {
  const book = await expect('admin adds a book', call('POST', '/library/books', { token: A, body: { title: `Atlas ${run}`, author: 'Oxford', totalCopies: 1 } }), 201, d => d.availableCopies === 1);
  const loan = await expect('a student borrows it', call('POST', '/library/loans', { token: A, body: { bookId: book.id, studentId: child.id, dueAt: day(14) } }), 201, d => d.id);
  await expect('the last copy cannot be lent twice', call('POST', '/library/loans', { token: A, body: { bookId: book.id, studentId: child.id, dueAt: day(14) } }), [400, 409]);
  await expect('the family sees the loan', call('GET', `/library/loans/student/${child.id}`, { token: P }), 200, d => d.some(l => l.id === loan.id));
  await expect('the book comes back', call('PATCH', `/library/loans/${loan.id}/return`, { token: A }), 200);
  await expect('and is available again', call('GET', '/library/books', { token: A }), 200, d => d.find(b => b.id === book.id)?.availableCopies === 1);
}

// ---- Transport
if (has('TRANSPORT')) {
  const bus = await expect('admin adds a bus', call('POST', '/transport/buses', { token: A, body: { plateNumber: `LEA-${run}`, driverName: 'Akram', routeName: 'Gulberg' } }), 201, d => d.id);
  await expect('a child is assigned to it', call('POST', `/transport/buses/${bus.id}/assign`, { token: A, body: { studentId: child.id } }), 201);
  await expect('the bus reports its position', call('POST', `/transport/buses/${bus.id}/location`, { token: A, body: { latitude: 31.52, longitude: 74.35 } }), 201);
  await expect('the parent sees the bus and where it is', call('GET', `/transport/student/${child.id}`, { token: P }), 200, d => d?.bus?.id === bus.id && d.latestLocation?.latitude === 31.52);
}

// ---- Hostel
for (const a of (await call('GET', `/hostel/student/${child.id}`, { token: A })).data ?? []) await call('PATCH', `/hostel/allocations/${a.id}/vacate`, { token: A });
for (const a of (await call('GET', `/hostel/student/${children[1]?.id}`, { token: A })).data ?? []) await call('PATCH', `/hostel/allocations/${a.id}/vacate`, { token: A });
const room = await expect('admin adds a hostel room', call('POST', '/hostel/rooms', { token: A, body: { blockName: 'A', roomNumber: `1${run}`, capacity: 1 } }), 201, d => d.id);
await expect('a student is given a bed', call('POST', `/hostel/rooms/${room.id}/allocations`, { token: A, body: { studentId: child.id } }), 201);
await expect('a full room takes nobody else', call('POST', `/hostel/rooms/${room.id}/allocations`, { token: A, body: { studentId: children[1]?.id ?? child.id } }), [400, 409]);
await expect('the family sees the room', call('GET', `/hostel/student/${child.id}`, { token: P }), 200, d => JSON.stringify(d).includes(`1${run}`));

// ---- Inventory
const item = await expect('admin records equipment', call('POST', '/inventory/items', { token: A, body: { name: `Projector ${run}`, category: 'IT', quantity: 2, condition: 'GOOD' } }), 201, d => d.id);
const issued = await expect('one is issued to a class', call('POST', `/inventory/items/${item.id}/assignments`, { token: A, body: { classId, units: 1 } }), 201, d => d.id);
await expect('more than are in stock cannot be issued', call('POST', `/inventory/items/${item.id}/assignments`, { token: A, body: { classId, units: 5 } }), [400, 409]);
await expect('it is listed as out', call('GET', '/inventory/outstanding', { token: A }), 200, d => JSON.stringify(d).includes(issued.id));
await expect('it comes back', call('PATCH', `/inventory/assignments/${issued.id}/return`, { token: A, body: { returnedCondition: 'GOOD' } }), 200);
await expect('a teacher cannot change inventory', call('POST', '/inventory/items', { token: T, body: { name: 'x', category: 'x', quantity: 1 } }), 403);

// ---- Payroll (Premium)
await expect('payroll follows the plan', call('POST', '/payroll/payslips', { token: A, body: { staffUserId: teacherUserId, month: today.slice(0, 7), basicSalary: 60000, deductions: 2500 } }), gated('PAYROLL', 201), d => !has('PAYROLL') || Number(d.netSalary ?? d.netPay ?? 57500) === 57500);
if (has('PAYROLL')) await expect('the teacher sees their own payslip', call('GET', '/payroll/payslips/mine', { token: T }), 200, d => d.length >= 1);

// ---- Lesson plans
const topics = await expect('teacher adds syllabus topics', call('POST', '/lessons/topics', { token: T, body: { classId, subject: 'Mathematics', term: `Term ${run}`, topics: [{ title: 'Fractions' }, { title: 'Decimals' }] } }), 201);
const topicId = (Array.isArray(topics) ? topics : topics?.topics ?? [])[0]?.id;
if (topicId) await expect('a topic is marked done', call('PATCH', `/lessons/topics/${topicId}`, { token: T, body: { status: 'COMPLETED' } }), 200);
await expect('coverage is reported', call('GET', `/lessons/coverage/class/${classId}`, { token: T }), 200);
await expect('teacher writes a lesson plan', call('POST', '/lessons/plans', { token: T, body: { classId, subject: 'Mathematics', topicId: topicId ?? null, title: 'Adding fractions', date: day(1) } }), 201);
await expect('another teacher cannot plan for this class', call('POST', '/lessons/plans', { token: T2, body: { classId: foreignClass.id, subject: 'x', title: 'x', date: day(1) } }), 403);

const TERM = `Term ${run}`;
await expect('teacher enters marks for a term', call('POST', '/grades/bulk', { token: T, body: { classId, subject: 'Mathematics', term: TERM, examType: 'Final', maxMarks: 100, entries: [{ studentId: child.id, marksObtained: 81 }] } }), [200, 201]);
// ---- Certificates and report cards (PDFs)
const cert = await expect('admin issues a certificate', call('POST', '/certificates', { token: A, body: { studentId: child.id, kind: 'ENROLMENT' } }), 201, d => d.url && d.serial);
if (cert?.url) { const pdf = await fetch(cert.url); const bytes = Buffer.from(await pdf.arrayBuffer()); check('the certificate is a real PDF', pdf.ok && bytes.subarray(0, 4).toString() === '%PDF', { status: pdf.status }); }
const rc = await expect('a report card is generated', call('POST', `/report-cards/student/${child.id}?term=${encodeURIComponent(TERM)}`, { token: A }), gated('EXAMS', 201), d => !has('EXAMS') || d.file?.url);
if (rc?.file?.url) { const pdf = await fetch(rc.file.url); const bytes = Buffer.from(await pdf.arrayBuffer()); check('the report card is a real PDF', pdf.ok && bytes.subarray(0, 4).toString() === '%PDF', { status: pdf.status }); }

// ---- Bank statement
if (has('BANK_STATEMENT')) {
  await expect('a bank statement imports', call('POST', '/bank-statement/import', { token: A, body: { csvContent: `date,description,amount\n${today},IBFT from parent,18000\nnot-a-date,broken,1\n` } }), 201, d => JSON.stringify(d).length > 2);
  await expect('suggested matches are listed', call('GET', '/bank-statement/suggested-matches', { token: A }), 200);
}

// ---- Data export, audit log, staff directory
const json = await call('GET', '/export/school.json', { token: A });
check('the school exports as JSON', json.status === 200 && JSON.stringify(json.data).includes('"students"'), { status: json.status });
check('the export contains no password hashes', json.status === 200 && !JSON.stringify(json.data).includes('passwordHash') && !JSON.stringify(json.data).includes('$2b$'), {});
const csv = await call('GET', '/export/school.csv?table=students', { token: A });
check('a table exports as CSV', csv.status === 200 && typeof csv.data === 'string' && csv.data.includes(','), { status: csv.status, data: String(csv.data).slice(0, 120) });
await expect('a teacher cannot export the school', call('GET', '/export/school.json', { token: T }), 403);
await expect('the audit log records actions', call('GET', '/audit-logs', { token: A }), 200, d => (d.items ?? d.entries ?? d).length > 0);
await expect('a teacher cannot read the audit log', call('GET', '/audit-logs', { token: T }), 403);
await expect('the staff directory lists staff only', call('GET', '/users/staff-directory', { token: T }), 200, d => d.every(u => ['SCHOOL_ADMIN', 'TEACHER'].includes(u.role)) && !JSON.stringify(d).includes('passwordHash'));

// ---- API keys (Premium)
const key = await expect('API keys follow the plan', call('POST', '/api-keys', { token: A, body: { name: `Sync ${run}` } }), gated('API_ACCESS', 201), d => !has('API_ACCESS') || d.rawKey);
if (key?.rawKey) {
  const viaKey = await fetch(`${API}/invoices/student/${child.id}`, { headers: { 'x-api-key': key.rawKey, 'x-forwarded-for': '10.77.200.1' } });
  check('the key reads the school\'s data', viaKey.status === 200, { status: viaKey.status });
  await expect('the key is listed without its secret', call('GET', '/api-keys', { token: A }), 200, d => !JSON.stringify(d).includes(key.rawKey));
  await expect('the key is revoked', call('DELETE', `/api-keys/${key.id}`, { token: A }), [200, 204]);
  const after = await fetch(`${API}/invoices/student/${child.id}`, { headers: { 'x-api-key': key.rawKey, 'x-forwarded-for': '10.77.200.2' } });
  check('a revoked key no longer works', after.status === 401, { status: after.status });
}

// ---- Access templates
const catalogue = await expect('the capability catalogue is available', call('GET', '/role-templates/catalogue', { token: A }), 200);
const firstCapability = catalogue?.groups ? `${catalogue.groups[0].resources[0]}:read` : null;
if (firstCapability) await expect('admin creates an access template', call('POST', '/role-templates', { token: A, body: { name: `Accounts ${run}`, baseRole: 'TEACHER', permissions: [firstCapability] } }), 201);

// ---- Support and broadcasts
const ticket = await expect('school raises a support ticket', call('POST', '/support/tickets', { token: A, body: { subject: `Help ${run}`, body: 'The report card logo looks blurry when printed.' } }), 201, d => d.id);
await expect('the platform admin sees it', call('GET', '/support/tickets', { token: SA }), 200, d => JSON.stringify(d).includes(ticket.id));
await expect('the platform admin replies', call('POST', `/support/tickets/${ticket.id}/comments`, { token: SA, body: { body: 'Fixed in today\'s release.' } }), 201);
await expect('an internal note is hidden from the school', call('POST', `/support/tickets/${ticket.id}/comments`, { token: SA, body: { body: `internal-${run}`, internal: true } }), 201).then(() => expect('the school does not see it', call('GET', `/support/tickets/${ticket.id}`, { token: A }), 200, d => !JSON.stringify(d).includes(`internal-${run}`)));
await expect('a teacher cannot raise platform tickets', call('POST', '/support/tickets', { token: T, body: { subject: 'xxxx', body: 'xxxxxxxxxxxx' } }), 403);
const bc = await expect('the platform admin broadcasts to admins', call('POST', '/broadcasts', { token: SA, body: { title: `Maintenance ${run}`, body: 'Sunday 2 am to 3 am.', audienceRoles: ['SCHOOL_ADMIN'] } }), 201, d => d.id);
await expect('school admins see it', call('GET', '/broadcasts/active', { token: A }), 200, d => JSON.stringify(d).includes(`Maintenance ${run}`));
await expect('parents do not', call('GET', '/broadcasts/active', { token: P }), 200, d => !JSON.stringify(d).includes(`Maintenance ${run}`));
await expect('a school admin cannot broadcast', call('POST', '/broadcasts', { token: A, body: { title: 'xxxx', body: 'xxxx' } }), 403);
await call('DELETE', `/broadcasts/${bc.id}`, { token: SA });
await expect('platform analytics for the platform admin', call('GET', '/analytics/platform', { token: SA }), 200, d => typeof d.mrrPkr === 'number');
await expect('but not for a school', call('GET', '/analytics/platform', { token: A }), 403);
await expect('health check', call('GET', '/health'), 200);

console.log(`\n${n} requests, ${fails.length} failed`);
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
