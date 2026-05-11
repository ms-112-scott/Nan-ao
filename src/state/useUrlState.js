import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * URL ↔ React state 雙向同步。
 * params: { key: { default, parse, serialize } }
 *   parse: string -> value
 *   serialize: value -> string ('' or null 表移除參數)
 */
export function useUrlState(params) {
  const initialRead = useCallback(() => {
    const sp = new URLSearchParams(window.location.search);
    const out = {};
    for (const [key, cfg] of Object.entries(params)) {
      const raw = sp.get(key);
      out[key] = raw == null ? cfg.default : cfg.parse(raw);
    }
    return out;
  }, [params]);

  const [state, setState] = useState(initialRead);
  const skipNext = useRef(false);

  // state -> URL
  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    const sp = new URLSearchParams(window.location.search);
    for (const [key, cfg] of Object.entries(params)) {
      const v = state[key];
      const s = cfg.serialize(v);
      if (s == null || s === '' || s === cfg.serialize(cfg.default)) sp.delete(key);
      else sp.set(key, s);
    }
    const qs = sp.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(null, '', url);
    }
  }, [state, params]);

  // popstate -> state
  useEffect(() => {
    const onPop = () => {
      skipNext.current = true;
      setState(initialRead());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initialRead]);

  return [state, setState];
}

// 常用 codec
export const codecs = {
  string: { parse: (s) => s, serialize: (v) => (v ?? '') },
  bool: { parse: (s) => s === '1', serialize: (v) => (v ? '1' : '') },
  int: { parse: (s) => parseInt(s, 10), serialize: (v) => (v == null ? '' : String(v)) },
  intRange: {
    parse: (s) => s.split('-').map((x) => parseInt(x, 10)),
    serialize: (v) => (Array.isArray(v) ? `${v[0]}-${v[1]}` : ''),
  },
  setOfStrings: {
    parse: (s) => new Set(s.split(',').filter(Boolean).map(decodeURIComponent)),
    serialize: (v) => {
      if (!v || v.size === 0) return '';
      return Array.from(v).map(encodeURIComponent).join(',');
    },
  },
};
