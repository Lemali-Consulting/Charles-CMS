"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Person {
  id: number;
  first_name: string;
  last_name: string;
}

interface PersonTypeaheadProps {
  people: Person[];
  excludeIds?: number[];
  placeholder?: string;
  onSelect: (person: Person) => void;
}

export default function PersonTypeahead({
  people,
  excludeIds = [],
  placeholder = "Type a name...",
  onSelect,
}: PersonTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? people
        .filter((p) => !excludeIds.includes(p.id))
        .filter((p) => {
          const q = query.toLowerCase();
          const full = `${p.first_name} ${p.last_name}`.toLowerCase();
          return (
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            full.includes(q)
          );
        })
        .slice(0, 8)
    : [];

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const select = useCallback(
    (person: Person) => {
      onSelect(person);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || filtered.length === 0) {
      if (e.key === "Escape") {
        setQuery("");
        setIsOpen(false);
      }
      return;
    }
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
      case "Escape":
        setIsOpen(false);
        setQuery("");
        break;
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // Close on outside click
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        role="combobox"
        aria-expanded={isOpen && filtered.length > 0}
        aria-autocomplete="list"
        aria-controls="typeahead-listbox"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id="typeahead-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === highlightIndex}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                i === highlightIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(p);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {p.first_name} {p.last_name}
            </li>
          ))}
        </ul>
      )}
      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
          No matches
        </div>
      )}
    </div>
  );
}
