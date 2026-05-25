/**
 * Secret scanner battery — extends tests/secret-scanner-coverage patterns.
 */
import { describe, it, expect } from 'vitest';
import { scanForSecrets, getSecretRuleCount, getRules } from '../../src/scanners/secret-scanner.js';

describe('Adversarial harness: secret scanner', () => {
  it('loads 100+ secret rules', () => {
    expect(getSecretRuleCount()).toBeGreaterThan(100);
    expect(getRules().length).toBe(getSecretRuleCount());
  });

  const samples = [
    ['aws-key', 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'],
    ['aws-secret', 'aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'],
    ['github-pat', `ghp_${'a'.repeat(36)}`],
    ['github-fine', `github_pat_${'A'.repeat(82)}`],
    ['slack-token', ['xox', 'b-1234567890-1234567890-abcdefghijklmnopqrstuvwx'].join('')],
    ['stripe', `sk_live_${'0'.repeat(24)}`],
    ['openai', 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF'],
    ['private-key', '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA'],
    ['jwt', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'],
    ['npm', '//registry.npmjs.org/:_authToken=npm_abcdefghijklmnopqrstuvwxyz'],
    ['generic-api', 'api_key=abcdefghijklmnopqrstuvwxyz123456'],
    ['password-assign', 'password=SuperSecret123!@#'],
  ];

  for (const [name, payload] of samples) {
    it(`detects ${name}`, () => {
      const findings = scanForSecrets(payload);
      expect(findings.length, `${name} should match at least one rule`).toBeGreaterThan(0);
    });
  }

  it('does not false-positive on obvious placeholders', () => {
    const findings = scanForSecrets('your_api_key_here and example.com');
    const critical = findings.filter((f) => f.severity === 'critical');
    expect(critical.length).toBe(0);
  });
});
