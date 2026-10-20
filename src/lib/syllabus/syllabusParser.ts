/**
 * 📚 Syllabus-to-Habit Decomposition Engine
 *
 * Deconstructs monolithic syllabi, exam roadmaps, or course modules
 * into structured 15/30-day sequential habit tracks with spaced repetition.
 *
 * Reference: docs/PPS_MASTER_SPECIFICATION.md Section 2.5 & Task 3.4
 */

export interface SyllabusItem {
  day: number;
  dateStr: string;
  topic: string;
  module: string;
  durationMinutes: number;
  timeBlock: 'morning' | 'afternoon' | 'evening';
  isReviewDay?: boolean;
}

export interface SyllabusBlueprint {
  id: string;
  title: string;
  category: 'Studies' | 'Coding' | 'Exams' | 'Career';
  icon: string;
  description: string;
  modules: {
    name: string;
    topics: string[];
  }[];
}

export const CURATED_BLUEPRINTS: SyllabusBlueprint[] = [
  {
    id: 'gate_cse',
    title: 'GATE CSE (Core CS Modules)',
    category: 'Exams',
    icon: '🎓',
    description: 'Operating Systems, Algorithms, DBMS, Networks, and Discrete Mathematics structured for high-yield recall.',
    modules: [
      {
        name: 'Algorithms & Data Structures',
        topics: [
          'Asymptotic Notations & Recurrence Relations',
          'Divide & Conquer (Merge Sort, Binary Search)',
          'Greedy Strategies (Huffman, Prim & Kruskal)',
          'Dynamic Programming (0/1 Knapsack, LCS, Matrix Chain)',
          'Graph Traversals (BFS, DFS, Dijkstra, Bellman-Ford)',
        ],
      },
      {
        name: 'Operating Systems',
        topics: [
          'Process States, Context Switching & Fork',
          'CPU Scheduling (FCFS, SJF, Round Robin)',
          'Process Synchronization (Semaphores, Monitors, Classic IPC)',
          'Deadlock Handling (Banker’s Algorithm, Prevention)',
          'Memory Management & Paging (Virtual Memory, TLB, Page Replacement)',
        ],
      },
      {
        name: 'Database Management Systems',
        topics: [
          'ER-Modeling & Relational Algebra Equivalences',
          'SQL Queries & Nested Subqueries Drill',
          'Functional Dependencies & Normalization (BCNF, 3NF)',
          'Transaction Concurrency Control & ACID (2PL, Serializability)',
          'B-Trees & B+ Trees Indexing Structures',
        ],
      },
      {
        name: 'Computer Networks',
        topics: [
          'OSI & TCP/IP Layering Reference',
          'Data Link Framing, Error Detection & Sliding Window',
          'IP Addressing, CIDR & Subnetting Drills',
          'Routing Protocols (Distance Vector & Link State)',
          'TCP Handshake, Congestion Control & Sockets',
        ],
      },
    ],
  },
  {
    id: 'leetcode_75',
    title: 'LeetCode 75 (Interview Coding)',
    category: 'Coding',
    icon: '💻',
    description: 'Systematic progression covering the top 75 essential algorithmic coding patterns for tech interviews.',
    modules: [
      {
        name: 'Linear Sequences & Pointers',
        topics: [
          'Array String Manipulation & Merge Strings',
          'Two Pointers (Container With Most Water, Is Subsequence)',
          'Sliding Window (Max Average Subarray, Longest Ones)',
          'Prefix Sum (Find Pivot Index, Altitude Gain)',
        ],
      },
      {
        name: 'Hashing & Stacks',
        topics: [
          'Hash Map & Set Frequency Counters',
          'Monotonic Stack (Daily Temperatures)',
          'Asteroid Collision & String Decoders',
          'Queues & Number of Recent Calls',
        ],
      },
      {
        name: 'Trees & Linked Lists',
        topics: [
          'Reverse Linked List & Delete Middle Node',
          'Maximum Depth of Binary Tree & Leaf-Similar',
          'Count Good Nodes in Binary Tree',
          'Lowest Common Ancestor in Binary Tree',
          'Binary Search Tree Search & Deletion',
        ],
      },
      {
        name: 'Graphs & Dynamic Programming',
        topics: [
          'Number of Provinces & Reorder Routes (DFS)',
          'Rotting Oranges & Nearest Exit (BFS)',
          'Trie Construction & Search Suggestions',
          'Climbing Stairs & Min Cost Climbing Stairs',
          'House Robber & Longest Common Subsequence',
        ],
      },
    ],
  },
  {
    id: 'upsc_gs',
    title: 'UPSC / Civil Services Foundation',
    category: 'Studies',
    icon: '🏛️',
    description: 'Core General Studies: Indian Polity, Modern History, Macroeconomics & Ecology.',
    modules: [
      {
        name: 'Indian Polity & Governance',
        topics: [
          'Preamble & Salient Features of Constitution',
          'Fundamental Rights & Directive Principles (DPSP)',
          'Parliament, Rajya Sabha & Legislative Process',
          'Supreme Court, High Courts & Judicial Review',
          'Emergency Provisions & Centre-State Relations',
        ],
      },
      {
        name: 'Modern Indian History',
        topics: [
          '1857 Revolt & Socio-Religious Reform Movements',
          'Early Nationalist Phase & Swadeshi Movement',
          'Gandhian Movements (Non-Cooperation, Civil Disobedience)',
          'Quit India Movement & Transfer of Power (1947)',
        ],
      },
      {
        name: 'Economy & Ecology',
        topics: [
          'National Income Accounting & GDP Deflator',
          'Monetary Policy, RBI Tools & Inflation Mechanics',
          'Fiscal Policy, FRBM Act & Budget Structure',
          'Biodiversity Hotspots & Protected Area Networks',
        ],
      },
    ],
  },
  {
    id: 'fullstack_web',
    title: 'Full-Stack Modern Engineering',
    category: 'Coding',
    icon: '🚀',
    description: 'Modern TypeScript, React 19, Node.js, PostgreSQL, WebSockets & Distributed System Basics.',
    modules: [
      {
        name: 'Frontend Core & Architecture',
        topics: [
          'Advanced TypeScript Generics & Utility Types',
          'React State Architecture, Custom Hooks & Memoization',
          'Framer Motion & Tailwind CSS Modern Layouts',
          'Client-Side Routing, Route Guards & Code Splitting',
        ],
      },
      {
        name: 'Backend & Data Persistence',
        topics: [
          'RESTful APIs, Middleware & Validation with Zod',
          'PostgreSQL Schema Modeling, Indexes & Foreign Keys',
          'Supabase Auth, Row Level Security & JWT Tokens',
          'Realtime WebSockets & Presence Broadcasting',
        ],
      },
      {
        name: 'Performance & Operations',
        topics: [
          'Web Vitals Optimization (LCP, FID, CLS)',
          'Client-side Caching & Service Workers (PWA)',
          'Docker Containerization & Multi-stage Builds',
          'CI/CD Pipelines, GitHub Actions & Edge Deployments',
        ],
      },
    ],
  },
];

