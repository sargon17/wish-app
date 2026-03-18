export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-border/70 px-4 pb-10 pt-8 text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-center text-sm sm:flex-row sm:text-left">
        <p className="m-0">&copy; {year} Wish app.</p>
        <p className="m-0">Porting from Next.js to TanStack Start.</p>
      </div>
    </footer>
  )
}
