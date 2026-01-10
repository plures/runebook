// Tests for event capture system

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initCapture, stopCapture, captureCommand, captureResult, isCaptureEnabled } from '../capture';

describe('Event Capture', () => {
  beforeEach(() => {
    stopCapture();
  });

  afterEach(() => {
    stopCapture();
  });

  it('should initialize capture with session ID', () => {
    initCapture('test-session', {
      workingDirectory: '/test',
      environment: { TEST: 'value' },
    });

    expect(isCaptureEnabled()).toBe(true);
  });

  it('should capture command execution', () => {
    initCapture('test-session');
    const startTime = Date.now();
    
    const event = captureCommand('echo', ['hello'], {}, '/test', startTime);
    
    expect(event.id).toBeDefined();
    expect(event.command).toBe('echo');
    expect(event.args).toEqual(['hello']);
    expect(event.timestamp).toBe(startTime);
    expect(event.success).toBe(false);
  });

  it('should capture command result', () => {
    initCapture('test-session');
    const startTime = Date.now();
    const event = captureCommand('echo', ['hello'], {}, '/test', startTime);
    
    const endTime = startTime + 100;
    const completed = captureResult(event, 'hello\n', '', 0, endTime);
    
    expect(completed.stdout).toBe('hello\n');
    expect(completed.exitCode).toBe(0);
    expect(completed.duration).toBe(100);
    expect(completed.success).toBe(true);
  });

  it('should not capture when disabled', () => {
    expect(isCaptureEnabled()).toBe(false);
    
    expect(() => {
      captureCommand('echo', [], {}, '/test', Date.now());
    }).toThrow('Capture not initialized');
  });

  it('should stop capture', () => {
    initCapture('test-session');
    expect(isCaptureEnabled()).toBe(true);
    
    stopCapture();
    expect(isCaptureEnabled()).toBe(false);
  });
});

