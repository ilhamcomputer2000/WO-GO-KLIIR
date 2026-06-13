import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showTagline?: boolean;
  showName?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { width: 140, height: 140, img: "h-16 w-auto" },
  md: { width: 220, height: 220, img: "h-24 w-auto" },
  lg: { width: 320, height: 320, img: "h-36 w-auto" },
  xl: { width: 400, height: 400, img: "h-44 w-auto" },
  hero: { width: 480, height: 480, img: "h-56 md:h-64 lg:h-72 w-auto max-w-full" },
};

export function BrandLogo({
  size = "md",
  showTagline = false,
  showName = false,
  className,
}: BrandLogoProps) {
  const { width, height, img } = sizeMap[size];

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Image
        src="/logo-goklirr.png"
        alt="GO KLIRR"
        width={width}
        height={height}
        className={cn(img, "object-contain")}
        priority
      />
      {showName && (
        <p className="mt-3 text-xl font-bold tracking-wide text-[#2e7d32]">
          GO KLIRR
        </p>
      )}
      {showTagline && (
        <p className="mt-1 text-sm text-[#1976d2] text-center">
          Bersih Cepat, Hasil Tepat.
        </p>
      )}
    </div>
  );
}
