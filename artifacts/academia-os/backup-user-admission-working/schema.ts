import { randomUUID } from 'crypto';
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const id = () => text('id').primaryKey().$defaultFn(() => randomUUID());
const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const schools = pgTable('schools', {
  id: id(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  logoUrl: text('logo_url'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  currency: text('currency').notNull().default('GHS'),
  timezone: text('timezone').notNull().default('Africa/Accra'),
  smsSenderName: text('sms_sender_name'),
  proprietorApprovalRequired: boolean('proprietor_approval_required').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: created(),
  updatedAt: updated()
});

export const users = pgTable('users', {
  id: id(),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  photoUrl: text('photo_url'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  temporaryPasswordExpiresAt: timestamp('temporary_password_expires_at', { withTimezone: true }),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated()
}, (t) => [index('users_school_role_idx').on(t.schoolId, t.role, t.status)]);

export const sessions = pgTable('sessions', {
  id: id(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: created()
}, (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expiry_idx').on(t.expiresAt)]);

export const loginAttempts = pgTable('login_attempts', {
  id: id(), schoolId: text('school_id').references(() => schools.id, { onDelete: 'set null' }),
  username: text('username').notNull(), userId: text('user_id'), success: boolean('success').notNull(),
  ipAddress: text('ip_address'), userAgent: text('user_agent'), createdAt: created()
}, (t) => [
  index('login_attempts_username_idx').on(t.username, t.createdAt),
  index('login_attempts_ip_idx').on(t.ipAddress, t.createdAt)
]);

export const academicYears = pgTable('academic_years', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), startsOn: timestamp('starts_on', { withTimezone: true }).notNull(),
  endsOn: timestamp('ends_on', { withTimezone: true }).notNull(), isCurrent: boolean('is_current').notNull().default(false),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('academic_year_school_name_uq').on(t.schoolId, t.name)]);

export const terms = pgTable('terms', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), startsOn: timestamp('starts_on', { withTimezone: true }).notNull(),
  endsOn: timestamp('ends_on', { withTimezone: true }).notNull(), reopeningDate: timestamp('reopening_date', { withTimezone: true }),
  isCurrent: boolean('is_current').notNull().default(false), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('term_year_name_uq').on(t.academicYearId, t.name)]);

export const classes = pgTable('classes', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), stream: text('stream').notNull().default(''), level: text('level'),
  classTeacherId: text('class_teacher_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('class_school_name_stream_uq').on(t.schoolId, t.name, t.stream)]);

export const subjects = pgTable('subjects', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), code: text('code').notNull(), isActive: boolean('is_active').notNull().default(true),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('subject_school_code_uq').on(t.schoolId, t.code)]);

export const teacherAssignments = pgTable('teacher_assignments', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  createdAt: created()
}, (t) => [uniqueIndex('teacher_assignment_uq').on(t.teacherId, t.classId, t.subjectId)]);

export const guardians = pgTable('guardians', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').unique().references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(), phone: text('phone').notNull(), email: text('email'), address: text('address'),
  createdAt: created(), updatedAt: updated()
}, (t) => [index('guardian_school_phone_idx').on(t.schoolId, t.phone)]);

export const learners = pgTable('learners', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').unique().references(() => users.id, { onDelete: 'set null' }),
  classId: text('class_id').references(() => classes.id, { onDelete: 'set null' }), admissionNo: text('admission_no').notNull(),
  firstName: text('first_name').notNull(), lastName: text('last_name').notNull(), photoUrl: text('photo_url'),
  dateOfBirth: timestamp('date_of_birth', { withTimezone: true }), gender: text('gender'), admissionDate: timestamp('admission_date', { withTimezone: true }).notNull().defaultNow(),
  address: text('address'), medicalNotes: text('medical_notes'), emergencyContact: text('emergency_contact'),
  transportRouteText: text('transport_route_text'), paymentPlan: text('payment_plan').notNull().default('TERM'),
  badgeCode: text('badge_code').notNull().unique(), status: text('status').notNull().default('ACTIVE'),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('learner_school_admission_uq').on(t.schoolId, t.admissionNo), index('learner_school_class_idx').on(t.schoolId, t.classId, t.status)]);

export const learnerGuardians = pgTable('learner_guardians', {
  learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  guardianId: text('guardian_id').notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  relationship: text('relationship').notNull(), isPrimary: boolean('is_primary').notNull().default(false),
  canPickUp: boolean('can_pick_up').notNull().default(true), createdAt: created()
}, (t) => [uniqueIndex('learner_guardian_uq').on(t.learnerId, t.guardianId)]);

