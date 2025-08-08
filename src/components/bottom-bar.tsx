"use client";

import { motion } from "framer-motion";
import SocialLinks from "./social-links";

const BottomBar = () => {
  return (
    <>
      {/* Social Links - Bottom Left */}
      <motion.div 
        className="fixed bottom-3 sm:bottom-6 left-3 sm:left-6 z-40"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5, ease: "easeOut" }}
      >
        <SocialLinks />
      </motion.div>
      
      {/* Financial Disclaimer - Bottom Right */}
      <motion.div 
        className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-40"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.5, ease: "easeOut" }}
      >
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          Not financial advice
        </p>
      </motion.div>
    </>
  );
};

export default BottomBar;