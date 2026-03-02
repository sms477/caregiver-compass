import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, CheckCircle2, Clock, Send, Loader2,
  ChevronLeft, RefreshCw, AlertTriangle, FileCheck
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface W2Data {
  employerName: string;
  employerEIN: string;
  employerAddress: string;
  employeeName: string;
  employeeSSNLast4: string;
  employeeAddress: string;
  wagesTipsOther: number;       // Box 1
  federalTaxWithheld: number;   // Box 2
  socialSecurityWages: number;   // Box 3
  socialSecurityTax: number;     // Box 4
  medicareWages: number;         // Box 5
  medicareTax: number;           // Box 6
  stateTaxWithheld: number;      // Box 17
  stateWages: number;            // Box 16
  localTax: number;              // Box 19
  localWages: number;            // Box 18
  sdiWithheld: number;
  totalGrossPay: number;
  totalNetPay: number;
  preTaxDeductions: number;
  postTaxDeductions: number;
}

interface TaxForm {
  id: string;
  employeeId: string;
  employeeName: string;
  taxYear: number;
  formType: string;
  formData: W2Data;
  status: string;
  generatedAt: Date;
  distributedAt: Date | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

const TaxFormsView = () => {
  const { payStubs, employees } = useApp();
  const { toast } = useToast();
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR - 1);
  const [selectedForm, setSelectedForm] = useState<TaxForm | null>(null);

