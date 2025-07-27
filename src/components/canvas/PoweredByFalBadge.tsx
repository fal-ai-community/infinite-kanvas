import React from "react";
import Link from "next/link";
import { LogoIcon } from "@/components/icons/logo";

export const PoweredByFalBadge: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 z-20 hidden md:block">
      <Link
        href="https://fal.ai"
        target="_blank"
        className="border bg-card p-2 flex flex-row rounded-xl gap-2 items-center"
      >
        <LogoIcon className="w-10 h-10" />
        <div className="text-xs">
          Powered by <br />
          <span className="font-bold text-xl">Fal</span>
        </div>
      </Link>
    </div>
  );
};
