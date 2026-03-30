export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branded panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-vox-primary to-teal-700 text-white flex-col items-center justify-center p-12">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-white/5" />
        <div className="absolute top-1/4 right-12 h-48 w-48 rounded-full bg-white/5" />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Mic icon */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">VoxClinic</h1>
          <p className="mt-3 text-lg text-white/80 font-medium">
            CRM inteligente com voz
          </p>
          <p className="mt-6 text-sm leading-relaxed text-white/60 max-w-sm">
            Fale durante ou apos a consulta e o sistema transcreve, extrai dados
            e preenche prontuarios automaticamente.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {['Transcrição por voz', 'IA integrada', 'LGPD compliant'].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Right side — auth content */}
      <div className="flex w-full md:w-1/2 lg:w-[45%] items-center justify-center p-6 sm:p-10">
        {children}
      </div>
    </div>
  )
}
