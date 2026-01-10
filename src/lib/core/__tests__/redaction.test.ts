// Unit tests for secret redaction utilities

import { describe, it, expect } from 'vitest';
import {
  sanitizeEnv,
  redactSecretsFromText,
  isSecretKey,
  redactValue,
  validateRedaction,
} from '../redaction';

describe('redaction', () => {
  describe('isSecretKey', () => {
    it('should detect secret keys', () => {
      expect(isSecretKey('API_KEY')).toBe(true);
      expect(isSecretKey('TOKEN')).toBe(true);
      expect(isSecretKey('SECRET')).toBe(true);
      expect(isSecretKey('PASSWORD')).toBe(true);
      expect(isSecretKey('AUTH_TOKEN')).toBe(true);
      expect(isSecretKey('PRIVATE_KEY')).toBe(true);
    });

    it('should not detect normal keys', () => {
      expect(isSecretKey('PATH')).toBe(false);
      expect(isSecretKey('HOME')).toBe(false);
      expect(isSecretKey('USER')).toBe(false);
      expect(isSecretKey('SHELL')).toBe(false);
    });

    it('should support custom patterns', () => {
      expect(isSecretKey('MY_SECRET', ['MY_SECRET'])).toBe(true);
      expect(isSecretKey('CUSTOM_TOKEN', ['CUSTOM_TOKEN'])).toBe(true);
    });
  });

  describe('redactValue', () => {
    it('should redact short values', () => {
      expect(redactValue('abc123')).toBe('[REDACTED]');
      expect(redactValue('')).toBe('');
    });

    it('should redact long values with partial reveal', () => {
      const value = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
      const redacted = redactValue(value);
      expect(redacted).toContain('...');
      expect(redacted).not.toBe(value);
      expect(redacted.length).toBeLessThan(value.length);
    });
  });

  describe('sanitizeEnv', () => {
    it('should redact secret environment variables', () => {
      const env = {
        PATH: '/usr/bin:/usr/local/bin',
        HOME: '/home/user',
        API_KEY: 'sk-1234567890abcdef',
        TOKEN: 'secret-token-value',
        NORMAL_VAR: 'normal-value',
      };

      const sanitized = sanitizeEnv(env);

      // Secrets should be redacted
      expect(sanitized.API_KEY).not.toBe(env.API_KEY);
      expect(sanitized.TOKEN).not.toBe(env.TOKEN);
      expect(sanitized.API_KEY).toContain('[REDACTED]');
      expect(sanitized.TOKEN).toContain('[REDACTED]');

      // Normal vars should be preserved
      expect(sanitized.PATH).toBe(env.PATH);
      expect(sanitized.HOME).toBe(env.HOME);
      expect(sanitized.NORMAL_VAR).toBe(env.NORMAL_VAR);
    });

    it('should support custom patterns', () => {
      const env = {
        MY_CUSTOM_SECRET: 'secret-value',
        NORMAL_VAR: 'normal-value',
      };

      const sanitized = sanitizeEnv(env, ['MY_CUSTOM_SECRET']);

      expect(sanitized.MY_CUSTOM_SECRET).not.toBe(env.MY_CUSTOM_SECRET);
      expect(sanitized.NORMAL_VAR).toBe(env.NORMAL_VAR);
    });
  });

  describe('redactSecretsFromText', () => {
    it('should redact secrets in text output', () => {
      const text = 'API_KEY=sk-1234567890abcdef\nTOKEN=bearer-token-value';
      const redacted = redactSecretsFromText(text);

      expect(redacted).not.toContain('sk-1234567890abcdef');
      expect(redacted).not.toContain('bearer-token-value');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact bearer tokens', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactSecretsFromText(text);

      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should preserve non-secret text', () => {
      const text = 'This is normal output without secrets';
      const redacted = redactSecretsFromText(text);

      expect(redacted).toBe(text);
    });

    it('should support custom patterns', () => {
      const text = 'MY_SECRET=value123';
      const redacted = redactSecretsFromText(text, ['MY_SECRET']);

      expect(redacted).not.toContain('value123');
      expect(redacted).toContain('[REDACTED]');
    });
  });

  describe('validateRedaction', () => {
    it('should validate that redaction is working', () => {
      expect(validateRedaction()).toBe(true);
    });
  });
});

