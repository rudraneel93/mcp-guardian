import { describe, it, expect } from 'vitest';
import {
  evaluateUrlGuard,
  extractUrlArgumentValues,
  isDangerousUrl,
} from '../../src/policy/url-guard.js';

describe('url-guard', () => {
  it('blocks metadata IP', () => {
    expect(isDangerousUrl('http://169.254.169.254/').block).toBe(true);
  });

  it('blocks decimal localhost', () => {
    expect(isDangerousUrl('http://2130706433/').block).toBe(true);
  });

  it('blocks octal-dotted localhost', () => {
    expect(isDangerousUrl('http://0177.0.0.1/admin').block).toBe(true);
  });

  it('blocks percent-encoded loopback', () => {
    expect(isDangerousUrl('http://%31%32%37.%30.%30.%31/').block).toBe(true);
  });

  it('blocks file scheme', () => {
    expect(isDangerousUrl('file:///etc/passwd').block).toBe(true);
  });

  it('allows public https URL', () => {
    expect(evaluateUrlGuard(['https://example.com/path']).block).toBe(false);
  });

  it('blocks full RFC1918 ranges', () => {
    expect(isDangerousUrl('http://10.0.0.5/internal').block).toBe(true);
    expect(isDangerousUrl('http://172.16.0.1/api').block).toBe(true);
    expect(isDangerousUrl('http://192.168.0.1/dashboard').block).toBe(true);
    expect(isDangerousUrl('http://169.254.169.254/').block).toBe(true);
  });

  it('extracts URLs from message and body freetext fields', () => {
    const urls = extractUrlArgumentValues({
      message: 'See http://127.0.0.1:6379',
      body: 'no url here',
    });
    expect(urls.join(' ')).toContain('127.0.0.1');
  });
});
