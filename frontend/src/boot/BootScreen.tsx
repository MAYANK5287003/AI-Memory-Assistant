type Props = {
  status: string;
};

export default function BootScreen({ status }: Props) {
  const steps = [
    {
      key: "connecting",
      label: "Connecting Backend",
    },
    {
      key: "loading_index",
      label: "Loading Memory Core",
    },
    {
      key: "warming_ai",
      label: "Preparing AI Engine",
    },
  ];

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <div className="w-[360px]">
        <h1 className="text-3xl font-bold text-center">
          AI Memory Assistant
        </h1>

        <div className="mt-8 space-y-3">
          {steps.map((s) => {
            const isActive = status === s.key;
            const isDone =
              steps.findIndex((x) => x.key === status) >
              steps.findIndex((x) => x.key === s.key);

            return (
              <div
                key={s.key}
                className="flex items-center gap-3 text-sm"
              >
                <span>
                  {isDone ? "✓" : isActive ? "⏳" : "•"}
                </span>
                <span
                  className={
                    isActive
                      ? "opacity-100"
                      : "opacity-50"
                  }
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {status === "error" && (
          <p className="mt-6 text-red-400 text-center">
            Backend not responding
          </p>
        )}
      </div>
    </div>
  );
}