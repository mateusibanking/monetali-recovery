const Header = () => (
  <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-logo leading-tight tracking-wide">monetali</h1>
          <p className="text-xs text-muted-foreground">Controle de Inadimplência</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground hidden sm:block">
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  </header>
);

export default Header;