export const attendanceRecords = pgTable('attendance_records', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(), status: text('status').notNull(),
  checkInTime: timestamp('check_in_time', { withTimezone: true }), checkOutTime: timestamp('check_out_time', { withTimezone: true }),
  reason: text('reason'), parentNotificationAt: timestamp('parent_notification_at', { withTimezone: true }),
  recordedById: text('recorded_by_id').notNull().references(() => users.id), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('attendance_learner_date_uq').on(t.learnerId, t.date), index('attendance_school_date_idx').on(t.schoolId, t.date, t.status)]);

export const attendanceScans = pgTable('attendance_scans', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  learnerId: text('learner_id').references(() => learners.id, { onDelete: 'set null' }), recordedById: text('recorded_by_id').notNull().references(() => users.id),
  badgeCode: text('badge_code').notNull(), action: text('action').notNull(), location: text('location'), device: text('device'),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(), wasDuplicate: boolean('was_duplicate').notNull().default(false)
}, (t) => [index('scan_badge_time_idx').on(t.badgeCode, t.scannedAt)]);

export const feeCategories = pgTable('fee_categories', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), code: text('code').notNull(), isCanteen: boolean('is_canteen').notNull().default(false),
  isDailyTuition: boolean('is_daily_tuition').notNull().default(false), isActive: boolean('is_active').notNull().default(true),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('fee_category_school_code_uq').on(t.schoolId, t.code)]);

export const feeStructures = pgTable('fee_structures', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => feeCategories.id, { onDelete: 'cascade' }),
  classId: text('class_id').references(() => classes.id, { onDelete: 'cascade' }), paymentPlan: text('payment_plan').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(), chargeOnAbsent: boolean('charge_on_absent').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('fee_structure_uq').on(t.schoolId, t.categoryId, t.classId, t.paymentPlan)]);

export const feeCharges = pgTable('fee_charges', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => feeCategories.id, { onDelete: 'set null' }), description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(), paidAmount: numeric('paid_amount', { precision: 12, scale: 2, mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('OPEN'), dueDate: timestamp('due_date', { withTimezone: true }), attendanceDate: timestamp('attendance_date', { withTimezone: true }),
  isAutomatic: boolean('is_automatic').notNull().default(false), createdAt: created(), updatedAt: updated()
}, (t) => [index('fee_charge_learner_status_idx').on(t.schoolId, t.learnerId, t.status)]);

export const payments = pgTable('payments', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(), method: text('method').notNull(), reference: text('reference'),
  receiptNo: text('receipt_no').notNull().unique(), notes: text('notes'), recordedById: text('recorded_by_id').notNull().references(() => users.id), createdAt: created()
}, (t) => [index('payments_school_learner_idx').on(t.schoolId, t.learnerId, t.createdAt)]);

export const paymentAllocations = pgTable('payment_allocations', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  chargeId: text('charge_id').notNull().references(() => feeCharges.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(), createdAt: created()
}, (t) => [uniqueIndex('payment_charge_allocation_uq').on(t.paymentId, t.chargeId)]);

export const financialAdjustments = pgTable('financial_adjustments', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), learnerId: text('learner_id').notNull().references(() => learners.id),
  chargeId: text('charge_id').references(() => feeCharges.id, { onDelete: 'set null' }), paymentId: text('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  type: text('type').notNull(), amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(), reason: text('reason').notNull(),
  requestedById: text('requested_by_id').notNull().references(() => users.id), approvedById: text('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }), createdAt: created()
});

export const academicSubmissions = pgTable('academic_submissions', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => users.id), reviewerId: text('reviewer_id').references(() => users.id), proprietorId: text('proprietor_id').references(() => users.id),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id), termId: text('term_id').notNull().references(() => terms.id),
  classId: text('class_id').notNull().references(() => classes.id), subjectId: text('subject_id').notNull().references(() => subjects.id),
  classworkScore: numeric('classwork_score', { precision: 5, scale: 2, mode: 'number' }).notNull(), homeworkScore: numeric('homework_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
  testScore: numeric('test_score', { precision: 5, scale: 2, mode: 'number' }).notNull(), examScore: numeric('exam_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
  totalScore: numeric('total_score', { precision: 5, scale: 2, mode: 'number' }).notNull(), grade: text('grade').notNull(), position: integer('position'),
  teacherRemark: text('teacher_remark'), conductRemark: text('conduct_remark'), classTeacherRemark: text('class_teacher_remark'),
  status: text('status').notNull().default('DRAFT'), rejectionReason: text('rejection_reason'), submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }), approvedAt: timestamp('approved_at', { withTimezone: true }), lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('academic_result_uq').on(t.learnerId, t.academicYearId, t.termId, t.subjectId), index('academic_status_idx').on(t.schoolId, t.status)]);

