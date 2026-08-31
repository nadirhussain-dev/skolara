-- unique_class_per_school
--
-- Nothing stopped a school having two "Grade 6 / A / 2026" rows. Duplicate
-- classes silently split a roster in half: students land in one, the register
-- gets taken against the other, and the attendance rate looks wrong with no
-- obvious cause. Section is NOT NULL on this table, so a plain unique
-- constraint is sufficient — no partial index needed.

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_name_section_academicYear_key"
  ON "SchoolClass"("schoolId", "name", "section", "academicYear");
