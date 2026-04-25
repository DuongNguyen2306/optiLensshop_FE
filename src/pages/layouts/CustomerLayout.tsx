import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import CustomerRouteGate from "@/components/routing/CustomerRouteGate";

export default function CustomerLayout() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <CustomerRouteGate>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0ebe3_0%,#f7f4ed_40%,#f4f1eb_100%)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${location.pathname}${location.search}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="will-change-[opacity,transform]"
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </div>
    </CustomerRouteGate>
  );
}