export const approvalEvents = pgTable('approval_events', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submissionId: text('submission_id').notNull().references(() => academicSubmissions.id, { onDelete: 'cascade' }), actorId: text('actor_id').notNull().references(() => users.id),
  decision: text('decision').notNull(), reason: text('reason'), oldValue: jsonb('old_value'), newValue: jsonb('new_value'), createdAt: created()
}, (t) => [index('approval_submission_idx').on(t.submissionId, t.createdAt)]);

export const homework = pgTable('homework', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), teacherId: text('teacher_id').notNull().references(() => users.id),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id), termId: text('term_id').notNull().references(() => terms.id), classId: text('class_id').notNull().references(() => classes.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id), title: text('title').notNull(), instructions: text('instructions').notNull(),
  assignedOn: timestamp('assigned_on', { withTimezone: true }).notNull().defaultNow(), dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  maximumScore: numeric('maximum_score', { precision: 5, scale: 2, mode: 'number' }), attachmentUrl: text('attachment_url'), status: text('status').notNull().default('PUBLISHED'),
  createdAt: created(), updatedAt: updated()
}, (t) => [index('homework_class_due_idx').on(t.schoolId, t.classId, t.dueAt)]);

export const terminalReports = pgTable('terminal_reports', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id), termId: text('term_id').notNull().references(() => terms.id), classId: text('class_id').notNull().references(() => classes.id),
  snapshot: jsonb('snapshot').notNull(), verificationCode: text('verification_code').notNull().unique(), status: text('status').notNull().default('DRAFT'),
  approvedById: text('approved_by_id').references(() => users.id), approvedAt: timestamp('approved_at', { withTimezone: true }), publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('terminal_report_uq').on(t.learnerId, t.academicYearId, t.termId)]);


export const staffAttendanceRecords = pgTable('staff_attendance_records', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(), status: text('status').notNull().default('PRESENT'),
  arrivalTime: timestamp('arrival_time', { withTimezone: true }), departureTime: timestamp('departure_time', { withTimezone: true }),
  lateArrival: boolean('late_arrival').notNull().default(false), earlyDeparture: boolean('early_departure').notNull().default(false),
  reason: text('reason'), recordedById: text('recorded_by_id').notNull().references(() => users.id), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('staff_attendance_staff_date_uq').on(t.staffId, t.date), index('staff_attendance_school_date_idx').on(t.schoolId, t.date, t.status)]);

export const staffMovementRequests = pgTable('staff_movement_requests', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(), requestedDepartureAt: timestamp('requested_departure_at', { withTimezone: true }).notNull(),
  expectedReturnAt: timestamp('expected_return_at', { withTimezone: true }), actualDepartureAt: timestamp('actual_departure_at', { withTimezone: true }),
  actualReturnAt: timestamp('actual_return_at', { withTimezone: true }), status: text('status').notNull().default('PENDING'),
  approvedById: text('approved_by_id').references(() => users.id), decisionReason: text('decision_reason'), decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: created(), updatedAt: updated()
}, (t) => [index('staff_movement_school_status_idx').on(t.schoolId, t.status, t.createdAt)]);

export const vehicles = pgTable('vehicles', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), name: text('name').notNull(), registrationNo: text('registration_no').notNull(),
  capacity: integer('capacity').notNull(), driverName: text('driver_name'), driverPhone: text('driver_phone'), attendantName: text('attendant_name'), isActive: boolean('is_active').notNull().default(true),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('vehicle_registration_uq').on(t.schoolId, t.registrationNo)]);

export const transportRoutes = pgTable('transport_routes', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  name: text('name').notNull(), morningStartTime: text('morning_start_time'), afternoonStartTime: text('afternoon_start_time'), isActive: boolean('is_active').notNull().default(true),
  createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('transport_route_name_uq').on(t.schoolId, t.name)]);

export const transportStops = pgTable('transport_stops', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), routeId: text('route_id').notNull().references(() => transportRoutes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), sequence: integer('sequence').notNull(), pickupTime: text('pickup_time'), dropOffTime: text('drop_off_time'), createdAt: created()
}, (t) => [uniqueIndex('transport_stop_sequence_uq').on(t.routeId, t.sequence)]);