/**
 * Parses raw text input into clean topic lines.
 * Handles numbered bullets, markdown dashes, asterisks, and empty lines.
 */
export function extractTopicsFromText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const topics: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove leading numbering like "1.", "1)", "[1]", "Day 1:", "-", "*", "•"
    const cleaned = trimmed
      .replace(/^(\d+[.)]|\[\d+\]|day\s*\d+[:-]?|[-*•#+])\s*/i, '')
      .trim();

    if (cleaned.length >= 3) {
      topics.push(cleaned);
    }
  }

  return topics;
}

/**
 * Decomposes a list of topics into a structured sequence across the desired day count.
 * Includes strategic spaced-repetition review days at Days 7, 14, 21, and the final day.
 *
 * @param topics - List of extracted topic titles
 * @param totalDays - 15, 30, or 60 days
 * @param startDate - Starting Date (defaults to today)
 * @param moduleName - Default module/category label
 */
export function decomposeIntoDailySequence(
  topics: string[],
  totalDays: number = 30,
  startDate: Date = new Date(),
  moduleName: string = 'Syllabus'
): SyllabusItem[] {
  if (topics.length === 0) return [];

  const sequence: SyllabusItem[] = [];
  const baseDate = new Date(startDate);
  baseDate.setHours(0, 0, 0, 0);

  let topicIndex = 0;

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + (day - 1));
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayOfMonth}`;

    // Strategic review days at day 7, 14, 21, and last day (if 30 days)
    const isReview = (day % 7 === 0 || day === totalDays) && day > 1;

    if (isReview) {
      const priorCount = Math.min(3, topicIndex);
      const priorTopics = topics.slice(Math.max(0, topicIndex - priorCount), topicIndex).join(', ');
      sequence.push({
        day,
        dateStr,
        topic: `⚡ Spaced Repetition Review: Retest & Solidify (${priorTopics || 'Recent Modules'})`,
        module: moduleName,
        durationMinutes: 30,
        timeBlock: 'morning',
        isReviewDay: true,
      });
    } else {
      const currentTopic = topics[topicIndex % topics.length];
      topicIndex++;

      // Alternating optimal time blocks for circadian balance
      const timeBlock = day % 3 === 1 ? 'morning' : day % 3 === 2 ? 'afternoon' : 'evening';

      sequence.push({
        day,
        dateStr,
        topic: currentTopic,
        module: moduleName,
        durationMinutes: 25,
        timeBlock,
        isReviewDay: false,
      });
    }
  }

  return sequence;
}

/**
 * Converts a curated blueprint into a unified topic list with module metadata.
 */
export function getBlueprintTopics(blueprintId: string): { topic: string; module: string }[] {
  const blueprint = CURATED_BLUEPRINTS.find((b) => b.id === blueprintId) || CURATED_BLUEPRINTS[0];
  const list: { topic: string; module: string }[] = [];

  for (const mod of blueprint.modules) {
    for (const top of mod.topics) {
      list.push({ topic: top, module: mod.name });
    }
  }

  return list;
}
