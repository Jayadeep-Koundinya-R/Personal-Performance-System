import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export interface Masterclass {
  id: string;
  title: string;
  subject: string;
  description: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  mentorRole: string;
  mentorBadge: "verified" | "master" | "peer";
  rating: number;
  reviewCount: number;
  price: number; // in INR (0 = Free)
  currency: string;
  scheduledAt: string;
  durationMinutes: number;
  maxSeats: number;
  enrolledStudents: string[]; // user IDs or names
  recordingUrl?: string;
  resourcesUrl?: string;
  createdAt: string;
}

const DEFAULT_CLASSES: Masterclass[] = [];

export function useClasses() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [classes, setClasses] = useState<Masterclass[]>(() => {
    try {
      const saved = localStorage.getItem("pps_masterclasses_store");
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    } catch {
      return DEFAULT_CLASSES;
    }
  });

  const [myTickets, setMyTickets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pps_my_class_tickets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("pps_masterclasses_store", JSON.stringify(classes));
    } catch (e) {
      console.error(e);
    }
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem("pps_my_class_tickets", JSON.stringify(myTickets));
    } catch (e) {
      console.error(e);
    }
  }, [myTickets]);

  // Book / Enroll in a class
  const bookClassTicket = useCallback(
    async (classId: string, paymentMethod: string = "UPI"): Promise<{ success: boolean; error?: string }> => {
      const targetClass = classes.find((c) => c.id === classId);
      if (!targetClass) return { success: false, error: "Class not found." };

      const studentName = profile?.displayName || "You";

      if (targetClass.enrolledStudents.includes(studentName) || myTickets.includes(classId)) {
        return { success: false, error: "You are already enrolled in this class!" };
      }

      if (targetClass.enrolledStudents.length >= targetClass.maxSeats) {
        return { success: false, error: "Class is sold out! All seats filled." };
      }

      // Add student to enrolled list
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId ? { ...c, enrolledStudents: [...c.enrolledStudents, studentName] } : c
        )
      );

      setMyTickets((prev) => [...prev, classId]);

      toast.success(`🎉 Booked Seat for "${targetClass.title}"!`, {
        description: `Payment confirmed via ${paymentMethod}. Meeting link is available in your enrolled tab.`,
      });

      return { success: true };
    },
    [classes, myTickets, profile]
  );

  // Host a new masterclass (For verified teachers/mentors)
  const createMasterclass = useCallback(
    async (data: {
      title: string;
      subject: string;
      description: string;
      price: number;
      scheduledAt: string;
      durationMinutes: number;
      maxSeats: number;
      resourcesUrl?: string;
    }): Promise<{ success: boolean; classId?: string; error?: string }> => {
      if (!data.title.trim()) return { success: false, error: "Please enter a class title." };

      const newClassId = `cls_${Date.now()}`;
      const mentorName = profile?.displayName || "Teacher";
      const mentorAvatar = profile?.avatarEmoji || (profile?.avatarUrl && profile.avatarUrl.length <= 4 ? profile.avatarUrl : "👨‍🏫");
      const userId = user?.id || "local_teacher";

      const newCls: Masterclass = {
        id: newClassId,
        title: data.title.trim(),
        subject: data.subject || "General",
        description: data.description.trim() || "Live interactive masterclass on PPS Focus Rooms.",
        mentorId: userId,
        mentorName,
        mentorAvatar,
        mentorRole: "Verified Mentor",
        mentorBadge: "verified",
        rating: 5.0,
        reviewCount: 1,
        price: Math.max(0, data.price || 0),
        currency: "INR",
        scheduledAt: data.scheduledAt || new Date(Date.now() + 86400000 * 2).toISOString(),
        durationMinutes: data.durationMinutes || 60,
        maxSeats: data.maxSeats || 30,
        enrolledStudents: [],
        resourcesUrl: data.resourcesUrl || "",
        createdAt: new Date().toISOString(),
      };

      setClasses((prev) => [newCls, ...prev]);
      toast.success(`Masterclass "${newCls.title}" is now published and live on PPS Marketplace! 🚀`);
      return { success: true, classId: newClassId };
    },
    [user, profile]
  );

  return {
    classes,
    myTickets,
    bookClassTicket,
    createMasterclass,
  };
}