  const refreshForms = useCallback(async () => {
    const { data, error } = await supabase
      .from("tax_forms")
      .select("*")
      .order("tax_year", { ascending: false });

    if (data && !error) {
      setForms(data.map((f: any) => ({
        id: f.id,
        employeeId: f.employee_id,
        employeeName: f.employee_name,
        taxYear: f.tax_year,
        formType: f.form_type,
        formData: f.form_data as W2Data,
        status: f.status,
        generatedAt: new Date(f.generated_at),
        distributedAt: f.distributed_at ? new Date(f.distributed_at) : null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshForms(); }, [refreshForms]);

  const generateW2s = async (year: number) => {
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Filter pay stubs for the selected year
      const yearStubs = payStubs.filter(s => {
        const paidDate = new Date(s.paidAt);
        return paidDate.getFullYear() === year;
      });

      if (yearStubs.length === 0) {
        toast({ title: "No data", description: `No pay stubs found for ${year}.`, variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Group by employee
      const byEmployee = new Map<string, typeof yearStubs>();
      yearStubs.forEach(s => {
        const existing = byEmployee.get(s.employeeId) || [];
        existing.push(s);
        byEmployee.set(s.employeeId, existing);
      });

      const rows: any[] = [];

      byEmployee.forEach((stubs, empId) => {
        const emp = employees.find(e => e.id === empId);
        const empName = stubs[0].employeeName;

        // Aggregate all line items
        let totalGross = 0, totalNet = 0;
        let federalTax = 0, ssTax = 0, medicareTax = 0, stateTax = 0, sdi = 0, localTax = 0;
        let preTaxDed = 0, postTaxDed = 0;

        stubs.forEach(s => {
          const li = s.lineItem;
          totalGross += li.grossPay;
          totalNet += li.netPay;
          federalTax += li.taxes.federalIncome + li.taxes.additionalFederal;
          ssTax += li.taxes.socialSecurity;
          medicareTax += li.taxes.medicare;
          stateTax += li.taxes.stateIncome;
          sdi += li.taxes.sdi;
          localTax += li.taxes.localTax;
          preTaxDed += li.deductions.totalPreTax;
          postTaxDed += li.deductions.totalPostTax;
        });

        // Box 1 = Gross - pre-tax deductions
        const w2Data: W2Data = {
          employerName: "CareGuard LLC",
          employerEIN: "XX-XXXXXXX",
          employerAddress: "California, USA",
          employeeName: empName,
          employeeSSNLast4: "XXXX",
          employeeAddress: "",
          wagesTipsOther: totalGross - preTaxDed,
          federalTaxWithheld: federalTax,
          socialSecurityWages: totalGross,
          socialSecurityTax: ssTax,
          medicareWages: totalGross,
          medicareTax: medicareTax,
          stateWages: totalGross - preTaxDed,
          stateTaxWithheld: stateTax,
          localWages: totalGross - preTaxDed,
          localTax: localTax,
          sdiWithheld: sdi,
          totalGrossPay: totalGross,
          totalNetPay: totalNet,
          preTaxDeductions: preTaxDed,
          postTaxDeductions: postTaxDed,
        };

        rows.push({
          employee_id: empId,
          employee_name: empName,
          tax_year: year,
          form_type: "W-2",
          form_data: JSON.parse(JSON.stringify(w2Data)) as Json,
          status: "generated",
          generated_by: userId,
        });
      });

      // Delete existing forms for this year first
      await supabase.from("tax_forms").delete().eq("tax_year", year);

      const { error } = await supabase.from("tax_forms").insert(rows as any);
      if (error) throw error;

      toast({
        title: `W-2 forms generated`,
        description: `${rows.length} W-2 form(s) created for tax year ${year}.`,
      });
      await refreshForms();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const distributeForm = async (formId: string) => {
    await supabase
      .from("tax_forms")
      .update({ status: "distributed", distributed_at: new Date().toISOString() } as any)
      .eq("id", formId);
    toast({ title: "Form distributed to employee portal" });
    await refreshForms();
    setSelectedForm(null);
  };

  const distributeAll = async (year: number) => {
    const yearForms = forms.filter(f => f.taxYear === year && f.status !== "distributed");
    for (const f of yearForms) {
      await supabase
        .from("tax_forms")
        .update({ status: "distributed", distributed_at: new Date().toISOString() } as any)
        .eq("id", f.id);
    }
    toast({ title: `${yearForms.length} form(s) distributed` });
    await refreshForms();
  };

  const exportW2CSV = (form: TaxForm) => {
    const d = form.formData;
    const rows = [
      `W-2 Wage and Tax Statement — Tax Year ${form.taxYear}`,
      ``,
      `Employer: ${d.employerName}`,
      `EIN: ${d.employerEIN}`,
      ``,
      `Employee: ${d.employeeName}`,
      ``,
      `Box,Description,Amount`,
      `1,Wages/Tips/Other Compensation,${d.wagesTipsOther.toFixed(2)}`,
      `2,Federal Income Tax Withheld,${d.federalTaxWithheld.toFixed(2)}`,
      `3,Social Security Wages,${d.socialSecurityWages.toFixed(2)}`,
      `4,Social Security Tax Withheld,${d.socialSecurityTax.toFixed(2)}`,
      `5,Medicare Wages and Tips,${d.medicareWages.toFixed(2)}`,
      `6,Medicare Tax Withheld,${d.medicareTax.toFixed(2)}`,
      `16,State Wages,${d.stateWages.toFixed(2)}`,
      `17,State Income Tax,${d.stateTaxWithheld.toFixed(2)}`,
      `CA SDI,State Disability Insurance,${d.sdiWithheld.toFixed(2)}`,
      ``,
      `Total Gross Pay,${d.totalGrossPay.toFixed(2)}`,
      `Pre-Tax Deductions,${d.preTaxDeductions.toFixed(2)}`,
      `Post-Tax Deductions,${d.postTaxDeductions.toFixed(2)}`,
      `Total Net Pay,${d.totalNetPay.toFixed(2)}`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `W2-${form.taxYear}-${form.employeeName.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detail view
  if (selectedForm) {
    const d = selectedForm.formData;
    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelectedForm(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Tax Forms
        </button>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Form W-2 — Tax Year {selectedForm.taxYear}
                </p>
                <h2 className="text-lg font-display font-bold text-foreground mt-1">{selectedForm.employeeName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedForm.status === "distributed"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {selectedForm.status === "distributed" ? "✓ Distributed" : "⏳ Pending Distribution"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportW2CSV(selectedForm)}
                  className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                {selectedForm.status !== "distributed" && (
                  <button
                    onClick={() => distributeForm(selectedForm.id)}
                    className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform"
                  >
                    <Send className="w-4 h-4" /> Distribute
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Employer Info */}
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-foreground">{d.employerName}</p>
              <p className="text-muted-foreground">EIN: {d.employerEIN}</p>
              <p className="text-muted-foreground">{d.employerAddress}</p>
            </div>

            {/* W-2 Boxes */}
            <div className="grid grid-cols-2 gap-3">
              <W2Box box="1" label="Wages, Tips, Other Comp." value={formatCurrency(d.wagesTipsOther)} />
              <W2Box box="2" label="Federal Tax Withheld" value={formatCurrency(d.federalTaxWithheld)} />
              <W2Box box="3" label="Social Security Wages" value={formatCurrency(d.socialSecurityWages)} />
              <W2Box box="4" label="Social Security Tax" value={formatCurrency(d.socialSecurityTax)} />
              <W2Box box="5" label="Medicare Wages & Tips" value={formatCurrency(d.medicareWages)} />
              <W2Box box="6" label="Medicare Tax Withheld" value={formatCurrency(d.medicareTax)} />
              <W2Box box="16" label="State Wages (CA)" value={formatCurrency(d.stateWages)} />
              <W2Box box="17" label="State Tax Withheld (CA)" value={formatCurrency(d.stateTaxWithheld)} />
            </div>

            {/* CA-specific */}
            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold text-foreground mb-2">California Specifics</h4>
              <div className="grid grid-cols-2 gap-3">
                <W2Box box="SDI" label="CA State Disability Ins." value={formatCurrency(d.sdiWithheld)} />
                <W2Box box="19" label="Local Tax" value={formatCurrency(d.localTax)} />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-foreground text-sm">Annual Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Gross Pay</span>
                <span className="text-right font-semibold text-foreground">{formatCurrency(d.totalGrossPay)}</span>
                <span className="text-muted-foreground">Pre-Tax Deductions</span>
                <span className="text-right text-foreground">-{formatCurrency(d.preTaxDeductions)}</span>
                <span className="text-muted-foreground">Post-Tax Deductions</span>
                <span className="text-right text-foreground">-{formatCurrency(d.postTaxDeductions)}</span>
                <span className="text-muted-foreground font-semibold">Total Net Pay</span>
                <span className="text-right font-bold text-foreground text-lg">{formatCurrency(d.totalNetPay)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Year-grouped view
  const yearForms = forms.filter(f => f.taxYear === selectedYear);
  const existingYears = [...new Set(forms.map(f => f.taxYear))].sort((a, b) => b - a);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Tax Forms</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate and distribute year-end W-2 forms.</p>
        </div>
        <button
          onClick={refreshForms}
          className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Generate W-2s */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Generate W-2 Forms</h3>
        <p className="text-xs text-muted-foreground">Select a tax year to generate W-2s from processed pay stubs.</p>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {AVAILABLE_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => generateW2s(selectedYear)}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate W-2s
          </button>
          {yearForms.length > 0 && yearForms.some(f => f.status !== "distributed") && (
            <button
              onClick={() => distributeAll(selectedYear)}
              className="flex items-center gap-2 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              <Send className="w-4 h-4" /> Distribute All
            </button>
          )}
        </div>
        {yearForms.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {yearForms.length} form(s) for {selectedYear} · {yearForms.filter(f => f.status === "distributed").length} distributed
          </p>
        )}
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading tax forms...
        </div>
      ) : forms.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No tax forms generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">Select a year above and generate W-2 forms from pay stub data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {existingYears.map(year => {
            const yForms = forms.filter(f => f.taxYear === year);
            return (
              <div key={year} className="glass-card rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">Tax Year {year}</h3>
                  <span className="text-xs text-muted-foreground">
                    {yForms.length} form(s) · {yForms.filter(f => f.status === "distributed").length} distributed
                  </span>
                </div>
                {yForms.map(form => (
                  <button
                    key={form.id}
                    onClick={() => setSelectedForm(form)}
                    className="w-full px-4 py-3 flex items-center justify-between border-t border-border text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{form.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          W-2 · Generated {form.generatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      form.status === "distributed"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}>
                      {form.status === "distributed" ? "Distributed" : "Pending"}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function W2Box({ box, label, value }: { box: string; label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{box}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}

export default TaxFormsView;
