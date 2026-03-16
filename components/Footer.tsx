import { Trophy } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-secondary py-12">
    <div className="container">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-display text-xl text-secondary-foreground">
            CHAMP<span className="text-primary">ZONE</span>
          </span>
        </div>
        <p className="text-sm text-secondary-foreground/50">
          © 2026 ChampZone. Gestión deportiva profesional.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
