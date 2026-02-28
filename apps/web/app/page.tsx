import { ChatPanel } from "@/components/editor/chat-panel";

export default function Home() {
  return (
    <div className="flex h-screen bg-zinc-100">
      {/* Left sidebar — page blocks (placeholder) */}
      <div className="flex w-64 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Page Blocks</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          {[
            { title: "My YouTube Channel", type: "CLASSIC" },
            { title: "Newsletter Signup", type: "CLASSIC" },
            { title: "Socials", type: "HEADER" },
            { title: "Instagram", type: "SOCIAL" },
            { title: "Twitter / X", type: "SOCIAL" },
          ].map((block, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static demo data
              key={i}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
            >
              <div className="h-2 w-2 rounded-full bg-zinc-300" />
              <div>
                <p className="text-xs font-medium text-zinc-800">
                  {block.title}
                </p>
                <p className="text-[10px] text-zinc-400">{block.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center — page preview */}
      <div className="flex flex-1 items-center justify-center bg-zinc-100">
        <div className="w-80 rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
            <h1 className="text-base font-bold text-zinc-900">Your Name</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Creator · Speaker · Builder
            </p>
          </div>
          <div className="space-y-2">
            {[
              "My YouTube Channel",
              "Newsletter Signup",
              "Instagram",
              "Twitter / X",
            ].map((title) => (
              <button
                key={title}
                className="w-full rounded-lg border border-zinc-200 py-2.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                type="button"
              >
                {title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar — AI Chat */}
      <div className="flex w-80 flex-col border-l border-zinc-200 bg-white">
        <ChatPanel
          pageId="demo-page"
          onAnalysis={(data) => {
            console.log("Agent analysis:", data);
          }}
          onMutation={(data) => {
            console.log("Agent mutation:", data);
          }}
        />
      </div>
    </div>
  );
}
