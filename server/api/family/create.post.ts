import { defineEventHandler, createError, readBody } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseServer } from "~/server/utils/supabase";

interface CreateFamilyBody {
  studentId: string;
  familyName?: string;
  parentIds?: string[];
}

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const supabase = useSupabaseServer();

  const { studentId, familyName, parentIds = [] } = await readBody<CreateFamilyBody>(
    event
  );

  if (!studentId) {
    throw createError({
      statusCode: 400,
      message: "studentId is required",
    });
  }

  // Verify student exists and is a student
  const { data: student, error: studentError } = await supabase
    .from("users")
    .select("id, role, full_name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    throw createError({
      statusCode: 400,
      message: "Invalid student or student not found",
    });
  }

  if (student.role !== "student") {
    throw createError({
      statusCode: 400,
      message: "User is not a student",
    });
  }

  // Check if family already exists for this student
  const { data: existingFamily } = await supabase
    .from("family_units")
    .select("id")
    .eq("student_user_id", studentId)
    .single();

  if (existingFamily) {
    throw createError({
      statusCode: 400,
      message: "Family already exists for this student",
    });
  }

  // Create family unit
  const { data: family, error: familyError } = await supabase
    .from("family_units")
    .insert({
      student_user_id: studentId,
      family_name: familyName || `${student.full_name}'s Family`,
    })
    .select()
    .single();

  if (familyError || !family) {
    throw createError({
      statusCode: 500,
      message: "Failed to create family unit",
    });
  }

  // Add student to family
  const { error: studentMemberError } = await supabase
    .from("family_members")
    .insert({
      family_unit_id: family.id,
      user_id: studentId,
      role: "student",
    });

  if (studentMemberError) {
    throw createError({
      statusCode: 500,
      message: "Failed to add student to family",
    });
  }

  // Add parents if provided
  if (parentIds && parentIds.length > 0) {
    const parentMembers = parentIds.map((parentId) => ({
      family_unit_id: family.id,
      user_id: parentId,
      role: "parent" as const,
    }));

    const { error: parentError } = await supabase
      .from("family_members")
      .insert(parentMembers);

    if (parentError) {
      throw createError({
        statusCode: 500,
        message: "Failed to add parents to family",
      });
    }
  }

  return {
    success: true,
    family,
    message: "Family created successfully",
  };
});
