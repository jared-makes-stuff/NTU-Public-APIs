const { z } = require('zod');

const metadataSchema = z.object({
  year: z.string(),
  semester: z.string(),
  label: z.string(),
  value: z.string(),
  updated_at: z.date().optional(),
});

const courseContentSchema = z.object({
  course_code: z.string(),
  acadsem: z.string(),
  title: z.string(),
  au: z.number().nullable(),
  description: z.string(),
  prerequisites: z.string(),
  mutual_exclusions: z.string(),
  department_code: z.string().optional(),
  not_available_to_programme: z.string().optional(),
  not_available_to_all_programme_with: z.string().optional(),
  not_available_as_bde_ue_to_programme: z.string().optional(),
  is_unrestricted_elective: z.boolean().optional(),
  is_broadening_deepening_elective: z.boolean().optional(),
  grade_type: z.string().optional(),
});

const scheduleSectionSchema = z.object({
  index: z.string(),
  type: z.string(),
  group: z.string(),
  day: z.string(),
  time: z.string(),
  venue: z.string(),
  remark: z.string(),
});

const courseScheduleSchema = z.object({
  course_code: z.string(),
  acadsem: z.string(),
  sections: z.array(scheduleSectionSchema),
});

const vacancyClassSchema = z.object({
  type: z.string(),
  group: z.string(),
  day: z.string(),
  time: z.string(),
  venue: z.string(),
});

const vacancyIndexSchema = z.object({
  index: z.string(),
  vacancy: z.number(),
  waitlist: z.number(),
  classes: z.array(vacancyClassSchema),
});

const vacancyResponseSchema = z.object({
  course_code: z.string(),
  indexes: z.array(vacancyIndexSchema),
});

module.exports = {
  metadataSchema,
  courseContentSchema,
  courseScheduleSchema,
  scheduleSectionSchema,
  vacancyClassSchema,
  vacancyIndexSchema,
  vacancyResponseSchema,
};
