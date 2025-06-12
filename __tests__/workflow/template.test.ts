import { substituteObject, substituteVariables, extractMissingVariables } from '@/app/lib/workflow/template';

describe('Template helpers', () => {
  let vars: Record<string, string>;

  beforeEach(() => {
    vars = { a: '1', b: '2' };
  });

  afterEach(() => {
    vars = {};
  });

  test('substituteVariables replaces placeholders', () => {
    const result = substituteVariables('foo {a} bar', vars);
    expect(result).toBe('foo 1 bar');
  });

  test('substituteObject handles nested structures', () => {
    const obj = { val: '{a}', nested: { other: '{b}' } };
    expect(substituteObject(obj, vars)).toEqual({ val: '1', nested: { other: '2' } });
  });

  test('extractMissingVariables finds unknown variables', () => {
    expect(extractMissingVariables('missing {c}', vars)).toEqual(['c']);
  });
});
