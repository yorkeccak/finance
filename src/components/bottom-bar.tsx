"use client";

import { motion } from "framer-motion";
import SocialLinks from "./social-links";

const BottomBar = () => {
  return (
    <>
      {/* Bottom Right - Social Links & Disclaimer - Always visible on desktop, hidden on mobile */}
      <motion.div
        className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-30 transition-opacity duration-300 hidden sm:flex flex-col items-end gap-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5, ease: "easeOut" }}
      >
        {/* Social Links */}
        <SocialLinks />

        {/* Financial Disclaimer */}
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          Not financial advice.
        </p>
      </motion.div>
    </>
  );
};

export default BottomBar;