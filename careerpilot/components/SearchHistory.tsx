"use client";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { X, Clock } from "lucide-react";

const STORAGE_KEY = "careerpilot_search_history";
const MAX_ITEMS = 7;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function saveHistory(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota exceeded */
  }
}

function addItem(items: string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return items;
  return [trimmed, ...items.filter((s) => s !== trimmed)].slice(0, MAX_ITEMS);
}

function removeItem(items: string[], query: string): string[] {
  return items.filter((s) => s !== query);
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-foreground">
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export interface SearchHistoryHandle {
  addToHistory: (query: string) => void;
}

interface SearchHistoryProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchHistory = forwardRef<SearchHistoryHandle, SearchHistoryProps>(
  ({ value, onChange, onSearch, placeholder, className }, ref) => {
    const [history, setHistory] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [removing, setRemoving] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setHistory(loadHistory());
    }, []);

    const persist = useCallback((items: string[]) => {
      setHistory(items);
      saveHistory(items);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        addToHistory(query: string) {
          if (query.trim()) {
            setHistory((prev) => addItem(prev, query));
          }
        },
      }),
      []
    );

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const shouldShowRecent = isOpen && value.length === 0;
    const shouldShowAutocomplete = isOpen && value.length >= 2;

    const filtered = shouldShowAutocomplete
      ? history.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
      : [];

    const dropdownItems = shouldShowAutocomplete
      ? filtered
      : shouldShowRecent
        ? history
        : [];

    const selectItem = useCallback(
      (item: string) => {
        const trimmed = item.trim();
        if (trimmed) {
          onChange(trimmed);
          onSearch(trimmed);
          setHistory((prev) => addItem(prev, trimmed));
        }
        setIsOpen(false);
        setFocusedIndex(-1);
      },
      [onChange, onSearch]
    );

    const deleteItem = useCallback(
      (item: string) => {
        setRemoving((prev) => new Set(prev).add(item));
        setTimeout(() => {
          setHistory((prev) => removeItem(prev, item));
          setRemoving((prev) => {
            const next = new Set(prev);
            next.delete(item);
            return next;
          });
        }, 200);
      },
      []
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        const items = shouldShowAutocomplete ? filtered : shouldShowRecent ? history : [];

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            if (dropdownItems.length > 0) {
              setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
            }
            break;
          case "ArrowUp":
            e.preventDefault();
            if (dropdownItems.length > 0) {
              setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
            }
            break;
          case "Enter":
            e.preventDefault();
            if (dropdownItems.length > 0 && focusedIndex >= 0 && focusedIndex < items.length) {
              selectItem(items[focusedIndex]);
            } else if (value.trim()) {
              onSearch(value);
              setHistory((prev) => addItem(prev, value));
              setIsOpen(false);
              setFocusedIndex(-1);
            }
            break;
          case "Escape":
            setIsOpen(false);
            setFocusedIndex(-1);
            inputRef.current?.blur();
            break;
        }
      },
      [
        shouldShowAutocomplete,
        shouldShowRecent,
        filtered,
        history,
        dropdownItems,
        focusedIndex,
        selectItem,
        value,
        onSearch,
      ]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setFocusedIndex(-1);
      if (!isOpen) setIsOpen(true);
    };

    return (
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60",
            className
          )}
        />

        {dropdownItems.length > 0 && isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border/60 bg-card p-1.5 shadow-lg backdrop-blur-sm"
          >
            {shouldShowRecent && (
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Recent Searches
              </div>
            )}
            {dropdownItems.map((item, idx) => (
              <div
                key={item}
                onClick={() => !removing.has(item) && selectItem(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  removing.has(item) && "pointer-events-none opacity-0 scale-95",
                  focusedIndex === idx
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted"
                )}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                {shouldShowRecent && <Clock size={14} className="shrink-0 text-muted-foreground" />}
                <span className="flex-1 truncate">
                  {shouldShowAutocomplete ? highlightMatch(item, value) : item}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted-foreground/10 hover:text-foreground"
                  aria-label={`Remove ${item}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {shouldShowRecent && history.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border/60 bg-card p-4 text-center text-sm text-muted-foreground shadow-lg backdrop-blur-sm"
          >
            Start typing to hunt jobs...
          </div>
        )}
      </div>
    );
  }
);
SearchHistory.displayName = "SearchHistory";
