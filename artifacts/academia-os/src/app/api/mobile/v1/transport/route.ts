import {
  and,
  desc,
  eq,
  inArray
} from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import {
  learners,
  transportAssignments,
  transportRoutes,
  transportScans,
  transportStops,
  vehicles
} from '@/db/schema';
import {
  accessibleLearnerIds,
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  resolveMobileSchoolId
} from '@/lib/mobile-api';
import { canAccess } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
) {
  const auth =
    await authenticateMobileRequest(request);

  if ('response' in auth) {
    return auth.response;
  }

  const role = auth.context.user.role;

  if (
    role !== 'PARENT' &&
    !canAccess(role, 'transport')
  ) {
    return mobileError(
      403,
      'PERMISSION_DENIED',
      'This account cannot view school transport information.'
    );
  }

  const schoolId =
    await resolveMobileSchoolId(
      auth.context,
      request
    );

  if (!schoolId) {
    return mobileError(
      400,
      'SCHOOL_REQUIRED',
      'This account must select an active school.'
    );
  }

  let permittedLearnerIds:
    | string[]
    | null = null;

  if (role === 'PARENT') {
    permittedLearnerIds =
      await accessibleLearnerIds(
        auth.context,
        schoolId
      );

    if (
      !permittedLearnerIds ||
      permittedLearnerIds.length === 0
    ) {
      return mobileJson({
        data: {
          assignments: [],
          scans: []
        }
      });
    }
  }

  const assignmentConditions = [
    eq(
      transportAssignments.schoolId,
      schoolId
    ),
    eq(
      transportAssignments.isActive,
      true
    )
  ];

  if (permittedLearnerIds) {
    assignmentConditions.push(
      inArray(
        transportAssignments.learnerId,
        permittedLearnerIds
      )
    );
  }

  const assignmentRows = await db
    .select({
      id: transportAssignments.id,
      learnerId: learners.id,
      admissionNo: learners.admissionNo,
      learnerFirstName: learners.firstName,
      learnerLastName: learners.lastName,
      routeId: transportRoutes.id,
      routeName: transportRoutes.name,
      morningStartTime:
        transportRoutes.morningStartTime,
      afternoonStartTime:
        transportRoutes.afternoonStartTime,
      routeVehicleId:
        transportRoutes.vehicleId,
      assignmentVehicleId:
        transportAssignments.vehicleId,
      stopId: transportStops.id,
      stopName: transportStops.name,
      pickupTime: transportStops.pickupTime,
      dropOffTime:
        transportStops.dropOffTime
    })
    .from(transportAssignments)
    .innerJoin(
      learners,
      eq(
        transportAssignments.learnerId,
        learners.id
      )
    )
    .innerJoin(
      transportRoutes,
      eq(
        transportAssignments.routeId,
        transportRoutes.id
      )
    )
    .leftJoin(
      transportStops,
      eq(
        transportAssignments.stopId,
        transportStops.id
      )
    )
    .where(and(...assignmentConditions));

  const scanConditions = [
    eq(transportScans.schoolId, schoolId)
  ];

  if (permittedLearnerIds) {
    scanConditions.push(
      inArray(
        transportScans.learnerId,
        permittedLearnerIds
      )
    );
  }

  const scanRows = await db
    .select({
      id: transportScans.id,
      learnerId: learners.id,
      admissionNo: learners.admissionNo,
      learnerFirstName: learners.firstName,
      learnerLastName: learners.lastName,
      type: transportScans.type,
      scannedAt: transportScans.scannedAt,
      notificationStatus:
        transportScans.notificationStatus,
      routeId: transportRoutes.id,
      routeName: transportRoutes.name,
      routeVehicleId:
        transportRoutes.vehicleId,
      vehicleId: transportScans.vehicleId,
      stopId: transportStops.id,
      stopName: transportStops.name
    })
    .from(transportScans)
    .innerJoin(
      learners,
      eq(
        transportScans.learnerId,
        learners.id
      )
    )
    .leftJoin(
      transportRoutes,
      eq(
        transportScans.routeId,
        transportRoutes.id
      )
    )
    .leftJoin(
      transportStops,
      eq(
        transportScans.stopId,
        transportStops.id
      )
    )
    .where(and(...scanConditions))
    .orderBy(desc(transportScans.scannedAt))
    .limit(100);

  const vehicleIds = Array.from(
    new Set(
      [
        ...assignmentRows.flatMap(
          (row) => [
            row.assignmentVehicleId,
            row.routeVehicleId
          ]
        ),
        ...scanRows.flatMap(
          (row) => [
            row.vehicleId,
            row.routeVehicleId
          ]
        )
      ].filter(
        (id): id is string => Boolean(id)
      )
    )
  );

  const vehicleRows = vehicleIds.length
    ? await db
        .select({
          id: vehicles.id,
          name: vehicles.name,
          registrationNo:
            vehicles.registrationNo,
          driverName: vehicles.driverName,
          driverPhone: vehicles.driverPhone,
          attendantName:
            vehicles.attendantName
        })
        .from(vehicles)
        .where(and(
          eq(vehicles.schoolId, schoolId),
          inArray(vehicles.id, vehicleIds)
        ))
    : [];

  const vehicleById = new Map(
    vehicleRows.map((vehicle) => [
      vehicle.id,
      vehicle
    ])
  );

  const assignments = assignmentRows.map(
    (row) => {
      const vehicleId =
        row.assignmentVehicleId ||
        row.routeVehicleId;

      const vehicle = vehicleId
        ? vehicleById.get(vehicleId) || null
        : null;

      return {
        id: row.id,
        learnerId: row.learnerId,
        admissionNo: row.admissionNo,
        learnerFirstName:
          row.learnerFirstName,
        learnerLastName:
          row.learnerLastName,
        routeId: row.routeId,
        routeName: row.routeName,
        morningStartTime:
          row.morningStartTime,
        afternoonStartTime:
          row.afternoonStartTime,
        stopId: row.stopId,
        stopName: row.stopName,
        pickupTime: row.pickupTime,
        dropOffTime: row.dropOffTime,
        vehicle
      };
    }
  );

  const scans = scanRows.map((row) => {
    const vehicleId =
      row.vehicleId ||
      row.routeVehicleId;

    const vehicle = vehicleId
      ? vehicleById.get(vehicleId) || null
      : null;

    return {
      id: row.id,
      learnerId: row.learnerId,
      admissionNo: row.admissionNo,
      learnerFirstName:
        row.learnerFirstName,
      learnerLastName:
        row.learnerLastName,
      type: row.type,
      scannedAt: row.scannedAt,
      notificationStatus:
        row.notificationStatus,
      routeId: row.routeId,
      routeName: row.routeName,
      stopId: row.stopId,
      stopName: row.stopName,
      vehicle
    };
  });

  return mobileJson({
    data: {
      assignments,
      scans
    }
  });
}
