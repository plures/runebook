// Tests for execution-policy PraxisModule

import { describe, it, expect } from "vitest";
import { createPraxisEngine, PraxisRegistry } from "@plures/praxis";
import {
  executionPolicyModule,
  ScheduleExecutionEvent,
  DetectCyclesEvent,
  ReportElapsedEvent,
  EXECUTION_ORDER_FACT,
  CYCLE_DETECTED_FACT,
  GRAPH_ACYCLIC_FACT,
  TIMEOUT_EXCEEDED_FACT,
} from "../execution-policy";
import type {
  ExecutionPolicyContext,
  ExecutionEdge,
} from "../execution-policy";

function makeEngine(
  nodes: string[] = [],
  edges: ExecutionEdge[] = [],
  timeouts: Record<string, number> = {},
) {
  const registry = new PraxisRegistry<ExecutionPolicyContext>();
  registry.registerModule(executionPolicyModule);
  return createPraxisEngine<ExecutionPolicyContext>({
    initialContext: {
      nodes,
      edges,
      executionOrder: [],
      hasCycles: false,
      timeouts,
      elapsed: {},
    },
    registry,
  });
}

describe("execution-policy module", () => {
  describe("scheduleExecution — topological sort", () => {
    it("produces a valid topological order for a linear graph", () => {
      // n1 → n2 → n3
      const engine = makeEngine(
        ["n1", "n2", "n3"],
        [
          { from: "n1", to: "n2" },
          { from: "n2", to: "n3" },
        ],
      );
      const result = engine.step([ScheduleExecutionEvent.create({})]);
      const orderFact = result.state.facts.find(
        (f) => f.tag === EXECUTION_ORDER_FACT,
      );
      expect(orderFact).toBeDefined();
      const order = (orderFact?.payload as any).order as string[];
      expect(order.indexOf("n1")).toBeLessThan(order.indexOf("n2"));
      expect(order.indexOf("n2")).toBeLessThan(order.indexOf("n3"));
    });

    it("produces a valid order for a diamond graph", () => {
      // n1 → n2, n1 → n3, n2 → n4, n3 → n4
      const engine = makeEngine(
        ["n1", "n2", "n3", "n4"],
        [
          { from: "n1", to: "n2" },
          { from: "n1", to: "n3" },
          { from: "n2", to: "n4" },
          { from: "n3", to: "n4" },
        ],
      );
      const result = engine.step([ScheduleExecutionEvent.create({})]);
      const orderFact = result.state.facts.find(
        (f) => f.tag === EXECUTION_ORDER_FACT,
      );
      expect(orderFact).toBeDefined();
      const order = (orderFact?.payload as any).order as string[];
      expect(order[0]).toBe("n1");
      expect(order[order.length - 1]).toBe("n4");
    });

    it("handles isolated nodes", () => {
      const engine = makeEngine(["n1", "n2"], []);
      const result = engine.step([ScheduleExecutionEvent.create({})]);
      const orderFact = result.state.facts.find(
        (f) => f.tag === EXECUTION_ORDER_FACT,
      );
      expect(orderFact).toBeDefined();
      expect((orderFact?.payload as any).order).toHaveLength(2);
    });

    it("detects a cycle and sets hasCycles=true", () => {
      // n1 → n2 → n3 → n1 (cycle)
      const engine = makeEngine(
        ["n1", "n2", "n3"],
        [
          { from: "n1", to: "n2" },
          { from: "n2", to: "n3" },
          { from: "n3", to: "n1" },
        ],
      );
      const result = engine.step([ScheduleExecutionEvent.create({})]);
      const cycleFact = result.state.facts.find(
        (f) => f.tag === CYCLE_DETECTED_FACT,
      );
      expect(cycleFact).toBeDefined();
      expect(engine.getContext().hasCycles).toBe(true);
    });
  });

  describe("detectCycles", () => {
    it("emits GRAPH_ACYCLIC_FACT for an acyclic graph", () => {
      const engine = makeEngine(["a", "b"], [{ from: "a", to: "b" }]);
      const result = engine.step([DetectCyclesEvent.create({})]);
      const acyclicFact = result.state.facts.find(
        (f) => f.tag === GRAPH_ACYCLIC_FACT,
      );
      expect(acyclicFact).toBeDefined();
    });

    it("emits CYCLE_DETECTED_FACT for a cyclic graph", () => {
      const engine = makeEngine(
        ["a", "b"],
        [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
        ],
      );
      const result = engine.step([DetectCyclesEvent.create({})]);
      const cycleFact = result.state.facts.find(
        (f) => f.tag === CYCLE_DETECTED_FACT,
      );
      expect(cycleFact).toBeDefined();
    });
  });

  describe("timeout enforcement", () => {
    it("does not emit TIMEOUT_EXCEEDED when within budget", () => {
      const engine = makeEngine(["n1"], [], { n1: 5000 });
      const result = engine.step([
        ReportElapsedEvent.create({ nodeId: "n1", elapsedMs: 1000 }),
      ]);
      const timeoutFact = result.state.facts.find(
        (f) => f.tag === TIMEOUT_EXCEEDED_FACT,
      );
      expect(timeoutFact).toBeUndefined();
    });

    it("emits TIMEOUT_EXCEEDED when elapsed exceeds budget", () => {
      const engine = makeEngine(["n1"], [], { n1: 500 });
      const result = engine.step([
        ReportElapsedEvent.create({ nodeId: "n1", elapsedMs: 1200 }),
      ]);
      const timeoutFact = result.state.facts.find(
        (f) => f.tag === TIMEOUT_EXCEEDED_FACT,
      );
      expect(timeoutFact).toBeDefined();
      expect((timeoutFact?.payload as any).nodeId).toBe("n1");
    });

    it("does not emit TIMEOUT_EXCEEDED when budget is 0 (unlimited)", () => {
      const engine = makeEngine(["n1"], [], { n1: 0 });
      const result = engine.step([
        ReportElapsedEvent.create({ nodeId: "n1", elapsedMs: 99999 }),
      ]);
      const timeoutFact = result.state.facts.find(
        (f) => f.tag === TIMEOUT_EXCEEDED_FACT,
      );
      expect(timeoutFact).toBeUndefined();
    });
  });
});
