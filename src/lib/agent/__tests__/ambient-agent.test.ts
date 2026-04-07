// Tests for agent/index.ts (AmbientAgent)

import { describe, it, expect, beforeEach } from "vitest";
import { AmbientAgent, createAgent, defaultAgentConfig } from "../index";
import type { AgentConfig } from "../../types/agent";

const enabledConfig: AgentConfig = {
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
  maxEvents: 100,
};

const disabledConfig: AgentConfig = {
  enabled: false,
  captureEvents: false,
  analyzePatterns: false,
  suggestImprovements: false,
};

describe("AmbientAgent", () => {
  let agent: AmbientAgent;

  beforeEach(() => {
    agent = new AmbientAgent(enabledConfig);
  });

  describe("constructor", () => {
    it("should create an agent with the given config", () => {
      expect(agent).toBeInstanceOf(AmbientAgent);
    });

    it("should create a disabled agent", () => {
      const disabledAgent = new AmbientAgent(disabledConfig);
      expect(disabledAgent).toBeInstanceOf(AmbientAgent);
    });
  });

  describe("captureAndAnalyze", () => {
    it("should capture a command and return a terminal event", async () => {
      const event = await agent.captureAndAnalyze(
        "echo",
        ["hello"],
        {},
        "/tmp",
        Date.now(),
      );
      expect(event.command).toBe("echo");
      expect(event.args).toEqual(["hello"]);
    });

    it("should throw when agent is not enabled", async () => {
      const disabled = new AmbientAgent(disabledConfig);
      await expect(
        disabled.captureAndAnalyze("echo", [], {}, "/tmp", Date.now()),
      ).rejects.toThrow();
    });
  });

  describe("recordResult", () => {
    it("should record a command result and return suggestions", async () => {
      const event = await agent.captureAndAnalyze(
        "echo",
        ["hello"],
        {},
        "/tmp",
        Date.now(),
      );
      const suggestions = await agent.recordResult(
        event,
        "hello\n",
        "",
        0,
        Date.now(),
      );
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should return empty array when agent is disabled", async () => {
      const disabled = new AmbientAgent(disabledConfig);
      const mockEvent = {
        id: "test",
        timestamp: Date.now(),
        command: "echo",
        args: [],
        env: {},
        cwd: "/tmp",
        success: false,
      };
      const suggestions = await disabled.recordResult(
        mockEvent,
        "out",
        "err",
        0,
        Date.now(),
      );
      expect(suggestions).toEqual([]);
    });
  });

  describe("getSuggestions", () => {
    it("should return empty array when no suggestions", () => {
      const suggestions = agent.getSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should filter by priority", () => {
      const suggestions = agent.getSuggestions("high");
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe("getSuggestionsCLI", () => {
    it("should return a string", () => {
      const result = agent.getSuggestionsCLI();
      expect(typeof result).toBe("string");
    });
  });

  describe("getSuggestionsForLastCommand", () => {
    it("should return empty array when no last command", () => {
      const suggestions = agent.getSuggestionsForLastCommand();
      expect(suggestions).toEqual([]);
    });
  });

  describe("getTopSuggestion", () => {
    it("should return an array of suggestions", () => {
      const top = agent.getTopSuggestion(1);
      expect(Array.isArray(top)).toBe(true);
    });
  });

  describe("analyzeAllPatterns", () => {
    it("should return suggestions", async () => {
      const suggestions = await agent.analyzeAllPatterns();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should return empty array when agent is disabled", async () => {
      const disabled = new AmbientAgent(disabledConfig);
      const suggestions = await disabled.analyzeAllPatterns();
      expect(suggestions).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return storage statistics", async () => {
      const stats = await agent.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalEvents).toBe("number");
    });
  });

  describe("getRecentEvents", () => {
    it("should return an array of events", async () => {
      const events = await agent.getRecentEvents(5);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("clearOldEvents", () => {
    it("should clear events without error", async () => {
      await expect(agent.clearOldEvents(7)).resolves.toBeUndefined();
    });
  });

  describe("stop", () => {
    it("should stop without throwing", () => {
      expect(() => agent.stop()).not.toThrow();
    });
  });

  describe("updateConfig", () => {
    it("should update the agent config", () => {
      agent.updateConfig({ enabled: false });
      // Agent should still be accessible
      expect(agent).toBeInstanceOf(AmbientAgent);
    });

    it("should re-enable capture when enabled config is set", () => {
      agent.updateConfig({ enabled: true, captureEvents: true });
      expect(agent).toBeInstanceOf(AmbientAgent);
    });
  });
});

describe("createAgent", () => {
  it("should create a new AmbientAgent instance", () => {
    const agent = createAgent(enabledConfig);
    expect(agent).toBeInstanceOf(AmbientAgent);
    agent.stop();
  });
});

describe("defaultAgentConfig", () => {
  it("should be disabled by default", () => {
    expect(defaultAgentConfig.enabled).toBe(false);
  });

  it("should have sensible defaults", () => {
    expect(defaultAgentConfig.captureEvents).toBe(true);
    expect(defaultAgentConfig.analyzePatterns).toBe(true);
    expect(defaultAgentConfig.suggestImprovements).toBe(true);
    expect(defaultAgentConfig.maxEvents).toBeGreaterThan(0);
  });
});
