'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RiTwitterXFill } from 'react-icons/ri';
import { Link2, Check } from 'lucide-react';

interface ShareButtonProps {
  query?: string;
  className?: string;
}

export function ShareButton({ query, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getCurrentUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    if (query?.trim()) {
      return `${baseUrl}?q=${encodeURIComponent(query)}`;
    }
    return baseUrl;
  };

  const shareOnX = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = getCurrentUrl();
    const text = 'Yo @ValyuNetwork just put bloomberg-grade data behind a chatbot and open sourced it 👉';
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(getCurrentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
    }
  };

  return (
    <div className={`flex items-center gap-0.5 sm:gap-1 ${className}`}>
      <Button
        onClick={shareOnX}
        variant="outline"
        size="sm"
        className="transition-all duration-200 rounded-lg h-9 w-9 sm:h-10 sm:w-10 p-0 border-none shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 group"
        title="Share on X"
      >
        <RiTwitterXFill className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
      </Button>
      <Button
        onClick={copyLink}
        variant="outline"
        size="sm"
        className={`transition-all duration-200 rounded-lg h-9 w-9 sm:h-10 sm:w-10 p-0 border-none shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 group ${
          copied ? 'bg-green-100 dark:bg-green-900/20' : ''
        }`}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
        ) : (
          <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
        )}
      </Button>
    </div>
  );
}