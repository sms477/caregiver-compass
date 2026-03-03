import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  invoiceId: string;
  invoiceDate: string;
  facilityName: string;
  residentName: string;
  room: string;
  baseRent: number;
  careLevel: string;
  careSurcharge: number;
  billingPeriod: string;
}

interface InvoiceTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InvoiceData | null;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InvoiceTemplate = ({ open, onOpenChange, data }: InvoiceTemplateProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!data) return null;

  const total = data.baseRent + data.careSurcharge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>

        {/* Print button */}
        <div className="flex justify-end print:hidden">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Download PDF
          </Button>
        </div>

        {/* Invoice body — this is the printable area */}
        <div ref={printRef} id="invoice-print-area" className="bg-card rounded-lg border border-border p-8 space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {data.facilityName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Residential Care Facility for the Elderly</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Invoice</p>
              <p className="text-sm font-mono text-foreground">#{data.invoiceId.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">
                Date: {format(new Date(data.invoiceDate), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <hr className="border-border" />

          {/* Bill To */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Bill To</p>
            <p className="text-sm font-semibold text-foreground">{data.residentName}</p>
            <p className="text-sm text-muted-foreground">{data.room}</p>
            <p className="text-xs text-muted-foreground mt-1">Billing Period: {data.billingPeriod}</p>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3 font-semibold text-foreground">Description</th>
                  <th className="text-right p-3 font-semibold text-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3 text-foreground">Monthly Base Rent (Room &amp; Board)</td>
                  <td className="p-3 text-right font-medium text-foreground">{fmt(data.baseRent)}</td>
                </tr>
                {data.careSurcharge > 0 && (
                  <tr className="border-t border-border">
                    <td className="p-3 text-foreground">
                      Level of Care Surcharge ({data.careLevel})
                    </td>
                    <td className="p-3 text-right font-medium text-foreground">{fmt(data.careSurcharge)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/20 bg-muted/30">
                  <td className="p-3 font-bold text-foreground text-base">Total Due</td>
                  <td className="p-3 text-right font-bold text-primary text-lg">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-foreground">
              Payment due by the 1st of the month.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Late fees apply after the 5th. Please make checks payable to "{data.facilityName}" or contact us for electronic payment options.
            </p>
          </div>

          <hr className="border-border" />

          <p className="text-center text-xs text-muted-foreground">
            Thank you for choosing {data.facilityName}. If you have questions about this invoice, please contact our office.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceTemplate;
