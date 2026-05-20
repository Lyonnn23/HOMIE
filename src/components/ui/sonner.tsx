import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-[#111827] !text-white !border-0 !border-l-[3px] !border-l-[#EF9F27] !rounded-xl !shadow-lg",
          description: "!text-white/70",
          success: "!border-l-[#EF9F27]",
          error: "!border-l-[#FF3B6B]",
          actionButton: "!bg-[#EF9F27] !text-[#111827]",
          cancelButton: "!bg-white/10 !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
