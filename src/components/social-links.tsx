"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, XIcon } from "lucide-react";

const SocialLinks = () => {
  const socialLinks = [
    {
      name: "X",
      url: "https://x.com/valyuOfficial",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
    </svg>,
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/valyu-ai",
      icon: <Linkedin className="h-4 w-4" />,
    },
    {
      name: "GitHub",
      url: "https://github.com/yorkeccak/finance/",
      icon: <Github className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center space-x-3">
      {socialLinks.map((link, index) => (
        <motion.a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 + index * 0.1, duration: 0.5, ease: "easeOut" }}
          aria-label={`Follow us on ${link.name}`}
        >
          {link.icon}
        </motion.a>
      ))}
    </div>
  );
};

export default SocialLinks;
