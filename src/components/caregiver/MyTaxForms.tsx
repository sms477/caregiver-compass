import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { FileText, Download, ChevronLeft } from "lucide-react";

interface W2Data {
  employerName: string;
  employerEIN: string;
  employerAddress: string;
  employeeName: string;
  wagesTipsOther: number;
  federalTaxWithheld: number;
  socialSecurityWages: number;
  socialSecurityTax: number;
  medicareWages: number;
  medicareTax: number;
  stateTaxWithheld: number;
  stateWages: number;
  localTax: number;
  localWages: number;
  sdiWithheld: number;
  totalGrossPay: number;
  totalNetPay: number;
  preTaxDeductions: number;
  postTaxDeductions: number;
}

interface TaxForm {
  id: string;
  taxYear: number;
  formType: string;
  formData: W2Data;
  status: string;
  generatedAt: Date;
  distributedAt: Date | null;
}

const MyTaxForms = () => {
  const { currentCaregiverId } = useApp();
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<TaxForm | null>(null);

  const refreshForms = useCallback(async () => {
    const { data, error } = await supabase
      .from("tax_forms")
      .select("*")
      .eq("employee_id", currentCaregiverId)
      .eq("status", "distributed")
      .order("tax_year", { ascending: false });

    if (data && !error) {
      setForms(data.map((f: any) => ({
        id: f.id,
        taxYear: f.tax_year,
        formType: f.form_type,
        formData: f.form_data as W2Data,
        status: f.status,
        generatedAt: new Date(f.generated_at),
        distributedAt: f.distributed_at ? new Date(f.distributed_at) : null,
      })));
    }
    setLoading(false);
  }, [currentCaregiverId]);

  useEffect(() => { refreshForms(); }, [refreshForms]);

  const exportW2CSV = (form: TaxForm) => {
    const d = form.formData;
    const rows = [
      `W-2 Wage and Tax Statement — Tax Year ${form.taxYear}`,
      ``,
      `Employee: ${d.employeeName}`,
      `Employer: ${d.employerName}`,
      ``,
      `Box,Description,Amount`,
      `1,Wages/Tips/Other,${d.wagesTipsOther.toFixed(2)}`,
      `2,Federal Tax Withheld,${d.federalTaxWithheld.toFixed(2)}`,
      `3,Social Security Wages,${d.socialSecurityWages.toFixed(2)}`,
      `4,Social Security Tax,${d.socialSecurityTax.toFixed(2)}`,
      `5,Medicare Wages,${d.medicareWages.toFixed(2)}`,
      `6,Medicare Tax,${d.medicareTax.toFixed(2)}`,
      `16,State Wages (CA),${d.stateWages.toFixed(2)}`,
      `17,State Tax (CA),${d.stateTaxWithheld.toFixed(2)}`,
      `SDI,CA SDI,${d.sdiWithheld.toFixed(2)}`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `W2-${form.taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedForm) {
    const d = selectedForm.formData;
    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelectedForm(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Tax Forms
        </button>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Form W-2 — {selectedForm.taxYear}</p>
                <h2 className="text-lg font-display font-bold text-foreground mt-1">{d.employeeName}</h2>
              </div>
              <button
                onClick={() => exportW2CSV(selectedForm)}
                className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium active:scale-[0.97] transition-transform"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-semibold text-foreground">{d.employerName}</p>
              <p className="text-muted-foreground text-xs">{d.employerAddress}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <W2Box box="1" label="Wages & Comp." value={formatCurrency(d.wagesTipsOther)} />
              <W2Box box="2" label="Fed. Tax Withheld" value={formatCurrency(d.federalTaxWithheld)} />
              <W2Box box="3" label="SS Wages" value={formatCurrency(d.socialSecurityWages)} />
              <W2Box box="4" label="SS Tax" value={formatCurrency(d.socialSecurityTax)} />
              <W2Box box="5" label="Medicare Wages" value={formatCurrency(d.medicareWages)} />
              <W2Box box="6" label="Medicare Tax" value={formatCurrency(d.medicareTax)} />
              <W2Box box="16" label="CA State Wages" value={formatCurrency(d.stateWages)} />
              <W2Box box="17" label="CA State Tax" value={formatCurrency(d.stateTaxWithheld)} />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Gross</span>
                <span className="text-right font-semibold text-foreground">{formatCurrency(d.totalGrossPay)}</span>
                <span className="text-muted-foreground">Total Net</span>
                <span className="text-right font-bold text-foreground text-lg">{formatCurrency(d.totalNetPay)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">Tax Forms</h2>
      <p className="text-sm text-muted-foreground">View and download your year-end tax documents.</p>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : forms.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">No tax forms available</p>
          <p className="text-sm text-muted-foreground">Your W-2 forms will appear here when distributed by your employer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(form => (
            <button
              key={form.id}
              onClick={() => setSelectedForm(form)}
              className="w-full glass-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">W-2 — {form.taxYear}</p>
                    <p className="text-xs text-muted-foreground">
                      Available {form.distributedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Ready</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function W2Box({ box, label, value }: { box: string; label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-2.5">
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">{box}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="font-semibold text-foreground text-sm mt-0.5">{value}</p>
    </div>
  );
}

export default MyTaxForms;
