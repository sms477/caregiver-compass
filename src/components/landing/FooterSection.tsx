const FooterSection = () => (
  <footer className="py-10 px-6 border-t border-border">
    <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm">
          E
        </div>
        <span className="font-display font-bold text-foreground">EasyRCFE</span>
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} EasyRCFE. All rights reserved.
      </p>
    </div>
  </footer>
);

export default FooterSection;
