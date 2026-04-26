// Tests for component-registry PraxisModule

import { describe, it, expect } from "vitest";
import { createPraxisEngine, PraxisRegistry } from "@plures/praxis";
import {
  componentRegistryModule,
  RegisterComponentEvent,
  UnregisterComponentEvent,
  CheckPortCompatibilityEvent,
  COMPONENT_REGISTERED_FACT,
  COMPONENT_UNREGISTERED_FACT,
  PORT_COMPATIBLE_FACT,
  PORT_INCOMPATIBLE_FACT,
} from "../component-registry";
import type { ComponentRegistryContext } from "../component-registry";

function makeEngine(components: ComponentRegistryContext["components"] = {}) {
  const registry = new PraxisRegistry<ComponentRegistryContext>();
  registry.registerModule(componentRegistryModule);
  return createPraxisEngine<ComponentRegistryContext>({
    initialContext: { components, portCompatibilityResult: null },
    registry,
  });
}

describe("component-registry module", () => {
  describe("registerComponent", () => {
    it("adds a component to the registry", () => {
      const engine = makeEngine();
      const result = engine.step([
        RegisterComponentEvent.create({
          type: "terminal",
          label: "Terminal",
          ports: [{ id: "stdout", direction: "output", dataType: "string" }],
        }),
      ]);
      const regFact = result.state.facts.find(
        (f) => f.tag === COMPONENT_REGISTERED_FACT,
      );
      expect(regFact).toBeDefined();
      expect(engine.getContext().components["terminal"]).toBeDefined();
      expect(engine.getContext().components["terminal"].lifecycle).toBe(
        "registered",
      );
    });
  });

  describe("unregisterComponent", () => {
    it("marks a component as removed", () => {
      const engine = makeEngine({
        terminal: {
          type: "terminal",
          label: "Terminal",
          ports: [],
          lifecycle: "active",
        },
      });
      const result = engine.step([
        UnregisterComponentEvent.create({ type: "terminal" }),
      ]);
      const unregFact = result.state.facts.find(
        (f) => f.tag === COMPONENT_UNREGISTERED_FACT,
      );
      expect(unregFact).toBeDefined();
      expect(engine.getContext().components["terminal"].lifecycle).toBe(
        "removed",
      );
    });
  });

  describe("checkPortCompatibility", () => {
    const baseComponents: ComponentRegistryContext["components"] = {
      input: {
        type: "input",
        label: "Input",
        ports: [{ id: "value", direction: "output", dataType: "string" }],
        lifecycle: "registered",
      },
      display: {
        type: "display",
        label: "Display",
        ports: [{ id: "content", direction: "input", dataType: "string" }],
        lifecycle: "registered",
      },
      transform: {
        type: "transform",
        label: "Transform",
        ports: [
          { id: "in", direction: "input", dataType: "number" },
          { id: "out", direction: "output", dataType: "string" },
        ],
        lifecycle: "registered",
      },
    };

    it("emits PORT_COMPATIBLE for matching types", () => {
      const engine = makeEngine(baseComponents);
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "input",
          fromPortId: "value",
          toComponentType: "display",
          toPortId: "content",
        }),
      ]);
      const compat = result.state.facts.find(
        (f) => f.tag === PORT_COMPATIBLE_FACT,
      );
      expect(compat).toBeDefined();
      expect(engine.getContext().portCompatibilityResult?.compatible).toBe(
        true,
      );
    });

    it("emits PORT_INCOMPATIBLE for mismatched types", () => {
      const engine = makeEngine(baseComponents);
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "input",
          fromPortId: "value",
          toComponentType: "transform",
          toPortId: "in",
        }),
      ]);
      const incompat = result.state.facts.find(
        (f) => f.tag === PORT_INCOMPATIBLE_FACT,
      );
      expect(incompat).toBeDefined();
      expect((incompat?.payload as any).reason).toBe("type-mismatch");
    });

    it("emits PORT_INCOMPATIBLE for unknown component", () => {
      const engine = makeEngine(baseComponents);
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "ghost",
          fromPortId: "out",
          toComponentType: "display",
          toPortId: "content",
        }),
      ]);
      const incompat = result.state.facts.find(
        (f) => f.tag === PORT_INCOMPATIBLE_FACT,
      );
      expect(incompat).toBeDefined();
      expect((incompat?.payload as any).reason).toBe("unknown-from-component");
    });

    it("emits PORT_INCOMPATIBLE for removed component", () => {
      const engine = makeEngine({
        ...baseComponents,
        removed: {
          type: "removed",
          label: "Removed",
          ports: [{ id: "out", direction: "output" }],
          lifecycle: "removed",
        },
      });
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "removed",
          fromPortId: "out",
          toComponentType: "display",
          toPortId: "content",
        }),
      ]);
      const incompat = result.state.facts.find(
        (f) => f.tag === PORT_INCOMPATIBLE_FACT,
      );
      expect(incompat).toBeDefined();
    });

    it("emits PORT_INCOMPATIBLE when output port does not exist", () => {
      const engine = makeEngine(baseComponents);
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "input",
          fromPortId: "nonexistent",
          toComponentType: "display",
          toPortId: "content",
        }),
      ]);
      const incompat = result.state.facts.find(
        (f) => f.tag === PORT_INCOMPATIBLE_FACT,
      );
      expect(incompat).toBeDefined();
      expect((incompat?.payload as any).reason).toBe("missing-output-port");
    });

    it("accepts untyped ports (any → any)", () => {
      const engine = makeEngine({
        src: {
          type: "src",
          label: "Source",
          ports: [{ id: "out", direction: "output" }],
          lifecycle: "registered",
        },
        dst: {
          type: "dst",
          label: "Dest",
          ports: [{ id: "in", direction: "input" }],
          lifecycle: "registered",
        },
      });
      const result = engine.step([
        CheckPortCompatibilityEvent.create({
          fromComponentType: "src",
          fromPortId: "out",
          toComponentType: "dst",
          toPortId: "in",
        }),
      ]);
      const compat = result.state.facts.find(
        (f) => f.tag === PORT_COMPATIBLE_FACT,
      );
      expect(compat).toBeDefined();
    });
  });
});
