import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StandingRow } from "@/lib/mockData";

const StandingsTable = ({ rows }: { rows: StandingRow[] }) => {
  return (
    <div className="mt-4 rounded-lg border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary">
            <TableHead className="text-secondary-foreground font-display text-base">#</TableHead>
            <TableHead className="text-secondary-foreground font-display text-base">Equipo</TableHead>
            <TableHead className="text-secondary-foreground text-center">PJ</TableHead>
            <TableHead className="text-secondary-foreground text-center">PG</TableHead>
            <TableHead className="text-secondary-foreground text-center">PE</TableHead>
            <TableHead className="text-secondary-foreground text-center">PP</TableHead>
            <TableHead className="text-secondary-foreground text-center hidden sm:table-cell">GF</TableHead>
            <TableHead className="text-secondary-foreground text-center hidden sm:table-cell">GC</TableHead>
            <TableHead className="text-secondary-foreground text-center">DG</TableHead>
            <TableHead className="text-secondary-foreground text-center font-bold">PTS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.team} className={i < 2 ? "border-l-2 border-l-primary" : ""}>
              <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-semibold text-card-foreground">{row.team}</TableCell>
              <TableCell className="text-center text-muted-foreground">{row.pj}</TableCell>
              <TableCell className="text-center text-muted-foreground">{row.pg}</TableCell>
              <TableCell className="text-center text-muted-foreground">{row.pe}</TableCell>
              <TableCell className="text-center text-muted-foreground">{row.pp}</TableCell>
              <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{row.gf}</TableCell>
              <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{row.gc}</TableCell>
              <TableCell className={`text-center font-medium ${row.dg > 0 ? "text-primary" : row.dg < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {row.dg > 0 ? `+${row.dg}` : row.dg}
              </TableCell>
              <TableCell className="text-center font-display text-lg text-card-foreground">{row.pts}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-4 px-4 py-3 text-xs text-muted-foreground border-t">
        <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-primary" /> Clasificados</span>
      </div>
    </div>
  );
};

export default StandingsTable;
