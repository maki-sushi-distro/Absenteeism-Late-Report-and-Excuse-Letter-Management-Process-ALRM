export function historicalRequestClass(request) {
  const snapshot = request?.class_snapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) return snapshot.class || snapshot;
  return request?.enrollment?.class || request?.class || null;
}

export function historicalInstructor(course) {
  if (!course) return null;
  const instructor = course.instructor || course.assigned_instructor;
  if (typeof instructor === "string") return { name: instructor };
  return instructor || (course.instructor_name ? { name: course.instructor_name } : null);
}

export function historicalInstructorName(request, fallback = "Unavailable") {
  return historicalInstructor(historicalRequestClass(request))?.name || fallback;
}
