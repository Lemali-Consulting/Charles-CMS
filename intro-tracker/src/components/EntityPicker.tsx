"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

export interface PickerItem {
  id: number;
  label: string;
}

interface EntityPickerProps {
  items: PickerItem[];
  value: number | 0;
  onChange: (id: number) => void;
  excludeIds?: number[];
  placeholder?: string;
}

export default function EntityPicker({
  items,
  value,
  onChange,
  excludeIds = [],
  placeholder = "Type to search...",
}: EntityPickerProps) {
  const selected = useMemo(
    () => (value ? items.find((i) => i.id === value) ?? null : null),
    [items, value]
  );
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = items.filter((i) => !excludeIds.includes(i.id) && i.id !== value);
    if (!q) return pool.slice(0, 8);
    return pool.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8);
  }, [items, excludeIds, value, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, isOpen]);

  const select = useCallback(
    (item: PickerItem) => {
      onChange(item.id);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      return;
    }
    if (!isOpen || filtered.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        select(filtered[highlightIndex]);
        break;
    }
  }

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function clear() {
    onChange(0);
    setQuery("");
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {selected ? (
        <div className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm flex items-center gap-2 bg-white">
          <span className="flex-1 truncate">{selected.label}</span>
          <button
            type="button"
            onClick={clear}
            className="text-gray-400 hover:text-red-600"
            aria-label="Clear selection"
          >
            &times;
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          role="combobox"
          aria-expanded={isOpen && filtered.length > 0}
          aria-autocomplete="list"
          aria-controls="entity-picker-listbox"
          autoComplete="off"
        />
      )}
      {!selected && isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id="entity-picker-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === highlightIndex}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                i === highlightIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(item);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
      {!selected && isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
          No matches
        </div>
      )}
    </div>
  );
}
