import { renderHook, act } from '@testing-library/react';
import { useFormState } from './use-form-state';

type TestForm = { name: string; age: number; notes?: string };

const DEFAULTS: TestForm = { name: '', age: 0, notes: undefined };

describe('useFormState', () => {
  it('initializes form with defaults', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    expect(result.current.form).toEqual(DEFAULTS);
  });

  it('initializes errors as empty', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    expect(result.current.errors).toEqual({});
  });

  it('merges initial values over defaults on init', () => {
    const { result } = renderHook(() =>
      useFormState(DEFAULTS, { name: 'Ryan', age: 30 }),
    );
    expect(result.current.form).toEqual({ name: 'Ryan', age: 30, notes: undefined });
  });

  it('setField updates the specified field', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => result.current.setField('name', 'Alice'));
    expect(result.current.form.name).toBe('Alice');
  });

  it('setField clears the error for that field', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => result.current.setErrors({ name: 'Name is required.' }));
    act(() => result.current.setField('name', 'Alice'));
    expect(result.current.errors.name).toBeUndefined();
  });

  it('setField does not clear errors for other fields', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => result.current.setErrors({ name: 'Required', age: 'Must be positive' }));
    act(() => result.current.setField('name', 'Alice'));
    expect(result.current.errors.age).toBe('Must be positive');
  });

  it('reset restores defaults and clears errors', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => {
      result.current.setField('name', 'changed');
      result.current.setErrors({ name: 'Required' });
    });
    act(() => result.current.reset(DEFAULTS));
    expect(result.current.form).toEqual(DEFAULTS);
    expect(result.current.errors).toEqual({});
  });

  it('reset merges initial values over new defaults', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => result.current.reset(DEFAULTS, { name: 'Ryan' }));
    expect(result.current.form.name).toBe('Ryan');
    expect(result.current.form.age).toBe(0);
  });

  it('setErrors exposes the state setter', () => {
    const { result } = renderHook(() => useFormState(DEFAULTS));
    act(() => result.current.setErrors({ name: 'Required', age: 'Invalid' }));
    expect(result.current.errors).toEqual({ name: 'Required', age: 'Invalid' });
  });
});
