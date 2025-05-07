import { motion } from "framer-motion";
import { PiUsers } from "react-icons/pi";

export default function TeamsTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[300px] px-6 py-10"
    >
      <div className="bg-muted/30 p-8 rounded-2xl flex flex-col items-center gap-4 max-w-md w-full">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <PiUsers size={24} />
        </div>
        <h2 className="text-xl font-medium text-foreground">Agents Team</h2>
        <p className="text-muted-foreground text-center text-sm">
          We are developing team collaboration features, please look forward to
          it. Here will provide powerful tools for team management,
          collaboration and communication.
        </p>
        <div className="h-1 w-24 bg-primary/20 rounded-full mt-2"></div>
      </div>
    </motion.div>
  );
}
