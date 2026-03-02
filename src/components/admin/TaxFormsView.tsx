import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, CheckCircle2, Clock, Send, Loader2,
  ChevronLeft, RefreshCw, AlertTriangle, FileCheck, Upload,
  Building, DollarSign, ArrowRight, XCircle, BadgeCheck
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface W2Data {
  employerName: string;
  employerEIN: string;
  employerAddress: string;
  employeeName: string;
  employeeSSNLast4: string;
  employeeAddress: string;
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
  employeeId: string;
  employeeName: string;
  taxYear: number;
  formType: string;
  formData: W2Data;
  status: string;
  generatedAt: Date;
  distributedAt: Date | null;
}

interface TaxFiling {
  id: string;
  taxYear: number;
  filingType: string;
  formType: string;
  agency: string;
  status: string;
  filedBy: string;
  filedAt: Date;
  confirmationNumber: string | null;
  amount: number;
  periodLabel: string | null;
  notes: string | null;
  filingData: any;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

type SubTab = "w2-forms" | "e-filing" | "remittance";

const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: "w2-forms", label: "W-2 Forms", icon: FileText },
  { key: "e-filing", label: "E-Filing", icon: Upload },
  { key: "remittance", label: "Tax Remittance", icon: DollarSign },
];

const AGENCIES = [
  { id: "IRS", name: "Internal Revenue Service", type: "federal" },
  { id: "CA_EDD", name: "CA Employment Development Dept", type: "state" },
  { id: "CA_FTB", name: "CA Franchise Tax Board", type: "state" },
];

const FILING_FORMS = [
  { id: "W-2", label: "W-2 (Wage & Tax Statement)", agency: "IRS", type: "federal" },
  { id: "W-3", label: "W-3 (Transmittal)", agency: "IRS", type: "federal" },
  { id: "941", label: "Form 941 (Quarterly Federal Tax)", agency: "IRS", type: "federal" },
  { id: "940", label: "Form 940 (Annual FUTA)", agency: "IRS", type: "federal" },
  { id: "DE9", label: "DE 9 (Quarterly Contribution)", agency: "CA_EDD", type: "state" },
  { id: "DE9C", label: "DE 9C (Quarterly Detail)", agency: "CA_EDD", type: "state" },
];

