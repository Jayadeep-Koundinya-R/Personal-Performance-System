import { describe, it, expect, vi, beforeEach } from "vitest";

// Interface representing the stroke packet transmitted over Supabase Realtime
export interface WhiteboardStrokePayload {
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  color: string;
  lineWidth: number;
  tool: "pen" | "eraser";
}

// Simulated Whiteboard synchronization client
export class SimulatedWhiteboardClient {
  public canvasOperations: string[] = [];
  public currentTool: "pen" | "eraser" = "pen";
  public currentColor: string = "#ffffff";
  public currentWidth: number = 3;
  public isBoardCleared: boolean = false;
  private broadcastListener?: (event: string, payload: any) => void;

  constructor(public userId: string, public groupId: string) {}

  public subscribe(broadcastHandler: (event: string, payload: any) => void) {
    this.broadcastListener = broadcastHandler;
  }

  // User performs a local drawing action and sends broadcast
  public drawSegment(
    prevX: number,
    prevY: number,
    x: number,
    y: number,
    emitToPeer?: (event: string, payload: any) => void
  ): WhiteboardStrokePayload {
    const payload: WhiteboardStrokePayload = {
      prevX,
      prevY,
      x,
      y,
      color: this.currentColor,
      lineWidth: this.currentWidth,
      tool: this.currentTool,
    };

    // Apply locally
    this.applyStroke(payload);

    // Broadcast to peers
    if (emitToPeer) {
      emitToPeer("draw_segment", payload);
    }

    return payload;
  }

  // Receive and apply remote stroke from peer
  public applyStroke(payload: WhiteboardStrokePayload) {
    this.isBoardCleared = false;
    const strokeStyle = payload.tool === "eraser" ? "#12131a" : payload.color;
    const effectiveWidth = payload.tool === "eraser" ? payload.lineWidth * 4 : payload.lineWidth;
    this.canvasOperations.push(
      `stroke: (${payload.prevX},${payload.prevY})->(${payload.x},${payload.y}) [style=${strokeStyle}, width=${effectiveWidth}]`
    );
  }

  // User clears the board
  public clearBoard(emitToPeer?: (event: string, payload: any) => void) {
    this.isBoardCleared = true;
    this.canvasOperations.push("clear_board");
    if (emitToPeer) {
      emitToPeer("clear_board", {});
    }
  }

  // Receive remote clear event
  public handleRemoteClear() {
    this.isBoardCleared = true;
    this.canvasOperations.push("remote_clear_board");
  }
}

describe("Task 12 Multi-User Realtime Whiteboard Synchronization", () => {
  let clientAlice: SimulatedWhiteboardClient;
  let clientBob: SimulatedWhiteboardClient;

  beforeEach(() => {
    clientAlice = new SimulatedWhiteboardClient("user_alice", "cohort_algorithms_101");
    clientBob = new SimulatedWhiteboardClient("user_bob", "cohort_algorithms_101");
  });

  it("12.1: User A draws a stroke segment and User B receives real-time broadcast", () => {
    // Connect User A broadcast directly to User B's receiver
    const peerBroadcaster = (event: string, payload: any) => {
      if (event === "draw_segment") {
        clientBob.applyStroke(payload);
      }
    };

    clientAlice.currentColor = "#00F5FF";
    clientAlice.currentWidth = 4;
    clientAlice.currentTool = "pen";

    const stroke = clientAlice.drawSegment(10, 20, 15, 25, peerBroadcaster);

    expect(stroke.color).toBe("#00F5FF");
    expect(stroke.lineWidth).toBe(4);
    expect(stroke.tool).toBe("pen");

    // Verify User A recorded the local stroke
    expect(clientAlice.canvasOperations.length).toBe(1);
    expect(clientAlice.canvasOperations[0]).toContain("(10,20)->(15,25)");

    // Verify User B received and executed the stroke in real time
    expect(clientBob.canvasOperations.length).toBe(1);
    expect(clientBob.canvasOperations[0]).toContain("(10,20)->(15,25)");
    expect(clientBob.canvasOperations[0]).toContain("style=#00F5FF");
    expect(clientBob.canvasOperations[0]).toContain("width=4");
  });

  it("12.2: User A switches to eraser and User B receives adjusted eraser width & style", () => {
    const peerBroadcaster = (event: string, payload: any) => {
      if (event === "draw_segment") {
        clientBob.applyStroke(payload);
      }
    };

    clientAlice.currentTool = "eraser";
    clientAlice.currentWidth = 5;

    clientAlice.drawSegment(50, 60, 55, 65, peerBroadcaster);

    // Eraser stroke width is 4x the normal stroke width for smooth erasing
    expect(clientBob.canvasOperations[0]).toContain("style=#12131a");
    expect(clientBob.canvasOperations[0]).toContain("width=20");
  });

  it("12.3: User A triggers clear_board and User B's canvas resets synchronously", () => {
    const peerBroadcaster = (event: string, payload: any) => {
      if (event === "clear_board") {
        clientBob.handleRemoteClear();
      }
    };

    // Both draw first
    clientAlice.drawSegment(0, 0, 10, 10);
    clientBob.applyStroke({
      prevX: 0,
      prevY: 0,
      x: 10,
      y: 10,
      color: "#fff",
      lineWidth: 2,
      tool: "pen",
    });

    expect(clientBob.isBoardCleared).toBe(false);

    // Alice clears the board
    clientAlice.clearBoard(peerBroadcaster);

    expect(clientAlice.isBoardCleared).toBe(true);
    expect(clientBob.isBoardCleared).toBe(true);
    expect(clientBob.canvasOperations).toContain("remote_clear_board");
  });
});
