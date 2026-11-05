export function academicTermLabel(classes = []) {
  const terms = [...new Set(classes.filter(course => course.semester && course.school_year)
    .map(course => `${course.semester} Semester, A.Y. ${course.school_year}`))];
  return terms.length === 1 ? terms[0] : "College-wide overview";
}