const TaxFormsView = () => {
  const { payStubs, employees } = useApp();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>("w2-forms");
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR - 1);
  const [selectedForm, setSelectedForm] = useState<TaxForm | null>(null);

  const refreshForms = useCallback(async () => {
    const [formsRes, filingsRes] = await Promise.all([
      supabase.from("tax_forms").select("*").order("tax_year", { ascending: false }),
      supabase.from("tax_filings").select("*").order("filed_at", { ascending: false }),
    ]);

    if (formsRes.data && !formsRes.error) {
      setForms(formsRes.data.map((f: any) => ({
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

    if (filingsRes.data && !filingsRes.error) {
      setFilings(filingsRes.data.map((f: any) => ({
        id: f.id,
        taxYear: f.tax_year,
        filingType: f.filing_type,
        formType: f.form_type,
        agency: f.agency,
        status: f.status,
        filedBy: f.filed_by,
        filedAt: new Date(f.filed_at),
        confirmationNumber: f.confirmation_number,
        amount: f.amount,
        periodLabel: f.period_label,
        notes: f.notes,
        filingData: f.filing_data,
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => { refreshForms(); }, [refreshForms]);

  // ---- W-2 Generation (existing logic) ----
  const generateW2s = async (year: number) => {
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const yearStubs = payStubs.filter(s => new Date(s.paidAt).getFullYear() === year);
      if (yearStubs.length === 0) {
        toast({ title: "No data", description: `No pay stubs found for ${year}.`, variant: "destructive" });
        setGenerating(false);
        return;
      }

      const byEmployee = new Map<string, typeof yearStubs>();
      yearStubs.forEach(s => {
        const existing = byEmployee.get(s.employeeId) || [];
        existing.push(s);
        byEmployee.set(s.employeeId, existing);
      });

      const rows: any[] = [];
      byEmployee.forEach((stubs, empId) => {
        const empName = stubs[0].employeeName;
        let totalGross = 0, totalNet = 0, federalTax = 0, ssTax = 0, medicareTax = 0, stateTax = 0, sdi = 0, localTax = 0, preTaxDed = 0, postTaxDed = 0;
        stubs.forEach(s => {
          const li = s.lineItem;
          totalGross += li.grossPay; totalNet += li.netPay;
          federalTax += li.taxes.federalIncome + li.taxes.additionalFederal;
          ssTax += li.taxes.socialSecurity; medicareTax += li.taxes.medicare;
          stateTax += li.taxes.stateIncome; sdi += li.taxes.sdi; localTax += li.taxes.localTax;
          preTaxDed += li.deductions.totalPreTax; postTaxDed += li.deductions.totalPostTax;
        });

        const w2Data: W2Data = {
          employerName: "Kova LLC", employerEIN: "XX-XXXXXXX", employerAddress: "California, USA",
          employeeName: empName, employeeSSNLast4: "XXXX", employeeAddress: "",
          wagesTipsOther: totalGross - preTaxDed, federalTaxWithheld: federalTax,
          socialSecurityWages: totalGross, socialSecurityTax: ssTax,
          medicareWages: totalGross, medicareTax: medicareTax,
          stateWages: totalGross - preTaxDed, stateTaxWithheld: stateTax,
          localWages: totalGross - preTaxDed, localTax, sdiWithheld: sdi,
          totalGrossPay: totalGross, totalNetPay: totalNet,
          preTaxDeductions: preTaxDed, postTaxDeductions: postTaxDed,
        };

        rows.push({
          employee_id: empId, employee_name: empName, tax_year: year,
          form_type: "W-2", form_data: JSON.parse(JSON.stringify(w2Data)) as Json,
          status: "generated", generated_by: userId,
        });
      });

      await supabase.from("tax_forms").delete().eq("tax_year", year);
      const { error } = await supabase.from("tax_forms").insert(rows as any);
      if (error) throw error;

      toast({ title: `W-2 forms generated`, description: `${rows.length} W-2 form(s) created for tax year ${year}.` });
      await refreshForms();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const distributeForm = async (formId: string) => {
    await supabase.from("tax_forms").update({ status: "distributed", distributed_at: new Date().toISOString() } as any).eq("id", formId);
    toast({ title: "Form distributed to employee portal" });
    await refreshForms();
    setSelectedForm(null);
  };

  const distributeAll = async (year: number) => {
    const yearForms = forms.filter(f => f.taxYear === year && f.status !== "distributed");
    for (const f of yearForms) {
      await supabase.from("tax_forms").update({ status: "distributed", distributed_at: new Date().toISOString() } as any).eq("id", f.id);
    }
    toast({ title: `${yearForms.length} form(s) distributed` });
    await refreshForms();
  };

  const exportW2CSV = (form: TaxForm) => {
    const d = form.formData;
    const rows = [
      `W-2 Wage and Tax Statement — Tax Year ${form.taxYear}`, ``,
      `Employer: ${d.employerName}`, `EIN: ${d.employerEIN}`, ``,
      `Employee: ${d.employeeName}`, ``,
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
      ``, `Total Gross Pay,${d.totalGrossPay.toFixed(2)}`,
      `Pre-Tax Deductions,${d.preTaxDeductions.toFixed(2)}`,
      `Post-Tax Deductions,${d.postTaxDeductions.toFixed(2)}`,
      `Total Net Pay,${d.totalNetPay.toFixed(2)}`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `W2-${form.taxYear}-${form.employeeName.replace(/\s+/g, "_")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ---- E-Filing Logic ----
  const submitFiling = async (formType: string, agency: string, filingType: string, year: number, periodLabel: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Aggregate data for the filing
      const yearForms = forms.filter(f => f.taxYear === year);
      const filingData: any = { employeeCount: yearForms.length, submittedAt: new Date().toISOString() };

      if (formType === "W-2" || formType === "W-3") {
        filingData.totalWages = yearForms.reduce((s, f) => s + f.formData.wagesTipsOther, 0);
        filingData.totalFederalTax = yearForms.reduce((s, f) => s + f.formData.federalTaxWithheld, 0);
        filingData.totalSSTax = yearForms.reduce((s, f) => s + f.formData.socialSecurityTax, 0);
        filingData.totalMedicareTax = yearForms.reduce((s, f) => s + f.formData.medicareTax, 0);
      }
      if (formType === "DE9" || formType === "DE9C") {
        filingData.totalStateWages = yearForms.reduce((s, f) => s + f.formData.stateWages, 0);
        filingData.totalStateTax = yearForms.reduce((s, f) => s + f.formData.stateTaxWithheld, 0);
        filingData.totalSDI = yearForms.reduce((s, f) => s + f.formData.sdiWithheld, 0);
      }

      const confirmationNumber = `${agency}-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("tax_filings").insert({
        tax_year: year,
        filing_type: filingType,
        form_type: formType,
        agency,
        status: "submitted",
        filed_by: userId,
        confirmation_number: confirmationNumber,
        period_label: periodLabel,
        filing_data: filingData as Json,
      } as any);

      if (error) throw error;

      toast({ title: "Filing submitted", description: `${formType} filed with ${agency}. Confirmation: ${confirmationNumber}` });
      await refreshForms();
    } catch (err: any) {
      toast({ title: "Filing error", description: err.message, variant: "destructive" });
    }
  };

  // ---- Tax Remittance Logic ----
  const submitRemittance = async (agency: string, amount: number, year: number, periodLabel: string, notes: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const confirmationNumber = `REM-${agency}-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("tax_filings").insert({
        tax_year: year,
        filing_type: "remittance",
        form_type: "remittance",
        agency,
        status: "submitted",
        filed_by: userId,
        confirmation_number: confirmationNumber,
        amount,
        period_label: periodLabel,
        notes,
        filing_data: { submittedAt: new Date().toISOString(), amount } as Json,
      } as any);

      if (error) throw error;

      toast({ title: "Remittance submitted", description: `${formatCurrency(amount)} sent to ${agency}. Confirmation: ${confirmationNumber}` });
      await refreshForms();
    } catch (err: any) {
      toast({ title: "Remittance error", description: err.message, variant: "destructive" });
    }
  };

  const markFilingStatus = async (filingId: string, status: string) => {
    await supabase.from("tax_filings").update({ status } as any).eq("id", filingId);
    toast({ title: `Filing marked as ${status}` });
    await refreshForms();
  };

  // ---- W-2 Detail View ----
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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Form W-2 — Tax Year {selectedForm.taxYear}</p>
                <h2 className="text-lg font-display font-bold text-foreground mt-1">{selectedForm.employeeName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedForm.status === "distributed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {selectedForm.status === "distributed" ? "✓ Distributed" : "⏳ Pending Distribution"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportW2CSV(selectedForm)} className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  <Download className="w-4 h-4" /> Export
                </button>
                {selectedForm.status !== "distributed" && (
                  <button onClick={() => distributeForm(selectedForm.id)} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform">
                    <Send className="w-4 h-4" /> Distribute
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-foreground">{d.employerName}</p>
              <p className="text-muted-foreground">EIN: {d.employerEIN}</p>
              <p className="text-muted-foreground">{d.employerAddress}</p>
            </div>
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
            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold text-foreground mb-2">California Specifics</h4>
              <div className="grid grid-cols-2 gap-3">
                <W2Box box="SDI" label="CA State Disability Ins." value={formatCurrency(d.sdiWithheld)} />
                <W2Box box="19" label="Local Tax" value={formatCurrency(d.localTax)} />
              </div>
            </div>
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

  const yearForms = forms.filter(f => f.taxYear === selectedYear);
  const existingYears = [...new Set(forms.map(f => f.taxYear))].sort((a, b) => b - a);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Tax Forms & Filing</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate W-2s, file electronically, and remit payroll taxes.</p>
        </div>
        <button onClick={refreshForms} className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                subTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading...</div>
      ) : (
        <>
          {subTab === "w2-forms" && <W2FormsTab forms={forms} yearForms={yearForms} existingYears={existingYears} selectedYear={selectedYear} setSelectedYear={setSelectedYear} generating={generating} generateW2s={generateW2s} distributeAll={distributeAll} setSelectedForm={setSelectedForm} />}
          {subTab === "e-filing" && <EFilingTab forms={forms} filings={filings} selectedYear={selectedYear} setSelectedYear={setSelectedYear} submitFiling={submitFiling} markFilingStatus={markFilingStatus} />}
          {subTab === "remittance" && <RemittanceTab filings={filings} selectedYear={selectedYear} setSelectedYear={setSelectedYear} submitRemittance={submitRemittance} markFilingStatus={markFilingStatus} />}
        </>
      )}
    </div>
  );
};

// ---- W-2 Forms Sub-Tab ----
function W2FormsTab({ forms, yearForms, existingYears, selectedYear, setSelectedYear, generating, generateW2s, distributeAll, setSelectedForm }: any) {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Generate W-2 Forms</h3>
        <p className="text-xs text-muted-foreground">Select a tax year to generate W-2s from processed pay stubs.</p>
        <div className="flex items-center gap-3">
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => generateW2s(selectedYear)} disabled={generating} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generate W-2s
          </button>
          {yearForms.length > 0 && yearForms.some((f: any) => f.status !== "distributed") && (
            <button onClick={() => distributeAll(selectedYear)} className="flex items-center gap-2 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors">
              <Send className="w-4 h-4" /> Distribute All
            </button>
          )}
        </div>
        {yearForms.length > 0 && (
          <p className="text-xs text-muted-foreground">{yearForms.length} form(s) for {selectedYear} · {yearForms.filter((f: any) => f.status === "distributed").length} distributed</p>
        )}
      </div>

      {forms.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No tax forms generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">Select a year above and generate W-2 forms from pay stub data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {existingYears.map((year: number) => {
            const yForms = forms.filter((f: any) => f.taxYear === year);
            return (
              <div key={year} className="glass-card rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">Tax Year {year}</h3>
                  <span className="text-xs text-muted-foreground">{yForms.length} form(s) · {yForms.filter((f: any) => f.status === "distributed").length} distributed</span>
                </div>
                {yForms.map((form: any) => (
                  <button key={form.id} onClick={() => setSelectedForm(form)} className="w-full px-4 py-3 flex items-center justify-between border-t border-border text-left hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{form.employeeName}</p>
                        <p className="text-xs text-muted-foreground">W-2 · Generated {form.generatedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.status === "distributed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
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
}

// ---- E-Filing Sub-Tab ----
function EFilingTab({ forms, filings, selectedYear, setSelectedYear, submitFiling, markFilingStatus }: any) {
  const yearForms = forms.filter((f: any) => f.taxYear === selectedYear);
  const eFilings = filings.filter((f: TaxFiling) => f.filingType !== "remittance");

  return (
    <div className="space-y-4">
      {/* File Forms */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Electronic Filing</h3>
          <p className="text-xs text-muted-foreground mt-1">File required federal and state payroll tax forms electronically.</p>
        </div>

        <div className="flex items-center gap-3">
          <select value={selectedYear} onChange={(e: any) => setSelectedYear(Number(e.target.value))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {yearForms.length === 0 && (
          <div className="bg-warning/10 text-warning rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Generate W-2 forms first before filing.
          </div>
        )}

        {/* Federal Filing Section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-primary" /> Federal — IRS
          </h4>
          <div className="grid gap-2">
            {FILING_FORMS.filter(f => f.type === "federal").map(form => {
              const alreadyFiled = eFilings.some((ef: TaxFiling) => ef.formType === form.id && ef.taxYear === selectedYear);
              return (
                <div key={form.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{form.label}</p>
                    <p className="text-xs text-muted-foreground">Agency: {form.agency}</p>
                  </div>
                  {alreadyFiled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Filed</span>
                  ) : (
                    <button
                      onClick={() => submitFiling(form.id, form.agency, form.type, selectedYear, `Annual ${selectedYear}`)}
                      disabled={yearForms.length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
                    >
                      <Upload className="w-3 h-3" /> File Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* State Filing Section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-warning" /> State — California
          </h4>
          <div className="grid gap-2">
            {FILING_FORMS.filter(f => f.type === "state").map(form => {
              const alreadyFiled = eFilings.some((ef: TaxFiling) => ef.formType === form.id && ef.taxYear === selectedYear);
              return (
                <div key={form.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{form.label}</p>
                    <p className="text-xs text-muted-foreground">Agency: {form.agency}</p>
                  </div>
                  {alreadyFiled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Filed</span>
                  ) : (
                    <button
                      onClick={() => submitFiling(form.id, form.agency, form.type, selectedYear, `Annual ${selectedYear}`)}
                      disabled={yearForms.length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
                    >
                      <Upload className="w-3 h-3" /> File Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filing History */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-3">
          <h3 className="font-semibold text-foreground text-sm">Filing History & Confirmations</h3>
        </div>
        {eFilings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No filings recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {eFilings.map((filing: TaxFiling) => (
              <div key={filing.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    filing.status === "accepted" ? "bg-success/10" : filing.status === "rejected" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {filing.status === "accepted" ? <BadgeCheck className="w-4 h-4 text-success" /> :
                     filing.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" /> :
                     <FileCheck className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{filing.formType} — {filing.agency}</p>
                    <p className="text-xs text-muted-foreground">
                      {filing.periodLabel} · Filed {filing.filedAt.toLocaleDateString()}
                      {filing.confirmationNumber && <span className="ml-2 font-mono text-primary">#{filing.confirmationNumber}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FilingStatusBadge status={filing.status} />
                  {filing.status === "submitted" && (
                    <div className="flex gap-1">
                      <button onClick={() => markFilingStatus(filing.id, "accepted")} className="text-xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors">Accept</button>
                      <button onClick={() => markFilingStatus(filing.id, "rejected")} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Tax Remittance Sub-Tab ----
function RemittanceTab({ filings, selectedYear, setSelectedYear, submitRemittance, markFilingStatus }: any) {
  const [agency, setAgency] = useState("IRS");
  const [amount, setAmount] = useState("");
  const [periodLabel, setPeriodLabel] = useState(`Q1 ${selectedYear}`);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const remittances = filings.filter((f: TaxFiling) => f.filingType === "remittance");

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    await submitRemittance(agency, parsedAmount, selectedYear, periodLabel, notes);
    setAmount(""); setNotes("");
    setSubmitting(false);
  };

  const totalRemitted = remittances.reduce((s: number, r: TaxFiling) => s + r.amount, 0);
  const byAgency = AGENCIES.map(a => ({
    ...a,
    total: remittances.filter((r: TaxFiling) => r.agency === a.id).reduce((s: number, r: TaxFiling) => s + r.amount, 0),
    count: remittances.filter((r: TaxFiling) => r.agency === a.id).length,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {byAgency.map(a => (
          <div key={a.id} className="glass-card rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Building className={`w-4 h-4 ${a.type === "federal" ? "text-primary" : "text-warning"}`} />
              <span className="text-xs text-muted-foreground font-medium">{a.name}</span>
            </div>
            <p className="text-xl font-display font-bold text-foreground">{formatCurrency(a.total)}</p>
            <p className="text-xs text-muted-foreground">{a.count} payment(s)</p>
          </div>
        ))}
      </div>

      {/* Submit Remittance */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Submit Tax Remittance</h3>
          <p className="text-xs text-muted-foreground mt-1">Remit payroll taxes to the appropriate federal and state agencies on behalf of the employer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Agency</label>
            <select value={agency} onChange={e => setAgency(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
              {AGENCIES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tax Year</label>
            <select value={selectedYear} onChange={(e: any) => setSelectedYear(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
              {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Period</label>
            <input type="text" value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Q1 2025" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Quarterly 941 deposit" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting || !amount} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Submit Remittance
        </button>
      </div>

      {/* Remittance History */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Remittance History</h3>
          <span className="text-xs text-muted-foreground">Total: {formatCurrency(totalRemitted)}</span>
        </div>
        {remittances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No remittances submitted yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {remittances.map((r: TaxFiling) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatCurrency(r.amount)} → {r.agency}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.periodLabel} · {r.filedAt.toLocaleDateString()}
                      {r.confirmationNumber && <span className="ml-2 font-mono text-primary">#{r.confirmationNumber}</span>}
                      {r.notes && <span className="ml-2 italic">{r.notes}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FilingStatusBadge status={r.status} />
                  {r.status === "submitted" && (
                    <div className="flex gap-1">
                      <button onClick={() => markFilingStatus(r.id, "accepted")} className="text-xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors">Confirm</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Helper Components ----
function FilingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    submitted: "bg-primary/10 text-primary",
    accepted: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.pending}`}>{status}</span>;
}

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
