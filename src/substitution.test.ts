import { describe, expect, it } from 'vitest';
import { replaceTokens } from './substitution.js';

const vars = (...tokens: string[]) => tokens.map((token) => ({ token }));

describe('replaceTokens', () => {
  it('inserts $ patterns literally', () => {
    expect(replaceTokens('a {{n}} b', vars('n'), { n: "$' $$ $& $`" })).toBe("a $' $$ $& $` b");
  });

  it('does not scan inserted values for later tokens', () => {
    expect(replaceTokens('{{a}}|{{b}}', vars('a', 'b'), { a: 'x {{b}}', b: 'SECRET' })).toBe(
      'x {{b}}|SECRET',
    );
  });

  it('ignores empty tokens, leaves unknown placeholders, and uses defaults', () => {
    expect(replaceTokens('{{}} {{z}} {{d}}', [{ token: '' }, { token: 'd', defaultValue: 'D' }], {})).toBe(
      '{{}} {{z}} D',
    );
  });

  it('escapes regex characters in tokens', () => {
    expect(replaceTokens('{{a.b}} {{axb}}', vars('a.b'), { 'a.b': 'ok' })).toBe('ok {{axb}}');
  });
});
