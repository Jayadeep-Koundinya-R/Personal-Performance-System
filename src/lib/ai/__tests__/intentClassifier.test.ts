import { describe, it, expect } from "vitest";
import { classifyIntent, INTENT_REGISTRY } from "../intentClassifier";

describe("AI Intent Classifier", () => {
  it("classifies a greeting correctly", () => {
    const result = classifyIntent("Hey there!");
    expect(result.intent).toBe("greeting");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies 'hello' as greeting", () => {
    const result = classifyIntent("Hello");
    expect(result.intent).toBe("greeting");
  });

  it("classifies 'roast me' as roast intent", () => {
    const result = classifyIntent("Roast me hard!");
    expect(result.intent).toBe("roast");
    expect(result.confidence).toBeGreaterThan(0.2);
  });

  it("classifies 'daily audit' as audit intent", () => {
    const result = classifyIntent("Show me a daily audit of my pending tasks");
    expect(result.intent).toBe("audit");
  });

  it("classifies procrastination-related messages as focus intent", () => {
    const result = classifyIntent("I keep procrastinating on everything");
    expect(result.intent).toBe("focus");
  });

  it("classifies 'how many habits left' as audit intent", () => {
    const result = classifyIntent("How many habits remaining for today?");
    expect(result.intent).toBe("audit");
  });

  it("classifies streak-related questions", () => {
    const result = classifyIntent("How do I protect my streak?");
    expect(result.intent).toBe("streak");
  });

  it("classifies 'motivate me' as motivation intent", () => {
    const result = classifyIntent("I feel lazy and unmotivated today");
    expect(result.intent).toBe("motivation");
  });

  it("classifies stat requests", () => {
    const result = classifyIntent("Show me my stats and performance score");
    expect(result.intent).toBe("stats");
  });

  it("classifies help requests", () => {
    const result = classifyIntent("What can you do? Help me");
    expect(result.intent).toBe("help");
  });

  it("classifies habit suggestions", () => {
    const result = classifyIntent("Can you suggest a new habit for me?");
    expect(result.intent).toBe("habit_suggest");
  });

  it("classifies celebration messages", () => {
    const result = classifyIntent("I finished all my habits! Crushed it!");
    expect(result.intent).toBe("celebrate");
  });

  it("classifies exercise queries", () => {
    const result = classifyIntent("Any tips for my workout routine?");
    expect(result.intent).toBe("exercise");
  });

  it("returns 'unknown' for gibberish with low confidence", () => {
    const result = classifyIntent("xyzzy foobar blah");
    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBeLessThan(0.15);
  });

  it("has scores array for all registered intents", () => {
    const result = classifyIntent("Roast my performance");
    expect(result.scores.length).toBe(INTENT_REGISTRY.length);
  });

  it("handles empty string gracefully", () => {
    const result = classifyIntent("");
    expect(result.intent).toBe("unknown");
  });

  it("handles mixed-case and punctuation", () => {
    const result = classifyIntent("ROAST ME!!! 🔥🔥🔥");
    expect(result.intent).toBe("roast");
  });
});
