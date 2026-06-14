import { Bot } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function AIInsightCard({ insight, loading }: { insight?: string; loading?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="flex gap-4">
          <span className="surface-shine" />
          <div className="sparkle-outline grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#fff0df]">AI Insight</p>
            <p className="mt-1 text-sm leading-6 text-[#ffd9ba]">{loading ? "Analyzing campaign performance..." : insight}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
