import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Classroom {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

export interface AssignedHabit {
  id: string;
  classroomId: string;
  habitName: string;
  category: string;
  period: string;
  assignedBy: string;
}

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    try {
      const saved = localStorage.getItem("pps_classrooms_store");
      return saved ? JSON.parse(saved) : [
        {
          id: "class_demo_1",
          name: "12th Science — Batch A (NEET Prep)",
          description: "Daily study habits, physics numericals, and bio revision",
          inviteCode: "NEET26",
          ownerId: "teacher_1",
          memberCount: 28,
          createdAt: new Date().toISOString(),
        },
        {
          id: "class_demo_2",
          name: "Computer Science Dept — Sem 5",
          description: "Daily coding block, DSA practice, and project documentation",
          inviteCode: "CS2026",
          ownerId: "prof_2",
          memberCount: 42,
          createdAt: new Date().toISOString(),
        },
      ];
    } catch {
      return [];
    }
  });

  const [assignedHabits, setAssignedHabits] = useState<AssignedHabit[]>(() => {
    try {
      const saved = localStorage.getItem("pps_assigned_habits_store");
      return saved ? JSON.parse(saved) : [
        {
          id: "assign_1",
          classroomId: "class_demo_1",
          habitName: "📚 1 Hour Biology NCERT Revision",
          category: "Learning",
          period: "Daily",
          assignedBy: "Prof. Sharma",
        },
        {
          id: "assign_2",
          classroomId: "class_demo_2",
          habitName: "💻 Solve 1 LeetCode Problem",
          category: "Productivity",
          period: "Daily",
          assignedBy: "Prof. Verma",
        },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("pps_classrooms_store", JSON.stringify(classrooms));
  }, [classrooms]);

  useEffect(() => {
    localStorage.setItem("pps_assigned_habits_store", JSON.stringify(assignedHabits));
  }, [assignedHabits]);

  const createClassroom = useCallback(async (name: string, description: string): Promise<string | null> => {
    if (!name.trim()) return "Please enter a classroom name.";
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newClass: Classroom = {
      id: `class_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "Institutional learning group",
      inviteCode: code,
      ownerId: "current_user",
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };
    setClassrooms((prev) => [newClass, ...prev]);
    toast.success(`Classroom "${newClass.name}" created! Invite code: ${code}`);
    return null;
  }, []);

  const joinClassroom = useCallback(async (code: string): Promise<string | null> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return "Please enter an invite code.";

    const found = classrooms.find((c) => c.inviteCode === cleanCode);
    if (!found) {
      return `Invalid invite code "${cleanCode}". Please check with your teacher/professor.`;
    }

    setClassrooms((prev) =>
      prev.map((c) => (c.inviteCode === cleanCode ? { ...c, memberCount: c.memberCount + 1 } : c))
    );

    toast.success(`Successfully joined classroom "${found.name}"!`);
    return null;
  }, [classrooms]);

  const assignHabit = useCallback(async (classroomId: string, habitName: string, category: string, period: string) => {
    if (!habitName.trim()) return "Please enter habit name.";
    const newAssign: AssignedHabit = {
      id: `assign_${Date.now()}`,
      classroomId,
      habitName: `📚 ${habitName.trim()}`,
      category: category || "Learning",
      period: period || "Daily",
      assignedBy: "Teacher",
    };
    setAssignedHabits((prev) => [newAssign, ...prev]);
    toast.success(`Assigned habit "${habitName}" to all classroom members!`);
    return null;
  }, []);

  return {
    classrooms,
    assignedHabits,
    createClassroom,
    joinClassroom,
    assignHabit,
  };
}