export const transportAssignments = pgTable('transport_assignments', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  routeId: text('route_id').notNull().references(() => transportRoutes.id, { onDelete: 'cascade' }), stopId: text('stop_id').references(() => transportStops.id, { onDelete: 'set null' }),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }), isActive: boolean('is_active').notNull().default(true), createdAt: created(), updatedAt: updated()
}, (t) => [uniqueIndex('transport_assignment_uq').on(t.learnerId, t.routeId)]);

export const transportScans = pgTable('transport_scans', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), learnerId: text('learner_id').notNull().references(() => learners.id, { onDelete: 'cascade' }),
  routeId: text('route_id').references(() => transportRoutes.id), stopId: text('stop_id').references(() => transportStops.id), vehicleId: text('vehicle_id').references(() => vehicles.id),
  recordedById: text('recorded_by_id').notNull().references(() => users.id), type: text('type').notNull(), scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(),
  notificationStatus: text('notification_status').notNull().default('QUEUED')
}, (t) => [index('transport_scan_time_idx').on(t.schoolId, t.scannedAt, t.type)]);

export const messages = pgTable('messages', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), senderId: text('sender_id').notNull().references(() => users.id),
  channel: text('channel').notNull(), audience: text('audience').notNull(), recipient: text('recipient'), subject: text('subject'), body: text('body').notNull(),
  status: text('status').notNull().default('QUEUED'), providerId: text('provider_id'), failureReason: text('failure_reason'), cost: numeric('cost', { precision: 12, scale: 4, mode: 'number' }),
  sentAt: timestamp('sent_at', { withTimezone: true }), deliveredAt: timestamp('delivered_at', { withTimezone: true }), createdAt: created()
}, (t) => [index('message_status_idx').on(t.schoolId, t.createdAt, t.status)]);

export const notifications = pgTable('notifications', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), title: text('title').notNull(), body: text('body').notNull(), link: text('link'), readAt: timestamp('read_at', { withTimezone: true }), createdAt: created()
}, (t) => [index('notification_user_idx').on(t.userId, t.readAt, t.createdAt)]);



export const schoolManagementControls = pgTable('school_management_controls', {
  schoolId: text('school_id').primaryKey().references(() => schools.id, { onDelete: 'cascade' }),

  // Premium makes a school eligible, but SUPER_ADMIN must explicitly unlock this.
  userAdmissionEnabled: boolean('user_admission_enabled').notNull().default(false),

  allowSchoolAdminLearners: boolean('allow_school_admin_learners').notNull().default(false),
  allowSchoolAdminStaff: boolean('allow_school_admin_staff').notNull().default(false),

  allowProprietorLearners: boolean('allow_proprietor_learners').notNull().default(false),
  allowProprietorStaff: boolean('allow_proprietor_staff').notNull().default(false),

  updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated()
});

export const supportTickets = pgTable('support_tickets', {
  id: id(), schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }), createdById: text('created_by_id').notNull().references(() => users.id),
  subject: text('subject').notNull(), description: text('description').notNull(), priority: text('priority').notNull().default('NORMAL'), status: text('status').notNull().default('OPEN'),
  resolution: text('resolution'), createdAt: created(), updatedAt: updated()
}, (t) => [index('ticket_status_idx').on(t.schoolId, t.status, t.priority)]);


// ── Platform packages & subscriptions ────────────────────────────────────────
export const packages = pgTable('packages', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  pricePerTerm: numeric('price_per_term', { precision: 12, scale: 2 }).notNull().default('0'),
  pricePerLearner: numeric('price_per_learner', { precision: 12, scale: 2 }),  // null = flat pricing
  maxLearners: integer('max_learners'),      // null = unlimited
  maxStaff: integer('max_staff'),            // null = unlimited
  features: jsonb('features').notNull().default([]), // string[]
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: created(), updatedAt: updated()
});

export const packageAddons = pgTable('package_addons', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  pricePerTerm: numeric('price_per_term', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: created(), updatedAt: updated()
});

export const schoolSubscriptions = pgTable('school_subscriptions', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  packageId: text('package_id').notNull().references(() => packages.id),
  academicYear: text('academic_year').notNull(),    // e.g. "2024/2025"
  term: text('term').notNull(),                     // TERM_1 | TERM_2 | TERM_3
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  learnerCount: integer('learner_count'),            // null = flat-rate package
  baseAmount: numeric('base_amount', { precision: 12, scale: 2 }).notNull(),
  addonsAmount: numeric('addons_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('PENDING'), // PENDING | ACTIVE | GRACE | SUSPENDED | EXPIRED
  notes: text('notes'),
  createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: created(), updatedAt: updated()
}, (t) => [index('sub_school_idx').on(t.schoolId, t.term, t.academicYear)]);

