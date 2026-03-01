import { useApp } from "@/contexts/AppContext";
import { Employee } from "@/types";
import { useState } from "react";
import { User, Mail, Phone, DollarSign, Edit2, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/payroll";

const EmployeeProfiles = () => {
  const { employees, updateEmployee } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ ...emp });
  };

  const saveEdit = () => {
    if (editForm) {
      updateEmployee(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Team Members</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage employee profiles, pay rates, and tax information.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {employees.map(emp => {
          const isEditing = editingId === emp.id;
          const data = isEditing && editForm ? editForm : emp;

          return (
            <div key={emp.id} className="glass-card rounded-xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role} · Since {new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="p-1 text-success hover:bg-success/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Pay Rate
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.50"
                      value={editForm?.hourlyRate}
                      onChange={e => setEditForm(prev => prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-foreground">{formatCurrency(data.hourlyRate)}/hr</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Filing Status</label>
                  {isEditing ? (
                    <select
                      value={editForm?.filingStatus}
                      onChange={e => setEditForm(prev => prev ? { ...prev, filingStatus: e.target.value as Employee["filingStatus"] } : null)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="head_of_household">Head of Household</option>
                    </select>
                  ) : (
                    <p className="font-medium text-foreground capitalize">{data.filingStatus.replace("_", " ")}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <p className="text-foreground truncate">{data.email}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <p className="text-foreground">{data.phone}</p>
                </div>
              </div>

              {/* Tax Info */}
              <div className="border-t border-border pt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Federal Allowances: <span className="text-foreground font-medium">{data.federalAllowances}</span></span>
                <span>State Allowances: <span className="text-foreground font-medium">{data.stateAllowances}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeProfiles;
