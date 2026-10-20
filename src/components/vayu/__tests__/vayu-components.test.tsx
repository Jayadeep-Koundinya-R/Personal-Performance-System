import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VayuPulseBanner } from "../VayuPulseBanner";
import { VayuFlowStudioModal } from "../VayuFlowStudioModal";
import { VayuDailyPlan, VayuTimeBlock } from "@/lib/vayu/types";

describe("🌬️ Vayu UI Components (HUD Banner & Flow Studio)", () => {
  const mockPlan: VayuDailyPlan = {
    id: "plan_test_1",
    userId: "user_test",
    date: "2026-10-14",
    totalTargetMinutes: 300,
    completedMinutes: 60,
    overallCompletionRate: 20,
    aiStrategySummary: "Circadian 45/15 flow with high-energy morning focus.",
    currentVitalFocus: "Algorithms Mastery Sprint",
    lastRecalibratedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    needsRebalance: false,
    blocks: [
      {
        id: "b1",
        title: "Algorithms Mastery Sprint",
        category: "Deep Work",
        startTime: "08:00",
        endTime: "08:45",
        durationMinutes: 45,
        status: "pending",
        energyLevel: "peak",
        completionPercentage: 0,
        xpAwarded: 0,
        autoManaged: true,
      },
      {
        id: "b2",
        title: "Vayu Prana: Mindful Recharge",
        category: "Rest",
        startTime: "08:45",
        endTime: "09:00",
        durationMinutes: 15,
        status: "pending",
        energyLevel: "recharge",
        completionPercentage: 0,
        xpAwarded: 0,
        autoManaged: true,
      },
      {
        id: "b3",
        title: "System Design Drills",
        category: "Learning",
        startTime: "13:00",
        endTime: "13:45",
        durationMinutes: 45,
        status: "pending",
        energyLevel: "medium",
        completionPercentage: 0,
        xpAwarded: 0,
        autoManaged: true,
      },
    ],
  };

  const mockOnProcessInput = vi.fn().mockResolvedValue({ action: "completed_block" });
  const mockOnRebalance = vi.fn();
  const mockOnOpenStudio = vi.fn();
  const mockOnCompleteCurrent = vi.fn();
  const mockOnStartSprint = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VayuPulseBanner HUD", () => {
    it("renders active block title, energy level badge, and vital completion gauge", () => {
      render(
        <VayuPulseBanner
          plan={mockPlan}
          currentBlock={mockPlan.blocks[0]}
          nextBlock={mockPlan.blocks[1]}
          completionRate={20}
          onProcessInput={mockOnProcessInput}
          onRebalance={mockOnRebalance}
          onOpenStudio={mockOnOpenStudio}
          onCompleteCurrent={mockOnCompleteCurrent}
          onStartSprint={mockOnStartSprint}
        />
      );

      expect(screen.getByText("Vayu Circadian Flow")).toBeInTheDocument();
      expect(screen.getByText("Algorithms Mastery Sprint")).toBeInTheDocument();
      expect(screen.getByText("20% Achieved")).toBeInTheDocument();
      expect(screen.getByText(/Peak Energy/i)).toBeInTheDocument();
    });

    it("displays the zero-guilt delay alert when needsRebalance is true and triggers rebalance", () => {
      const delayedPlan: VayuDailyPlan = {
        ...mockPlan,
        needsRebalance: true,
        rebalanceExplanation: "Schedule slipped >20m behind local time. Fluid rebalance ready with zero guilt.",
      };

      render(
        <VayuPulseBanner
          plan={delayedPlan}
          currentBlock={delayedPlan.blocks[0]}
          nextBlock={delayedPlan.blocks[1]}
          completionRate={0}
          onProcessInput={mockOnProcessInput}
          onRebalance={mockOnRebalance}
          onOpenStudio={mockOnOpenStudio}
          onCompleteCurrent={mockOnCompleteCurrent}
          onStartSprint={mockOnStartSprint}
        />
      );

      expect(screen.getByText(/Schedule running behind\? Zero guilt/i)).toBeInTheDocument();
      const rebalanceBtn = screen.getByRole("button", { name: /Slide Schedule Forward/i });
      fireEvent.click(rebalanceBtn);
      expect(mockOnRebalance).toHaveBeenCalledTimes(1);
    });

    it("launches focus sprint directly when Start Sprint is clicked", () => {
      render(
        <VayuPulseBanner
          plan={mockPlan}
          currentBlock={mockPlan.blocks[0]}
          nextBlock={mockPlan.blocks[1]}
          completionRate={20}
          onProcessInput={mockOnProcessInput}
          onRebalance={mockOnRebalance}
          onOpenStudio={mockOnOpenStudio}
          onCompleteCurrent={mockOnCompleteCurrent}
          onStartSprint={mockOnStartSprint}
        />
      );

      const sprintBtn = screen.getByRole("button", { name: /Start Sprint/i });
      fireEvent.click(sprintBtn);
      expect(mockOnStartSprint).toHaveBeenCalledWith(mockPlan.blocks[0]);
    });

    it("submits natural language input to Vayu parser", () => {
      render(
        <VayuPulseBanner
          plan={mockPlan}
          currentBlock={mockPlan.blocks[0]}
          nextBlock={mockPlan.blocks[1]}
          completionRate={20}
          onProcessInput={mockOnProcessInput}
          onRebalance={mockOnRebalance}
          onOpenStudio={mockOnOpenStudio}
          onCompleteCurrent={mockOnCompleteCurrent}
        />
      );

      const input = screen.getByPlaceholderText(/Tell Vayu:/i);
      fireEvent.change(input, { target: { value: "Finished DSA session 100%" } });

      const submitBtn = screen.getByRole("button", { name: /Process/i });
      fireEvent.click(submitBtn);

      expect(mockOnProcessInput).toHaveBeenCalledWith("Finished DSA session 100%");
    });
  });

  describe("VayuFlowStudioModal", () => {
    it("renders circadian timeline, energy badges, and Agni Curfew indicator", () => {
      render(
        <VayuFlowStudioModal
          isOpen={true}
          onClose={vi.fn()}
          plan={mockPlan}
          onGenerateNewPlan={vi.fn()}
          onRebalance={mockOnRebalance}
          onCompleteBlock={vi.fn()}
          onStartSprint={mockOnStartSprint}
        />
      );

      expect(screen.getByText("Vayu Flow Studio")).toBeInTheDocument();
      expect(screen.getByText("10:00 PM")).toBeInTheDocument();
      expect(screen.getByText("Algorithms Mastery Sprint")).toBeInTheDocument();
      expect(screen.getByText("Vayu Prana: Mindful Recharge")).toBeInTheDocument();
      expect(screen.getByText("System Design Drills")).toBeInTheDocument();
    });

    it("triggers sprint launcher from inside flow studio modal", () => {
      render(
        <VayuFlowStudioModal
          isOpen={true}
          onClose={vi.fn()}
          plan={mockPlan}
          onGenerateNewPlan={vi.fn()}
          onRebalance={mockOnRebalance}
          onCompleteBlock={vi.fn()}
          onStartSprint={mockOnStartSprint}
        />
      );

      const sprintBtns = screen.getAllByRole("button", { name: /Sprint/i });
      expect(sprintBtns.length).toBeGreaterThan(0);
      fireEvent.click(sprintBtns[0]);
      expect(mockOnStartSprint).toHaveBeenCalledWith(mockPlan.blocks[0]);
    });
  });
});