export const subscriptionAddons = pgTable('subscription_addons', {
  subscriptionId: text('subscription_id').notNull().references(() => schoolSubscriptions.id, { onDelete: 'cascade' }),
  addonId: text('addon_id').notNull().references(() => packageAddons.id, { onDelete: 'cascade' }),
  priceAtTime: numeric('price_at_time', { precision: 12, scale: 2 }).notNull(),
  createdAt: created()
}, (t) => [uniqueIndex('sub_addon_uq').on(t.subscriptionId, t.addonId)]);

export const subscriptionPayments = pgTable('subscription_payments', {
  id: id(),
  subscriptionId: text('subscription_id').notNull().references(() => schoolSubscriptions.id, { onDelete: 'cascade' }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: text('method').notNull(), // CASH | MOBILE_MONEY | BANK_TRANSFER | CHEQUE
  reference: text('reference'),
  notes: text('notes'),
  recordedById: text('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: created()
});

export const demoRequests = pgTable('demo_requests', {
  id: id(),
  schoolName: text('school_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  learnerCount: integer('learner_count'),
  staffCount: integer('staff_count'),
  message: text('message'),
  status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | DECLINED
  notes: text('notes'),
  createdAt: created(),
  updatedAt: updated()
});

export const mobileDevices = pgTable('mobile_devices', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  deviceIdentifier: text('device_identifier').notNull(),
  deviceName: text('device_name'),
  platform: text('platform').notNull(),
  appVersion: text('app_version'),
  pushToken: text('push_token'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: created(),
  updatedAt: updated()
}, (t) => [
  uniqueIndex('mobile_device_user_identifier_uq').on(t.userId, t.deviceIdentifier),
  index('mobile_device_user_idx').on(t.userId, t.revokedAt),
  index('mobile_device_push_token_idx').on(t.pushToken)
]);

export const mobileSessions = pgTable('mobile_sessions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull().references(() => mobileDevices.id, { onDelete: 'cascade' }),
  accessTokenHash: text('access_token_hash').notNull().unique(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastRotatedAt: timestamp('last_rotated_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: created(),
  updatedAt: updated()
}, (t) => [
  index('mobile_session_user_idx').on(t.userId, t.revokedAt),
  index('mobile_session_device_idx').on(t.deviceId, t.revokedAt),
  index('mobile_session_access_expiry_idx').on(t.accessExpiresAt),
  index('mobile_session_refresh_expiry_idx').on(t.refreshExpiresAt)
]);

export const auditLogs = pgTable('audit_logs', {
  id: id(), schoolId: text('school_id').references(() => schools.id, { onDelete: 'set null' }), userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), entityType: text('entity_type').notNull(), entityId: text('entity_id'), oldValue: jsonb('old_value'), newValue: jsonb('new_value'),
  ipAddress: text('ip_address'), userAgent: text('user_agent'), createdAt: created()
}, (t) => [index('audit_school_time_idx').on(t.schoolId, t.createdAt)]);

/**
 * Persisted idempotency store for the desktop offline outbox.
 * Replaces the in-process Map that was lost on every server restart.
 * Rows may be purged after 90 days — the desktop refresh token lifetime is
 * 30 days, so no client will replay an operation older than that.
 */
export const desktopOutboxIdempotencyKeys = pgTable('desktop_outbox_idempotency_keys', {
  // uuid PRIMARY KEY DEFAULT gen_random_uuid() — matches 0009 migration SQL exactly
  id:             uuid('id').defaultRandom().primaryKey(),
  // Uniqueness is enforced by the named index doik_idempotency_key_idx declared
  // in the table options below — not by a column-level .unique() constraint.
  // Using .unique() here would produce a second, unnamed PostgreSQL unique
  // constraint alongside the named index from migration 0009, creating two
  // separate uniqueness constraints on the same column.
  idempotencyKey: text('idempotency_key').notNull(),
  schoolId:       text('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  userId:         text('user_id').references(() => users.id, { onDelete: 'set null' }),
  operationType:  text('operation_type').notNull(),
  result:         text('result').notNull(),          // 'ok' | 'rejected'
  errorMessage:   text('error_message'),
  processedAt:    timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Named unique index — mirrors migration 0009:
  // CREATE UNIQUE INDEX doik_idempotency_key_idx ON desktop_outbox_idempotency_keys(idempotency_key)
  uniqueIndex('doik_idempotency_key_idx').on(t.idempotencyKey),
  index('doik_school_processed_idx').on(t.schoolId, t.processedAt),
]);
