import { cn } from "~/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({ className, imageClassName }: BrandLogoProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/ultrahuman-logo.svg"
      alt="Ultrahuman Logo"
      className={cn("object-contain", className, imageClassName)}
    />
  );
}
