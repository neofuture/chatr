'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.4 }
      }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </motion.div>
  );
}
