import { describe, expect, it } from 'vitest';
import { buildContractDocxBlob } from './exportContractDocx';

describe('buildContractDocxBlob', () => {
  it('returns a non-empty docx blob', async () => {
    const blob = await buildContractDocxBlob({
      documentTitle: 'Test title',
      templateLabel: 'Sample template',
      versionLabel: 'v1.0',
      clauses: [
        {
          num: '§1',
          title: 'Purpose',
          state: 'approved',
          body: 'Hello world.\nSecond line.',
        },
      ],
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(2000);
    expect(blob.type).toMatch(/wordprocessingml|octet-stream/i);
  });
});
