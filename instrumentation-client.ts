import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // Only create profiles for logged-in users
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true, // Mask sensitive inputs
      maskTextSelector: '.sensitive', // Mask elements with this class
    },
    autocapture: false, // Disable to save quota - only track what we need
  });
}
