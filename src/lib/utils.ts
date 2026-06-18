import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text: string, keyword: string): (string | { highlighted: string })[] {
  if (!keyword || !text) return [text || ''];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase().trim();
  if (!lowerKeyword) return [text];

  const result: (string | { highlighted: string })[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerKeyword);

  while (index !== -1) {
    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index));
    }
    result.push({ highlighted: text.slice(index, index + lowerKeyword.length) });
    lastIndex = index + lowerKeyword.length;
    index = lowerText.indexOf(lowerKeyword, lastIndex);
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length ? result : [text];
}

export function containsKeyword(text: string | undefined, keyword: string): boolean {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase().trim());
}

