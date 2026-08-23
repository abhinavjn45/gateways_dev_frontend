"use client";

import { useState, useRef, useEffect, useId } from "react";
import { cn } from "@/frontend/lib/utils";
import { FieldShell, wellClasses } from "./block-input";
import { ChevronDown, Search } from "lucide-react";

export interface BlockComboboxProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options: { id: string; name: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wrapperClassName?: string;
}

export function BlockCombobox({
  label,
  hint,
  error,
  required,
  options,
  value,
  onChange,
  placeholder,
  wrapperClassName,
}: BlockComboboxProps) {
  const auto = useId();
  const fieldId = auto;
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When value changes from outside, reset query to show the name
  useEffect(() => {
    if (value) {
      const selected = options.find((o) => o.id === value);
      if (selected) {
        setQuery(selected.name);
      }
    } else {
      setQuery("");
    }
  }, [value, options]);

  // Extract the "Other" option (ID 9999) if it exists
  const otherOption = options.find((o) => o.id === "9999");
  
  // Filter the regular options, excluding the "Other" option from the normal list
  const filteredRegularOptions = options.filter((option) =>
    option.id !== "9999" && option.name.toLowerCase().includes(query.toLowerCase())
  );

  // Always append the "Other" option at the very end
  const filteredOptions = otherOption
    ? [...filteredRegularOptions, otherOption]
    : filteredRegularOptions;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <div className="relative" ref={containerRef}>
        <div className="relative flex items-center">
          <input
            id={fieldId}
            type="text"
            className={cn(
              wellClasses,
              "pr-[calc(var(--mc-unit)*4)] cursor-text",
              error && "outline-[length:var(--mc-bevel)] outline-mc-redstone"
            )}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (e.target.value === "") {
                onChange("");
              }
            }}
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              const selected = options.find((o) => o.id === value);
              if (selected && query !== selected.name) {
                setQuery(selected.name);
              } else if (!selected) {
                setQuery("");
                onChange("");
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${fieldId}-msg`}
            autoComplete="off"
          />
          <span
            className="absolute right-[calc(var(--mc-unit)*1)] text-mc-text-dim pointer-events-none flex items-center"
            aria-hidden
          >
            {open ? <Search size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>

        {open && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto bg-mc-slot bevel-inset outline-[length:var(--mc-bevel)] outline-mc-border shadow-xl">
            {filteredOptions.length === 0 ? (
              <li className="px-[calc(var(--mc-unit)*1)] py-[calc(var(--mc-unit)*0.75)] text-[18px] text-mc-text-dim">
                No colleges found.
              </li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.id}
                  className={cn(
                    "cursor-pointer px-[calc(var(--mc-unit)*1)] py-[calc(var(--mc-unit)*0.5)] text-[18px] hover:bg-mc-portal hover:text-white transition-colors",
                    value === option.id ? "bg-mc-portal/50 text-white" : "text-mc-text"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input from losing focus immediately
                    onChange(option.id);
                    setQuery(option.name);
                    setOpen(false);
                  }}
                >
                  {option.name}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </FieldShell>
  );
}
