import { describe, it, expect } from 'vitest';
import {
  CURATED_BLUEPRINTS,
  extractTopicsFromText,
  decomposeIntoDailySequence,
  getBlueprintTopics,
} from '../syllabusParser';

describe('Syllabus-to-Habit Decomposer Engine (Task 3.4)', () => {
  it('loads all 4 built-in student & engineer blueprints', () => {
    expect(CURATED_BLUEPRINTS.length).toBe(4);
    const ids = CURATED_BLUEPRINTS.map((b) => b.id);
    expect(ids).toContain('gate_cse');
    expect(ids).toContain('leetcode_75');
    expect(ids).toContain('upsc_gs');
    expect(ids).toContain('fullstack_web');
  });

  describe('extractTopicsFromText()', () => {
    it('cleans numbered lines, dashes, and bullet marks', () => {
      const raw = `
        1. B-Trees & Indexing (DBMS)
        2) Relational Normalization
        [3] Banker's Algorithm (OS)
        - Dynamic Programming LCS
        * Trie Data Structures
        Day 6: Sockets & TCP Three-Way Handshake
      `;

      const extracted = extractTopicsFromText(raw);
      expect(extracted).toHaveLength(6);
      expect(extracted[0]).toBe('B-Trees & Indexing (DBMS)');
      expect(extracted[1]).toBe('Relational Normalization');
      expect(extracted[2]).toBe("Banker's Algorithm (OS)");
      expect(extracted[3]).toBe('Dynamic Programming LCS');
      expect(extracted[4]).toBe('Trie Data Structures');
      expect(extracted[5]).toBe('Sockets & TCP Three-Way Handshake');
    });

    it('returns empty array when text is empty or blank', () => {
      expect(extractTopicsFromText('')).toEqual([]);
      expect(extractTopicsFromText('   \n  \n')).toEqual([]);
    });
  });

  describe('decomposeIntoDailySequence()', () => {
    it('decomposes topics into a full 30-day spaced-repetition sequence', () => {
      const topics = [
        'Process Scheduling',
        'Deadlocks & Banker’s Algorithm',
        'Virtual Memory & Paging',
        'Disk Scheduling Algorithms',
      ];

      const sequence = decomposeIntoDailySequence(topics, 30, new Date('2026-10-15'));
      expect(sequence).toHaveLength(30);

      // Verify sequence numbering and consecutive dates
      expect(sequence[0].day).toBe(1);
      expect(sequence[0].dateStr).toBe('2026-10-15');
      expect(sequence[0].topic).toBe('Process Scheduling');
      expect(sequence[0].isReviewDay).toBe(false);

      // Verify review days at Day 7, Day 14, Day 21, and Day 30
      const reviewDays = sequence.filter((s) => s.isReviewDay).map((s) => s.day);
      expect(reviewDays).toContain(7);
      expect(reviewDays).toContain(14);
      expect(reviewDays).toContain(21);
      expect(reviewDays).toContain(30);
      expect(sequence[6].topic).toContain('Spaced Repetition Review');
    });

    it('handles custom 15-day sequence', () => {
      const topics = ['Array Two Pointers', 'Sliding Window', 'Binary Search Tree'];
      const sequence = decomposeIntoDailySequence(topics, 15);
      expect(sequence).toHaveLength(15);
      expect(sequence[14].isReviewDay).toBe(true);
    });
  });

  describe('getBlueprintTopics()', () => {
    it('extracts flattened topics from blueprint with corresponding module labels', () => {
      const gateTopics = getBlueprintTopics('gate_cse');
      expect(gateTopics.length).toBeGreaterThan(15);
      expect(gateTopics[0]).toHaveProperty('topic');
      expect(gateTopics[0]).toHaveProperty('module');
      expect(gateTopics.some((t) => t.module === 'Operating Systems')).toBe(true);
    });
  });
});
